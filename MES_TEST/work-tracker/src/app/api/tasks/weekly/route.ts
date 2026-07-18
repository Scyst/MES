import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import sql from 'mssql';

function getWeekBoundaries(dateStr: string) {
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  
  // Get Monday of the current week
  const day = targetDate.getDay();
  const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  
  const monday = new Date(targetDate.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return { monday, sunday };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const { monday, sunday } = getWeekBoundaries(dateParam || '');

    const pool = await getDbConnection();
    const result = await pool.request()
      .input('startOfWeek', monday)
      .input('endOfWeek', sunday)
      .query(`
        SELECT Id, Title, Description, StartTime, EndTime, CreatedAt 
        FROM WorkTasks 
        WHERE StartTime >= @startOfWeek AND StartTime <= @endOfWeek
        ORDER BY StartTime ASC
      `);

    const tasks = result.recordset;
    
    // Aggregate total hours
    let totalHours = 0;
    tasks.forEach(task => {
      const start = new Date(task.StartTime).getTime();
      const end = new Date(task.EndTime).getTime();
      const durationHours = (end - start) / (1000 * 60 * 60);
      if (durationHours > 0) {
        totalHours += durationHours;
      }
    });

    return NextResponse.json({ 
      tasks, 
      totalHours: Number(totalHours.toFixed(2)),
      weekStart: monday.toISOString().split('T')[0],
      weekEnd: sunday.toISOString().split('T')[0]
    });
  } catch (error: any) {
    console.error('Error fetching weekly tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch weekly tasks', details: error?.message || String(error) }, { status: 500 });
  }
}
