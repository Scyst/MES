const sql = require('mssql');

const config = {
    user: 'TOOLBOX',
    password: 'I1o1@T@#1boX',
    server: '10.1.1.31',
    database: 'IIOT_TOOLBOX',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function run() {
    try {
        await sql.connect(config);
        await sql.query`ALTER TABLE dbo.STORE_REQUISITION_ITEMS ADD requested_tags NVARCHAR(MAX) NULL;`;
        
        await sql.query`
ALTER   PROCEDURE dbo.sp_Store_SubmitRequisition
    @UserId INT,
    @Remark NVARCHAR(MAX),
    @RequestType VARCHAR(20),
    @CartJson NVARCHAR(MAX),
    @StoreLocationId INT,
    @NewReqNumber VARCHAR(50) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRAN;

        -- 1. แตก JSON ให้อยู่ในรูปแบบ Table ชั่วคราว
        SELECT 
            item_code = JSON_VALUE(value, '$.item_code'),
            qty = CAST(JSON_VALUE(value, '$.qty') AS DECIMAL(18,4)),
            requested_tags = JSON_QUERY(value, '$.requested_tags')
        INTO #TempCart
        FROM OPENJSON(@CartJson);

        -- 2. ตรวจสอบสต๊อกแบบรวดเดียว (ถ้าเป็น STOCK)
        IF @RequestType = 'STOCK'
        BEGIN
            DECLARE @MissingItem VARCHAR(50);
            SELECT TOP 1 @MissingItem = t.item_code
            FROM #TempCart t
            LEFT JOIN dbo.ITEMS i ON t.item_code = i.sap_no
            LEFT JOIN dbo.INVENTORY_ONHAND inv WITH (UPDLOCK) ON i.item_id = inv.parameter_id AND inv.location_id = @StoreLocationId
            WHERE t.qty > ISNULL(inv.quantity, 0);

            IF @MissingItem IS NOT NULL
            BEGIN
                DECLARE @ErrMsg NVARCHAR(200) = 'สต๊อกของ ' + @MissingItem + ' มีไม่เพียงพอตัดจ่าย';
                THROW 50001, @ErrMsg, 1;
            END
        END

        -- 3. รันเลข Sequence อย่างปลอดภัยด้วย HOLDLOCK
        DECLARE @Prefix VARCHAR(20) = 'REQ-' + FORMAT(GETDATE(), 'yyMM') + '-';
        DECLARE @LastNo VARCHAR(50);
        
        SELECT TOP 1 @LastNo = req_number 
        FROM dbo.STORE_REQUISITIONS WITH (UPDLOCK, HOLDLOCK) 
        WHERE req_number LIKE @Prefix + '%' 
        ORDER BY req_number DESC;

        DECLARE @NextSeq INT = ISNULL(CAST(RIGHT(@LastNo, 4) AS INT), 0) + 1;
        SET @NewReqNumber = @Prefix + RIGHT('0000' + CAST(@NextSeq AS VARCHAR(4)), 4);

        -- 4. บันทึกหัวบิล
        DECLARE @InsertedHeader TABLE (id INT);
        INSERT INTO dbo.STORE_REQUISITIONS (req_number, requester_id, status, remark, created_at)
        OUTPUT inserted.id INTO @InsertedHeader
        VALUES (@NewReqNumber, @UserId, 'NEW ORDER', @Remark, GETDATE());

        DECLARE @ReqId INT = (SELECT TOP 1 id FROM @InsertedHeader);

        -- 5. บันทึกรายการย่อยทั้งหมดรวดเดียว (Bulk Insert)
        DECLARE @InsertedItems TABLE (req_item_id INT, request_type VARCHAR(20));
        INSERT INTO dbo.STORE_REQUISITION_ITEMS (req_id, item_code, qty_requested, request_type, requested_tags)
        OUTPUT inserted.id, inserted.request_type INTO @InsertedItems
        SELECT @ReqId, item_code, qty, @RequestType, requested_tags
        FROM #TempCart;

        -- 6. บันทึกคิว K2 (ถ้าระบุ)
        IF @RequestType = 'K2'
        BEGIN
            INSERT INTO dbo.STORE_K2_REQUESTS (req_item_id, k2_status, updated_at)
            SELECT req_item_id, 'WAITING', GETDATE()
            FROM @InsertedItems;
        END

        DROP TABLE #TempCart;
        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        THROW;
    END CATCH
END;`;
        console.log("DB Updates Completed!");
        
        sql.close();
    } catch (err) {
        console.error(err);
    }
}
run();
