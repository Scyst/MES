import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const config = {
  user: process.env.DB_USER || 'TOOLBOX',
  password: process.env.DB_PASSWORD || 'I1o1@T@#1boX',
  server: process.env.DB_SERVER || '10.1.1.31',
  database: process.env.DB_DATABASE_NAME || 'IIOT_TOOLBOX',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  }
};

let pool;

export const connectDB = async () => {
  if (pool) return pool;
  try {
    pool = await sql.connect(config);
    console.log('Connected to MSSQL Database');
    
    // Initialize tables if they don't exist
    await initializeTables(pool);
    
    return pool;
  } catch (err) {
    console.error('Database Connection Failed! Bad Config: ', err);
    throw err;
  }
};

const initializeTables = async (pool) => {
  try {
    const request = pool.request();
    
    // Create Tasks Table
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TeamPlanner_Tasks' and xtype='U')
      CREATE TABLE TeamPlanner_Tasks (
        Id INT PRIMARY KEY IDENTITY(1,1),
        Title NVARCHAR(255) NOT NULL,
        Status NVARCHAR(50) NOT NULL,
        Visibility NVARCHAR(50) NOT NULL,
        Assignee NVARCHAR(100) NOT NULL,
        DueDate DATE,
        CreatedAt DATETIME DEFAULT GETDATE()
      )
    `);

    // Alter Tasks Table for StartDate
    await request.query(`
      IF COL_LENGTH('TeamPlanner_Tasks', 'StartDate') IS NULL
      BEGIN
        ALTER TABLE TeamPlanner_Tasks ADD StartDate DATE
      END
    `);

    // Alter Tasks Table for Time (24h Gantt)
    await request.query(`
      IF COL_LENGTH('TeamPlanner_Tasks', 'StartTime') IS NULL
      BEGIN
        ALTER TABLE TeamPlanner_Tasks ADD StartTime NVARCHAR(5) DEFAULT '09:00'
        ALTER TABLE TeamPlanner_Tasks ADD EndTime NVARCHAR(5) DEFAULT '18:00'
      END
    `);

    // Alter Tasks Table for Priority
    await request.query(`
      IF COL_LENGTH('TeamPlanner_Tasks', 'Priority') IS NULL
      BEGIN
        ALTER TABLE TeamPlanner_Tasks ADD Priority NVARCHAR(20) DEFAULT 'normal'
      END
    `);

    // Alter Tasks Table for Description
    await request.query(`
      IF COL_LENGTH('TeamPlanner_Tasks', 'Description') IS NULL
      BEGIN
        ALTER TABLE TeamPlanner_Tasks ADD Description NVARCHAR(MAX)
      END
    `);

    // Alter Tasks Table for Subtasks
    await request.query(`
      IF COL_LENGTH('TeamPlanner_Tasks', 'Subtasks') IS NULL
      BEGIN
        ALTER TABLE TeamPlanner_Tasks ADD Subtasks NVARCHAR(MAX)
      END
    `);

    // Alter Tasks Table for Tags
    await request.query(`
      IF COL_LENGTH('TeamPlanner_Tasks', 'Tags') IS NULL
      BEGIN
        ALTER TABLE TeamPlanner_Tasks ADD Tags NVARCHAR(255)
      END
    `);

    // Alter Tasks Table for Recurrence
    await request.query(`
      IF COL_LENGTH('TeamPlanner_Tasks', 'Recurrence') IS NULL
      BEGIN
        ALTER TABLE TeamPlanner_Tasks ADD Recurrence NVARCHAR(50) DEFAULT 'none'
      END
    `);

    // Create Events Table
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TeamPlanner_Events' and xtype='U')
      CREATE TABLE TeamPlanner_Events (
        Id INT PRIMARY KEY IDENTITY(1,1),
        Title NVARCHAR(255) NOT NULL,
        Date DATE NOT NULL,
        Type NVARCHAR(50) NOT NULL,
        CreatedAt DATETIME DEFAULT GETDATE()
      )
    `);

    // Alter Events Table for Assignee
    await request.query(`
      IF COL_LENGTH('TeamPlanner_Events', 'Assignee') IS NULL
      BEGIN
        ALTER TABLE TeamPlanner_Events ADD Assignee NVARCHAR(100)
      END
    `);

    // Create Links Table
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TeamPlanner_Links' and xtype='U')
      CREATE TABLE TeamPlanner_Links (
        Id INT PRIMARY KEY IDENTITY(1,1),
        Title NVARCHAR(255) NOT NULL,
        Url NVARCHAR(MAX) NOT NULL,
        Category NVARCHAR(100) NOT NULL,
        CreatedBy NVARCHAR(100) NOT NULL,
        CreatedAt DATETIME DEFAULT GETDATE()
      )
    `);

    // Create Activities Table
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TeamPlanner_Activities' and xtype='U')
      CREATE TABLE TeamPlanner_Activities (
        Id INT PRIMARY KEY IDENTITY(1,1),
        Message NVARCHAR(MAX) NOT NULL,
        CreatedAt DATETIME DEFAULT GETDATE()
      )
    `);

    // Create Comments Table
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TeamPlanner_Comments' and xtype='U')
      CREATE TABLE TeamPlanner_Comments (
        Id INT PRIMARY KEY IDENTITY(1,1),
        TaskId INT NOT NULL,
        Author NVARCHAR(100) NOT NULL,
        Message NVARCHAR(MAX) NOT NULL,
        CreatedAt DATETIME DEFAULT GETDATE()
      )
    `);
    
    console.log('Tables verified/initialized with new schema.');
  } catch (error) {
    console.error('Error initializing tables:', error);
  }
};
