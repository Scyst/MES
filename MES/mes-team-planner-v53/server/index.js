import express from 'express';
import cors from 'cors';
import { connectDB } from './db.js';

import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const PHP_BACKEND_URL = process.env.PHP_BACKEND_URL || 'http://localhost/MES';

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Helpers to extract dates nicely
const formatDate = (dateString) => {
  if (!dateString) return null;
  const d = new Date(dateString);
  return d.toISOString().split('T')[0];
};

const getNextDate = (currentDateStr, recurrence) => {
  if (!currentDateStr) return null;
  const d = new Date(currentDateStr);
  if (recurrence === 'daily') d.setDate(d.getDate() + 1);
  else if (recurrence === 'weekly') d.setDate(d.getDate() + 7);
  else if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
};

// Internal function to log activity
const logActivity = async (pool, message) => {
  try {
    const request = pool.request();
    request.input('Message', message);
    await request.query(`INSERT INTO TeamPlanner_Activities (Message) VALUES (@Message)`);
  } catch (e) {
    console.error('Failed to log activity', e);
  }
};

// --- AUTH MIDDLEWARE (PHP BRIDGE) ---
const verifyPHPAuth = async (req, res, next) => {
  try {
    const cookieHeader = req.headers.cookie;
    
    // For development/testing without PHP server, you can bypass by setting DEV_BYPASS_AUTH=true in .env
    if (process.env.DEV_BYPASS_AUTH === 'true') {
      req.user = { username: 'DevUser', fullname: 'Developer Mode', role: 'admin' };
      return next();
    }

    if (!cookieHeader) {
      return res.status(401).json({ error: 'Unauthorized: No cookies provided' });
    }

    const response = await fetch(`${PHP_BACKEND_URL}/auth/api_verify.php`, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(401).json({ error: 'Unauthorized: Invalid PHP Session' });
    }

    const data = await response.json();
    if (data.success && data.user) {
      req.user = data.user;
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized: Session invalid or expired' });
    }
  } catch (error) {
    console.error('Auth Bridge Error:', error);
    res.status(500).json({ error: 'Internal Server Error during Auth Verification' });
  }
};

// Apply auth middleware to all API routes
app.use('/api', verifyPHPAuth);

// --- TASKS API ---

app.get('/api/tasks', async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT * FROM TeamPlanner_Tasks ORDER BY CreatedAt DESC');
    const tasks = result.recordset.map(task => ({
      ...task,
      dueDate: formatDate(task.DueDate),
      startDate: formatDate(task.StartDate),
      startTime: task.StartTime,
      endTime: task.EndTime,
      priority: task.Priority || 'normal',
      description: task.Description || '',
      subtasks: task.Subtasks || '[]',
      tags: task.Tags || '',
      recurrence: task.Recurrence || 'none'
    }));
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { title, status, visibility, assignee, dueDate, startDate, startTime, endTime, priority, description, subtasks, tags, recurrence } = req.body;
    const pool = await connectDB();
    const request = pool.request();
    
    request.input('Title', title);
    request.input('Status', status || 'todo');
    request.input('Visibility', visibility || 'public');
    request.input('Assignee', assignee || 'Unassigned');
    request.input('DueDate', dueDate || null);
    request.input('StartDate', startDate || null);
    request.input('StartTime', startTime || '09:00');
    request.input('EndTime', endTime || '18:00');
    request.input('Priority', priority || 'normal');
    request.input('Description', description || null);
    request.input('Subtasks', subtasks || '[]');
    request.input('Tags', tags || '');
    request.input('Recurrence', recurrence || 'none');

    const result = await request.query(`
      INSERT INTO TeamPlanner_Tasks (Title, Status, Visibility, Assignee, DueDate, StartDate, StartTime, EndTime, Priority, Description, Subtasks, Tags, Recurrence)
      OUTPUT INSERTED.*
      VALUES (@Title, @Status, @Visibility, @Assignee, @DueDate, @StartDate, @StartTime, @EndTime, @Priority, @Description, @Subtasks, @Tags, @Recurrence)
    `);
    
    const newTask = result.recordset[0];
    newTask.dueDate = formatDate(newTask.DueDate);
    newTask.startDate = formatDate(newTask.StartDate);
    newTask.startTime = newTask.StartTime;
    newTask.endTime = newTask.EndTime;
    newTask.priority = newTask.Priority || 'normal';
    newTask.description = newTask.Description || '';
    newTask.subtasks = newTask.Subtasks || '[]';
    newTask.tags = newTask.Tags || '';
    newTask.recurrence = newTask.Recurrence || 'none';
    
    await logActivity(pool, `Task created: ${title} by ${assignee}`);
    
    res.status(201).json(newTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // status is for standard kanban updates. The rest are for Gantt editing.
    const { status, title, assignee, startDate, dueDate, startTime, endTime, visibility, priority, description, subtasks, tags, recurrence } = req.body;
    const pool = await connectDB();
    const request = pool.request();
    
    request.input('Id', id);
    
    let updateFields = [];
    if (status !== undefined) { updateFields.push("Status = @Status"); request.input('Status', status); }
    if (title !== undefined) { updateFields.push("Title = @Title"); request.input('Title', title); }
    if (assignee !== undefined) { updateFields.push("Assignee = @Assignee"); request.input('Assignee', assignee); }
    if (startDate !== undefined) { updateFields.push("StartDate = @StartDate"); request.input('StartDate', startDate || null); }
    if (dueDate !== undefined) { updateFields.push("DueDate = @DueDate"); request.input('DueDate', dueDate || null); }
    if (startTime !== undefined) { updateFields.push("StartTime = @StartTime"); request.input('StartTime', startTime); }
    if (endTime !== undefined) { updateFields.push("EndTime = @EndTime"); request.input('EndTime', endTime); }
    if (visibility !== undefined) { updateFields.push("Visibility = @Visibility"); request.input('Visibility', visibility); }
    if (priority !== undefined) { updateFields.push("Priority = @Priority"); request.input('Priority', priority); }
    if (description !== undefined) { updateFields.push("Description = @Description"); request.input('Description', description || null); }
    if (subtasks !== undefined) { updateFields.push("Subtasks = @Subtasks"); request.input('Subtasks', subtasks || '[]'); }
    if (tags !== undefined) { updateFields.push("Tags = @Tags"); request.input('Tags', tags || ''); }
    if (recurrence !== undefined) { updateFields.push("Recurrence = @Recurrence"); request.input('Recurrence', recurrence || 'none'); }

    if (updateFields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const result = await request.query(`
      UPDATE TeamPlanner_Tasks
      SET ${updateFields.join(', ')}
      OUTPUT INSERTED.*
      WHERE Id = @Id
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const updatedTask = result.recordset[0];
    updatedTask.dueDate = formatDate(updatedTask.DueDate);
    updatedTask.startDate = formatDate(updatedTask.StartDate);
    updatedTask.startTime = updatedTask.StartTime;
    updatedTask.endTime = updatedTask.EndTime;
    updatedTask.priority = updatedTask.Priority || 'normal';
    updatedTask.description = updatedTask.Description || '';
    updatedTask.subtasks = updatedTask.Subtasks || '[]';
    updatedTask.tags = updatedTask.Tags || '';
    updatedTask.recurrence = updatedTask.Recurrence || 'none';
    
    await logActivity(pool, `Task moved to ${status || 'updated'}: ${updatedTask.Title}`);

    // Auto-spawn logic for recurring tasks when completed
    if (status === 'done' && updatedTask.recurrence && updatedTask.recurrence !== 'none') {
      const nextDue = getNextDate(updatedTask.dueDate || new Date(), updatedTask.recurrence);
      const nextStart = getNextDate(updatedTask.startDate, updatedTask.recurrence);
      
      const spawnReq = pool.request();
      spawnReq.input('Title', updatedTask.Title);
      spawnReq.input('Status', 'todo');
      spawnReq.input('Visibility', updatedTask.Visibility);
      spawnReq.input('Assignee', updatedTask.Assignee);
      spawnReq.input('DueDate', nextDue);
      spawnReq.input('StartDate', nextStart);
      spawnReq.input('StartTime', updatedTask.StartTime);
      spawnReq.input('EndTime', updatedTask.EndTime);
      spawnReq.input('Priority', updatedTask.Priority);
      spawnReq.input('Description', updatedTask.Description);
      spawnReq.input('Subtasks', updatedTask.Subtasks); // Copy subtasks (though completed, we might want to uncheck them, but let's just copy them as is for simplicity, or we can reset them. Better to reset completion status)
      
      // Reset subtask completion status
      let resetSubtasks = '[]';
      try {
        const parsed = JSON.parse(updatedTask.Subtasks || '[]');
        const resetParsed = parsed.map(st => ({ ...st, completed: false }));
        resetSubtasks = JSON.stringify(resetParsed);
      } catch (e) {}
      
      spawnReq.input('ResetSubtasks', resetSubtasks);
      spawnReq.input('Tags', updatedTask.Tags);
      spawnReq.input('Recurrence', updatedTask.Recurrence);

      await spawnReq.query(`
        INSERT INTO TeamPlanner_Tasks (Title, Status, Visibility, Assignee, DueDate, StartDate, StartTime, EndTime, Priority, Description, Subtasks, Tags, Recurrence)
        VALUES (@Title, @Status, @Visibility, @Assignee, @DueDate, @StartDate, @StartTime, @EndTime, @Priority, @Description, @ResetSubtasks, @Tags, @Recurrence)
      `);
      await logActivity(pool, `Auto-spawned recurring task: ${updatedTask.Title} for ${nextDue}`);
    }

    res.json(updatedTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await connectDB();
    const request = pool.request();
    
    request.input('Id', id);
    await request.query('DELETE FROM TeamPlanner_Tasks WHERE Id = @Id');
    await logActivity(pool, `Task deleted (ID: ${id})`);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// --- COMMENTS API ---

app.get('/api/tasks/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await connectDB();
    const result = await pool.request()
      .input('TaskId', id)
      .query('SELECT * FROM TeamPlanner_Comments WHERE TaskId = @TaskId ORDER BY CreatedAt ASC');
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.post('/api/tasks/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { author, message } = req.body;
    const pool = await connectDB();
    const result = await pool.request()
      .input('TaskId', id)
      .input('Author', author || 'User')
      .input('Message', message)
      .query(`
        INSERT INTO TeamPlanner_Comments (TaskId, Author, Message)
        OUTPUT INSERTED.*
        VALUES (@TaskId, @Author, @Message)
      `);
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// --- EVENTS API ---

app.get('/api/events', async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT * FROM TeamPlanner_Events ORDER BY Date ASC');
    const events = result.recordset.map(event => ({
      ...event,
      date: formatDate(event.Date)
    }));
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const { title, date, type, assignee } = req.body;
    const pool = await connectDB();
    const request = pool.request();
    
    request.input('Title', title);
    request.input('Date', date);
    request.input('Type', type || 'meeting');
    request.input('Assignee', assignee || null);

    const result = await request.query(`
      INSERT INTO TeamPlanner_Events (Title, Date, Type, Assignee)
      OUTPUT INSERTED.*
      VALUES (@Title, @Date, @Type, @Assignee)
    `);
    
    const newEvent = result.recordset[0];
    newEvent.date = formatDate(newEvent.Date);
    
    let msg = `Event created: ${title}`;
    if (type === 'leave') msg = `${assignee} is taking a leave on ${date}`;
    await logActivity(pool, msg);

    res.status(201).json(newEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await connectDB();
    const request = pool.request();
    
    request.input('Id', id);
    await request.query('DELETE FROM TeamPlanner_Events WHERE Id = @Id');
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// --- LINKS API ---

app.get('/api/links', async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT * FROM TeamPlanner_Links ORDER BY CreatedAt DESC');
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.post('/api/links', async (req, res) => {
  try {
    const { title, url, category, createdBy } = req.body;
    const pool = await connectDB();
    const request = pool.request();
    
    request.input('Title', title);
    request.input('Url', url);
    request.input('Category', category || 'General');
    request.input('CreatedBy', createdBy || 'User');

    const result = await request.query(`
      INSERT INTO TeamPlanner_Links (Title, Url, Category, CreatedBy)
      OUTPUT INSERTED.*
      VALUES (@Title, @Url, @Category, @CreatedBy)
    `);
    
    await logActivity(pool, `New link added: ${title} in ${category}`);
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.delete('/api/links/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await connectDB();
    const request = pool.request();
    
    request.input('Id', id);
    await request.query('DELETE FROM TeamPlanner_Links WHERE Id = @Id');
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// --- ACTIVITIES API ---

app.get('/api/activities', async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query('SELECT TOP 50 * FROM TeamPlanner_Activities ORDER BY CreatedAt DESC');
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
