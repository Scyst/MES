-- SQL Server Setup Script for Work Tracker
-- Run this script in your SSMS to create the necessary table

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WorkTasks' and xtype='U')
BEGIN
    CREATE TABLE WorkTasks (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Title NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        StartTime DATETIME2 NOT NULL,
        EndTime DATETIME2 NOT NULL,
        CreatedAt DATETIME2 DEFAULT GETDATE()
    );
END
GO
