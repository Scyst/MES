<?php
require_once 'db_helper.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    $currentUsername = $_SESSION['user']['username'] ?? '';
    if (!$currentUsername) {
        sendJson(['error' => 'Unauthorized'], 401);
    }

    if ($method === 'GET') {
        $targetUser = $_GET['user'] ?? $currentUsername;
        $type = $_GET['type'] ?? 'basic'; // 'basic' or 'loc'

        // Fetch target user's github settings
        $stmt = $pdo->prepare("SELECT GithubUsername, GithubToken FROM TeamPlanner_UserSettings WHERE Username = ?");
        $stmt->execute([$targetUser]);
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);

        $login = $settings['GithubUsername'] ?? null;
        $token = $settings['GithubToken'] ?? null;

        if (!$login) {
            sendJson(['configured' => false]);
            exit;
        }

        // cURL single request
        function fetchGithubAPI($url, $token, $isPost = false, $postData = []) {
            $ch = curl_init();
            $acceptHeader = (strpos($url, '/search/commits') !== false) 
                ? 'Accept: application/vnd.github.cloak-preview+json' 
                : 'Accept: application/vnd.github.v3+json';
            
            $headers = [
                'User-Agent: MES-Team-Planner',
                $acceptHeader
            ];
            if ($token) {
                $headers[] = "Authorization: Bearer $token";
            }
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            if ($isPost) {
                curl_setopt($ch, CURLOPT_POST, 1);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
            }
            $output = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($httpCode >= 400 && $httpCode !== 404) {
                error_log("GitHub API Error ($url): " . $output);
            }
            return json_decode($output, true);
        }

        // cURL multi (concurrent) requests
        function fetchGithubMultiAPI($urls, $token) {
            if (empty($urls)) return [];
            $mh = curl_multi_init();
            $ch_list = [];
            foreach ($urls as $i => $url) {
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $url);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    "User-Agent: MES-Team-Planner",
                    "Accept: application/json",
                    "Authorization: Bearer $token"
                ]);
                curl_multi_add_handle($mh, $ch);
                $ch_list[$i] = $ch;
            }
            $running = null;
            do {
                curl_multi_exec($mh, $running);
                curl_multi_select($mh);
            } while ($running > 0);
            $results = [];
            foreach ($ch_list as $i => $ch) {
                $results[$i] = json_decode(curl_multi_getcontent($ch), true);
                curl_multi_remove_handle($mh, $ch);
            }
            curl_multi_close($mh);
            return $results;
        }

        $tz = new DateTimeZone('Asia/Bangkok');
        $todayStart = (new DateTime('today', $tz))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
        $todayEnd   = (new DateTime('tomorrow', $tz))->modify('-1 second')->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
        $weekStart  = (new DateTime('monday this week', $tz))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
        $monthStart = (new DateTime('first day of this month', $tz))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
        $yearStart  = (new DateTime('first day of january this year', $tz))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');

        // Cache key includes today's date so it invalidates at midnight (not just 15-min TTL)
        $todayDate  = (new DateTime('today', $tz))->format('Y-m-d');
        $cacheFile = sys_get_temp_dir() . '/planner_github_' . md5($login . '_' . $type . '_' . $todayDate) . '.json';
        $cacheTTL = 900; // 15 minutes within same day

        if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTTL) {
            $cachedData = json_decode(file_get_contents($cacheFile), true);
            if ($cachedData) {
                sendJson($cachedData);
                exit;
            }
        }

        // =====================================================
        // LOC-only mode: used by the second (lazy) frontend fetch
        // =====================================================
        if ($type === 'loc') {
            if (!$token) {
                sendJson(['locToday' => ['add'=>0,'del'=>0], 'locWeek' => ['add'=>0,'del'=>0], 'locMonth' => ['add'=>0,'del'=>0], 'locYear' => ['add'=>0,'del'=>0]]);
                exit;
            }

            $eventsData = fetchGithubAPI("https://api.github.com/users/{$login}/events?per_page=100", $token);
            
            $compareUrls = [];
            $urlMap      = [];

            if (is_array($eventsData)) {
                foreach ($eventsData as $event) {
                    if (($event['type'] ?? '') !== 'PushEvent') continue;
                    $sha       = $event['payload']['head']   ?? '';
                    $before    = $event['payload']['before'] ?? '';
                    $repoName  = $event['repo']['name']      ?? '';
                    $createdAt = $event['created_at']        ?? '';

                    if ($sha && $before && $before !== '0000000000000000000000000000000000000000' && $createdAt >= $yearStart) {
                        $cUrl = "https://api.github.com/repos/{$repoName}/compare/{$before}...{$sha}";
                        if (!isset($urlMap[$cUrl])) {
                            $urlMap[$cUrl] = ['today' => false, 'week' => false, 'month' => false, 'year' => true];
                            $compareUrls[] = $cUrl;
                        }
                        if ($createdAt >= $todayStart) $urlMap[$cUrl]['today'] = true;
                        if ($createdAt >= $weekStart)  $urlMap[$cUrl]['week']  = true;
                        if ($createdAt >= $monthStart) $urlMap[$cUrl]['month'] = true;
                    }
                }
            }

            // Limit to 25 to avoid overloading GitHub API
            $locStats = ['today'=>['add'=>0,'del'=>0],'week'=>['add'=>0,'del'=>0],'month'=>['add'=>0,'del'=>0],'year'=>['add'=>0,'del'=>0]];
            $compareUrls = array_slice($compareUrls, 0, 25);
            $compareResults = fetchGithubMultiAPI($compareUrls, $token);

            foreach ($compareUrls as $i => $cUrl) {
                $res = $compareResults[$i] ?? null;
                if (isset($res['files'])) {
                    $add = array_sum(array_column($res['files'], 'additions'));
                    $del = array_sum(array_column($res['files'], 'deletions'));
                    if ($urlMap[$cUrl]['today']) { $locStats['today']['add'] += $add; $locStats['today']['del'] += $del; }
                    if ($urlMap[$cUrl]['week'])  { $locStats['week']['add']  += $add; $locStats['week']['del']  += $del; }
                    if ($urlMap[$cUrl]['month']) { $locStats['month']['add'] += $add; $locStats['month']['del'] += $del; }
                    if ($urlMap[$cUrl]['year'])  { $locStats['year']['add']  += $add; $locStats['year']['del']  += $del; }
                }
            }

            // Cache key already includes date
            $responseData = [
                'locToday' => $locStats['today'],
                'locWeek'  => $locStats['week'],
                'locMonth' => $locStats['month'],
                'locYear'  => $locStats['year'],
                '_debugInfo' => [
                    'note' => 'GitHub API returns max 100 events. If all 100 events happen today, Today/Week/Month/Year will be identical.',
                    'eventsFetched' => count((array)$eventsData),
                    'compareCalls' => count($compareUrls)
                ]
            ];
            file_put_contents($cacheFile, json_encode($responseData));
            sendJson($responseData);
            exit;
        }

        // =====================================================
        // BASIC mode: GraphQL (commit counts + calendar) + Events list (no per-commit details)
        // Fast: ~1-2 API calls total
        // =====================================================
        $calendar = null;
        $stats = ['commitsToday' => 0, 'commitsWeek' => 0, 'commitsMonth' => 0, 'commitsYear' => 0];

        if ($token) {
            $graphQuery = '
            query {
                user(login: "' . $login . '") {
                    today: contributionsCollection(from: "' . $todayStart . '", to: "' . $todayEnd . '") {
                        totalCommitContributions
                    }
                    thisWeek: contributionsCollection(from: "' . $weekStart . '", to: "' . $todayEnd . '") {
                        totalCommitContributions
                    }
                    thisMonth: contributionsCollection(from: "' . $monthStart . '", to: "' . $todayEnd . '") {
                        totalCommitContributions
                    }
                    thisYear: contributionsCollection(from: "' . $yearStart . '", to: "' . $todayEnd . '") {
                        totalCommitContributions
                    }
                    calendar: contributionsCollection {
                        contributionCalendar {
                            totalContributions
                            weeks {
                                contributionDays {
                                    contributionCount
                                    date
                                }
                            }
                        }
                    }
                }
            }';

            $graphData = fetchGithubAPI('https://api.github.com/graphql', $token, true, ['query' => $graphQuery]);

            if (isset($graphData['errors']) && $graphData['data']['user'] === null) {
                // The github username does not exist
                sendJson(['configured' => false]);
                exit;
            }

            if (isset($graphData['data']['user']) && $graphData['data']['user'] !== null) {
                $u = $graphData['data']['user'];
                $stats['commitsToday'] = $u['today']['totalCommitContributions'] ?? 0;
                $stats['commitsWeek']  = $u['thisWeek']['totalCommitContributions'] ?? 0;
                $stats['commitsMonth'] = $u['thisMonth']['totalCommitContributions'] ?? 0;
                $stats['commitsYear']  = $u['thisYear']['totalCommitContributions'] ?? 0;
                $calendar = $u['calendar']['contributionCalendar'] ?? null;
            }
        }

        // Fetch events list — NO per-commit details here (fast)
        $repos     = [];
        $commitLog = [];
        $eventsData = fetchGithubAPI("https://api.github.com/users/{$login}/events?per_page=30", $token);

        if (is_array($eventsData) && !isset($eventsData['message'])) {
            foreach ($eventsData as $event) {
                if (($event['type'] ?? '') !== 'PushEvent') continue;
                $repoName  = $event['repo']['name'] ?? 'Unknown Repo';
                $repos[$repoName] = true;
                $sha = $event['payload']['head'] ?? '';

                if ($sha && count($commitLog) < 15) {
                    $commits = $event['payload']['commits'] ?? [];
                    foreach (array_reverse($commits) as $c) {
                        if (count($commitLog) >= 15) break;
                        $commitLog[] = [
                            'time'      => $event['created_at'],
                            'message'   => $c['message'] ?? '',
                            'repo'      => $repoName,
                            'url'       => "https://github.com/{$repoName}/commit/" . ($c['sha'] ?? ''),
                            'additions' => null,
                            'deletions' => null,
                        ];
                    }
                }
            }
        }

        // Fallback to Search API if events returned empty (e.g., private repos hidden from this token)
        if (empty($commitLog)) {
            $searchData = fetchGithubAPI("https://api.github.com/search/commits?q=author:{$login}&sort=author-date&order=desc&per_page=15", $token);
            if (isset($searchData['items']) && is_array($searchData['items'])) {
                foreach ($searchData['items'] as $item) {
                    $repoName = $item['repository']['full_name'] ?? 'Unknown Repo';
                    $repos[$repoName] = true;
                    $commitLog[] = [
                        'time'      => $item['commit']['author']['date'] ?? '',
                        'message'   => $item['commit']['message'] ?? '',
                        'repo'      => $repoName,
                        'url'       => $item['html_url'] ?? '',
                        'additions' => null,
                        'deletions' => null,
                    ];
                }
            }
        }

        $responseData = [
            'totalContributions' => $calendar['totalContributions'] ?? 0,
            'weeks'              => $calendar['weeks'] ?? [],
            'stats'              => [
                'commitsToday'  => $stats['commitsToday'],
                'commitsWeek'   => $stats['commitsWeek'],
                'commitsMonth'  => $stats['commitsMonth'],
                'commitsYear'   => $stats['commitsYear'],
                'locToday'      => null, // loaded lazily
                'locWeek'       => null,
                'locMonth'      => null,
                'locYear'       => null,
                'repositories'  => array_keys($repos),
                'commitLog'     => $commitLog,
            ]
        ];
        file_put_contents($cacheFile, json_encode($responseData));
        sendJson($responseData);

    } else {
        sendJson(['error' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    sendJson(['error' => $e->getMessage()], 500);
}
?>
