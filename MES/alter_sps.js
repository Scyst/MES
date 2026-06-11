const fs = require('fs');

async function processSP(filePath, spName) {
    console.log(`Processing ${spName}...`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let textLines = data.recordset.map(row => row.Text);
    let fullText = textLines.join('');
    
    // Change CREATE to ALTER
    fullText = fullText.replace(/CREATE\s+PROCEDURE/i, 'ALTER PROCEDURE');
    
    // Add @MachineId parameter
    fullText = fullText.replace(/@Model\s+NVARCHAR\(\d+\)\s*=\s*NULL/i, '@Model NVARCHAR(100) = NULL,\n    @MachineId INT = NULL');
    
    // Add machine condition to transactions table
    // For transactions: AND (@Model IS NULL OR r.model = @Model)
    fullText = fullText.replace(/AND\s+\(\s*@Model\s+IS\s+NULL\s+OR\s+r\.model\s+=\s+@Model\s*\)/gi, "AND (@Model IS NULL OR r.model = @Model) AND (@MachineId IS NULL OR t.machine_id = @MachineId)");
    
    fs.writeFileSync(`alter_${spName}.sql`, fullText);
    console.log(`Generated alter_${spName}.sql`);
}

processSP('C:\\Users\\naphat-noo\\.gemini\\antigravity-ide\\brain\\01d316f5-c021-4b37-9d65-b1c7099555fa\\.system_generated\\steps\\297\\output.txt', 'sp_CalculateOEE_Dashboard_PieChart');
processSP('C:\\Users\\naphat-noo\\.gemini\\antigravity-ide\\brain\\01d316f5-c021-4b37-9d65-b1c7099555fa\\.system_generated\\steps\\334\\output.txt', 'sp_CalculateOEE_Dashboard_LineChart');
processSP('C:\\Users\\naphat-noo\\.gemini\\antigravity-ide\\brain\\01d316f5-c021-4b37-9d65-b1c7099555fa\\.system_generated\\steps\\372\\output.txt', 'sp_CalculateOEE_Hourly_Trend');
processSP('C:\\Users\\naphat-noo\\.gemini\\antigravity-ide\\brain\\01d316f5-c021-4b37-9d65-b1c7099555fa\\.system_generated\\steps\\373\\output.txt', 'sp_GetDailyProductionSummary');

console.log("Done.");
