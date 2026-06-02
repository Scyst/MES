import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import sql from 'mssql';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    // Default to today if no date provided
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    
    // Set start and end of the day for filtering
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const pool = await getDbConnection();
    const result = await pool.request()
      .input('startOfDay', startOfDay)
      .input('endOfDay', endOfDay)
      .query(`
        SELECT Id, Title, Description, StartTime, EndTime, CreatedAt 
        FROM WorkTasks 
        WHERE StartTime >= @startOfDay AND StartTime <= @endOfDay
        ORDER BY StartTime ASC
      `);

    return NextResponse.json({ tasks: result.recordset });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks', details: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, startTime, endTime } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const pool = await getDbConnection();
    const result = await pool.request()
      .input('title', sql.NVarChar(255), title)
      .input('description', sql.NVarChar(sql.MAX), description || '')
      .input('startTime', sql.DateTime2, new Date(startTime))
      .input('endTime', sql.DateTime2, new Date(endTime))
      .query(`
        INSERT INTO WorkTasks (Title, Description, StartTime, EndTime)
        OUTPUT INSERTED.Id, INSERTED.Title, INSERTED.Description, INSERTED.StartTime, INSERTED.EndTime, INSERTED.CreatedAt
        VALUES (@title, @description, @startTime, @endTime)
      `);

    return NextResponse.json({ task: result.recordset[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task', details: error?.message || String(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, title, description, startTime, endTime } = body;

    if (!id || !title || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const pool = await getDbConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('title', sql.NVarChar(255), title)
      .input('description', sql.NVarChar(sql.MAX), description || '')
      .input('startTime', sql.DateTime2, new Date(startTime))
      .input('endTime', sql.DateTime2, new Date(endTime))
      .query(`
        UPDATE WorkTasks 
        SET Title = @title, Description = @description, StartTime = @startTime, EndTime = @endTime
        OUTPUT INSERTED.Id, INSERTED.Title, INSERTED.Description, INSERTED.StartTime, INSERTED.EndTime, INSERTED.CreatedAt
        WHERE Id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task: result.recordset[0] }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task', details: error?.message || String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing task ID' }, { status: 400 });
    }

    const pool = await getDbConnection();
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        DELETE FROM WorkTasks 
        WHERE Id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task', details: error?.message || String(error) }, { status: 500 });
  }
}
