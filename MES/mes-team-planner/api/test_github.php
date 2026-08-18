<?php
header('Content-Type: text/plain');
$token = 'YOUR_GITHUB_TOKEN'; // I need to get the user's token from the DB first

$dbPath = __DIR__ . '/../../page/db.php';
if (!file_exists($dbPath)) {
    $dbPath = __DIR__ . '/../../../MES/MES/page/db.php';
}
require_once $dbPath;
$stmt = $pdo->prepare("SELECT GithubUsername, GithubToken FROM TeamPlanner_UserSettings WHERE Username = 'verymaron01'");
$stmt->execute();
$settings = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$settings) {
    die("No settings found for verymaron01\n");
}

$login = $settings['GithubUsername'];
$token = $settings['GithubToken'];

echo "Login: $login\n";

$url = "https://api.github.com/users/{$login}/events?per_page=5";
echo "Fetching $url\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "User-Agent: MES-Team-Planner",
    "Authorization: Bearer $token"
]);
$output = curl_exec($ch);
curl_close($ch);

$events = json_decode($output, true);
echo "Events found: " . count($events) . "\n";

foreach ($events as $event) {
    if (($event['type'] ?? '') === 'PushEvent') {
        $repoName = $event['repo']['name'];
        echo "PushEvent on $repoName at {$event['created_at']}\n";
        echo "Payload: " . json_encode($event['payload']) . "\n";
        exit;
        $commits = $event['payload']['commits'] ?? [];
        foreach ($commits as $c) {
            $sha = $c['sha'] ?? '';
            echo "  Commit: $sha\n";
            $commitUrl = "https://api.github.com/repos/{$repoName}/commits/{$sha}";
            echo "  Fetching $commitUrl\n";
            
            $ch2 = curl_init();
            curl_setopt($ch2, CURLOPT_URL, $commitUrl);
            curl_setopt($ch2, CURLOPT_RETURNTRANSFER, 1);
            curl_setopt($ch2, CURLOPT_HTTPHEADER, [
                "User-Agent: MES-Team-Planner",
                "Authorization: Bearer $token"
            ]);
            $out2 = curl_exec($ch2);
            curl_close($ch2);
            $commitData = json_decode($out2, true);
            
            if (isset($commitData['stats'])) {
                echo "    Stats: +" . $commitData['stats']['additions'] . " -" . $commitData['stats']['deletions'] . "\n";
            } else {
                echo "    Stats: Not found\n";
                if (isset($commitData['message'])) {
                    echo "    Message: " . $commitData['message'] . "\n";
                }
            }
        }
    }
}
