import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

function getWeekBoundaries(dateStr: string) {
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const day = targetDate.getDay();
  const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1);
  
  const monday = new Date(targetDate.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return { 
    mondayStr: monday.toISOString().split('T')[0], 
    sundayStr: sunday.toISOString().split('T')[0] 
  };
}

export async function GET(request: Request) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const { mondayStr, sundayStr } = getWeekBoundaries(dateParam || '');

    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });
    const userData = await userRes.json();
    const login = userData.login;

    let additions = 0;
    let deletions = 0;
    let repos = new Set<string>();
    let totalCommitsWeek = 0;

    try {
      const searchRes = await fetch(`https://api.github.com/search/commits?q=author:${login}+committer-date:${mondayStr}..${sundayStr}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: 'application/vnd.github.cloak-preview+json'
        }
      });
      
      const searchData = await searchRes.json();
      if (searchData.items) {
        totalCommitsWeek = searchData.total_count || searchData.items.length;
        
        // Fetch details for up to 30 commits to avoid extreme delays
        const commitsToFetch = searchData.items.slice(0, 30);
        
        const commitDetailsPromises = commitsToFetch.map((item: any) => 
          fetch(item.url, { headers: { Authorization: `Bearer ${session.accessToken}` } }).then(res => res.json())
        );
        
        const commitsDetails = await Promise.all(commitDetailsPromises);
        
        commitsDetails.forEach((detail: any, index: number) => {
          if (detail.stats) {
            additions += detail.stats.additions || 0;
            deletions += detail.stats.deletions || 0;
          }
          if (commitsToFetch[index].repository) {
            repos.add(commitsToFetch[index].repository.full_name);
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch commit details for weekly LOC:', err);
    }

    return NextResponse.json({
      weekStart: mondayStr,
      weekEnd: sundayStr,
      commits: totalCommitsWeek,
      additions,
      deletions,
      repositories: Array.from(repos),
      isPartialLoc: totalCommitsWeek > 30
    });
  } catch (error) {
    console.error('Error fetching weekly GitHub stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
