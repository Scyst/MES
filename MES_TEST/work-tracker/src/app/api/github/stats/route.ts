import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    // 1. Get Viewer Login
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });
    const userData = await userRes.json();
    const login = userData.login;

    // 2. Query Contributions Collection for the week graph
    const graphQuery = `
      query {
        viewer {
          contributionsCollection {
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
      }
    `;
    const graphRes = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: graphQuery }),
    });
    const graphData = await graphRes.json();
    const calendar = graphData.data?.viewer?.contributionsCollection?.contributionCalendar;

    // 3. Search Commits for the specific date to calculate LOC
    let additions = 0;
    let deletions = 0;
    let repos = new Set<string>();
    let totalCommitsToday = 0;
    let commitLog: any[] = [];

    try {
      const searchRes = await fetch(`https://api.github.com/search/commits?q=author:${login}+committer-date:${dateStr}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: 'application/vnd.github.cloak-preview+json'
        }
      });
      
      const searchData = await searchRes.json();
      if (searchData.items) {
        totalCommitsToday = searchData.total_count || searchData.items.length;
        
        // Fetch details for up to 10 commits to avoid rate limits
        const commitsToFetch = searchData.items.slice(0, 10);
        
        const commitDetailsPromises = commitsToFetch.map((item: any) => 
          fetch(item.url, { headers: { Authorization: `Bearer ${session.accessToken}` } }).then(res => res.json())
        );
        
        const commitsDetails = await Promise.all(commitDetailsPromises);
        
        commitsDetails.forEach((detail: any, index: number) => {
          if (detail.stats) {
            additions += detail.stats.additions || 0;
            deletions += detail.stats.deletions || 0;
          }
          
          const repoName = commitsToFetch[index].repository?.full_name || 'Unknown Repo';
          repos.add(repoName);
          
          // Store commit log for frontend
          commitLog.push({
            time: commitsToFetch[index].commit.committer.date,
            message: commitsToFetch[index].commit.message,
            repo: repoName,
            url: commitsToFetch[index].html_url
          });
        });
      }
    } catch (err) {
      console.error('Failed to fetch commit details for LOC:', err);
    }

    return NextResponse.json({
      totalContributions: calendar?.totalContributions || 0,
      weeks: calendar?.weeks || [],
      dailyStats: {
        date: dateStr,
        commits: totalCommitsToday,
        additions,
        deletions,
        repositories: Array.from(repos),
        isPartialLoc: totalCommitsToday > 10,
        commitLog // Indicate if we capped the LOC calculation
      }
    });
  } catch (error) {
    console.error('Error fetching GitHub stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
