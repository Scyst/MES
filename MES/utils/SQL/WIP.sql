IF OBJECT_ID('dbo.WIP_ENTRIES', 'U') IS NULL
BEGIN
    PRINT 'Creating WIP_ENTRIES table...';
    CREATE TABLE [dbo].[WIP_ENTRIES](
        [entry_id] [int] IDENTITY(1,1) NOT NULL,
        [entry_time] [datetime] NOT NULL,
        [line] [varchar](50) NOT NULL,
        [lot_no] [nvarchar](100) NULL,
        [part_no] [varchar](50) NOT NULL,
        [quantity_in] [int] NOT NULL,
        [operator] [varchar](100) NOT NULL,
        [remark] [nvarchar](255) NULL,
        CONSTRAINT [PK_WIP_ENTRIES] PRIMARY KEY CLUSTERED ([entry_id] ASC)
    );
    -- ตั้งค่าให้ใส่วันที่และเวลาปัจจุบันให้อัตโนมัติ
    ALTER TABLE [dbo].[WIP_ENTRIES] ADD CONSTRAINT [DF_WIP_entry_time] DEFAULT (getdate()) FOR [entry_time];
    PRINT 'Table WIP_ENTRIES created successfully.';
END
ELSE
BEGIN
    PRINT 'Table WIP_ENTRIES already exists. Skipping creation.';
END
GO