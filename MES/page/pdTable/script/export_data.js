/**
 * ฟังก์ชันสำหรับ Export ข้อมูลที่แสดงในตารางเป็นไฟล์ PDF
 */
/*
async function exportToPDF() {
    //-- โหลด Library jsPDF และเตรียม Document --
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    //-- ตรวจสอบว่า Plugin 'autoTable' ถูกโหลดแล้วหรือยัง --
    if (!doc.autoTable) {
        showToast("jsPDF AutoTable plugin not loaded.", '#dc3545');
        return;
    }

    //-- รวบรวมค่า Filter ปัจจุบันเพื่อดึงข้อมูลทั้งหมด --
    const params = new URLSearchParams({
        action: 'get_parts',
        startDate: document.getElementById("filterStartDate").value,
        endDate: document.getElementById("filterEndDate").value,
        line: document.getElementById("filterLine")?.value.trim() || '',
        model: document.getElementById("filterModel")?.value.trim() || '',
        part_no: document.getElementById("filterPartNo")?.value.trim() || '',
        lot_no: document.getElementById("filterLotNo")?.value.trim() || '',
        count_type: document.getElementById("filterCountType")?.value.trim() || '',
        page: 1,
        limit: 100000 //-- ดึงข้อมูลทั้งหมดโดยไม่แบ่งหน้า --
    });
    
    //-- เรียก API เพื่อดึงข้อมูล --
    const response = await fetch(`../../api/pdTable/pdTableManage.php?${params.toString()}`);
    const result = await response.json();

    if (!result.success || result.data.length === 0) {
        showToast("Failed to export data or no data found.", '#ffc107');
        return;
    }

    //-- เตรียมข้อมูล Header และ Body สำหรับตารางใน PDF --
    const headers = [["Date", "Time", "Line", "Model", "Part No.", "Lot No.", "Quantity", "Type"]];
    const rows = result.data.map(row => [
        row.log_date,
        row.log_time,
        row.line,
        row.model,
        row.part_no,
        row.lot_no,
        row.count_value,
        row.count_type,
    ]);

    //-- สร้างเอกสาร PDF --
    doc.setFontSize(16);
    doc.text("Filtered Production History", 14, 16);
    doc.autoTable({
        head: headers,
        body: rows,
        startY: 20,
        headStyles: { fillColor: [0, 123, 255], halign: 'center' },
        bodyStyles: { halign: 'center' },
        theme: 'striped',
    });

    //-- สั่งดาวน์โหลดไฟล์ PDF --
    doc.save("Production_History.pdf");
}
*/

/**
 * ฟังก์ชันสำหรับ Export ข้อมูลทั้งหมด (Raw Data, Summary, Grand Total) เป็นไฟล์ Excel แบบหลาย Sheet
 */
async function exportToExcel() {
    //-- รวบรวมค่า Filter ปัจบุนเพื่อดึงข้อมูลทั้งหมด --
    const params = new URLSearchParams({
        action: 'get_parts',
        startDate: document.getElementById("filterStartDate").value,
        endDate: document.getElementById("filterEndDate").value,
        line: document.getElementById("filterLine")?.value.trim() || '',
        model: document.getElementById("filterModel")?.value.trim() || '',
        part_no: document.getElementById("filterPartNo")?.value.trim() || '',
        lot_no: document.getElementById("filterLotNo")?.value.trim() || '',
        count_type: document.getElementById("filterCountType")?.value.trim() || '',
        page: 1,
        limit: 100000
    });
    
    showToast('Exporting data... Please wait.', '#0dcaf0');
    showSpinner(); // <-- เพิ่ม: แสดง Spinner

    try {
        //-- เรียก API ซึ่งจะคืนค่าทั้ง Raw Data, Summary, และ Grand Total --
        const response = await fetch(`../../api/pdTable/pdTableManage.php?${params.toString()}`);
        const result = await response.json();

        if (!result.success || result.data.length === 0) {
            showToast("No data to export.", '#ffc107');
            return;
        }

        //-- 1. เตรียมข้อมูลสำหรับ Sheet "Raw Data" --
        const dataToExport = result.data.map(row => ({
            ID: row.id,
            Date: row.log_date,
            Time: row.log_time,
            Line: row.line,
            Model: row.model,
            'Part No': row.part_no,
            'Lot No': row.lot_no,
            Quantity: row.count_value,
            Type: row.count_type,
            Note: row.note
        }));

        //-- 2. เตรียมข้อมูลสำหรับ Sheet "Summary by Lot" --
        const summaryData = result.summary.map(row => ({
            Model: row.model,
            'Part No': row.part_no,
            'Lot No': row.lot_no || '',
            FG: row.FG || 0,
            NG: row.NG || 0,
            HOLD: row.HOLD || 0,
            REWORK: row.REWORK || 0,
            SCRAP: row.SCRAP || 0,
            ETC: row.ETC || 0
        }));

        //-- 3. เตรียมข้อมูลสำหรับ Sheet "Grand Total" --
        const grandTotal = [{
            " ": "Grand Total",
            FG: result.grand_total.FG || 0,
            NG: result.grand_total.NG || 0,
            HOLD: result.grand_total.HOLD || 0,
            REWORK: result.grand_total.REWORK || 0,
            SCRAP: result.grand_total.SCRAP || 0,
            ETC: result.grand_total.ETC || 0
        }];

        //-- สร้าง Worksheet จากข้อมูลแต่ละชุด --
        const ws1 = XLSX.utils.json_to_sheet(dataToExport);
        const ws2 = XLSX.utils.json_to_sheet(summaryData);
        const ws3 = XLSX.utils.json_to_sheet(grandTotal);

        //-- สร้าง Workbook และเพิ่ม Worksheet ทั้งหมดเข้าไป --
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws1, "Raw Data");
        XLSX.utils.book_append_sheet(wb, ws2, "Summary by Lot");
        XLSX.utils.book_append_sheet(wb, ws3, "Grand Total");
        
        //-- สั่งดาวน์โหลดไฟล์ Excel --
        const fileName = `Production_History_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

    } catch (error) {
        console.error('Export to Excel failed:', error);
        showToast('Failed to export data. Please check the console for errors.', '#dc3545');
    } finally {
        hideSpinner(); // <-- เพิ่ม: ซ่อน Spinner เสมอ
    }
}

/**
 * ฟังก์ชันสำหรับ Export ข้อมูล "Summary" ที่แสดงบนหน้าเว็บปัจจุบันเป็นไฟล์ Excel
 */
function exportSummaryToExcel() {
    //-- ดึงข้อมูลที่ Cache ไว้จาก Global Variable --
    const summaryData = window.cachedSummary || [];
    const grandTotalData = window.cachedGrand || {};

    if (summaryData.length === 0) {
        showToast("No summary data to export.", '#ffc107');
        return;
    }
    
    //-- เตรียมข้อมูลในรูปแบบ Array of Arrays สำหรับ Library SheetJS --
    const headers = ["Model", "Part No", "Lot No", "FG", "NG", "HOLD", "REWORK", "SCRAP", "ETC"];
    const dataRows = summaryData.map(row => [
        row.model, row.part_no, row.lot_no || '',
        row.FG || 0, row.NG || 0, row.HOLD || 0,
        row.REWORK || 0, row.SCRAP || 0, row.ETC || 0
    ]);
    const totalRow = [
        "Grand Total", "", "",
        grandTotalData.FG || 0, grandTotalData.NG || 0, grandTotalData.HOLD || 0,
        grandTotalData.REWORK || 0, grandTotalData.SCRAP || 0, grandTotalData.ETC || 0
    ];

    //-- สร้าง Worksheet และ Workbook --
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows, totalRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Production Summary");

    //-- สั่งดาวน์โหลดไฟล์ Excel --
    XLSX.writeFile(workbook, `Production_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * ฟังก์ชันสำหรับ Export ข้อมูล Entry History เป็นไฟล์ Excel
 */
async function exportHistoryToExcel() {
    showToast('Exporting Entry History...', '#0dcaf0');
    
    // ========== แก้ไขจุดที่ 1 ==========
    // เพิ่ม 'model' เข้าไปในรายการ parameter ที่จะส่งไป
    const params = new URLSearchParams({
        action: 'get_wip_history',
        line: document.getElementById('filterLine')?.value || '',
        model: document.getElementById('filterModel')?.value || '', // <-- เพิ่มบรรทัดนี้
        part_no: document.getElementById('filterPartNo')?.value || '',
        lot_no: document.getElementById('filterLotNo')?.value || '',
        startDate: document.getElementById('filterStartDate')?.value || '',
        endDate: document.getElementById('filterEndDate')?.value || ''
    });

    showSpinner(); // <-- เพิ่ม: แสดง Spinner
    try {
        const response = await fetch(`../../api/pdTable/wipManage.php?${params.toString()}`);
        const result = await response.json();

        // ========== แก้ไขจุดที่ 2 ==========
        // เปลี่ยนจาก result.history เป็น result.data
        if (!result.success || !result.data || result.data.length === 0) {
            showToast("No entry history data to export.", '#ffc107');
            return;
        }

        // ========== แก้ไขจุดที่ 3 ==========
        // เปลี่ยนจาก result.history เป็น result.data และปรับปรุงฟิลด์ข้อมูล
        const dataToExport = result.data.map(row => {
            const entryDate = new Date(row.entry_time);
            return {
                'Date': entryDate.toLocaleDateString('en-GB'),
                'Time': entryDate.toTimeString().substring(0, 8),
                'Line': row.line,
                'Model': row.model,
                'Part No': row.part_no,
                'Lot No': row.lot_no,
                'Quantity In': parseInt(row.quantity_in),
                'Operator': row.operator,
                'Remark': row.remark
            };
        });
        
        // ... (ส่วนที่เหลือของการสร้าง Excel เหมือนเดิม)
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Entry History");
        XLSX.writeFile(wb, `Entry_History_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (error) {
        console.error('Export Entry History failed:', error);
        showToast('Failed to export history data.', '#dc3545');
    } finally {
        hideSpinner(); // <-- เพิ่ม: ซ่อน Spinner เสมอ
    }
}

/**
 * ฟังก์ชันสำหรับ Export ข้อมูล WIP Report เป็นไฟล์ Excel
 */
function exportWipReportToExcel() {
    const reportData = window.cachedWipReport || [];
    if (reportData.length === 0) {
        showToast("No WIP report data to export.", '#ffc107');
        return;
    }

    const dataToExport = reportData.map(row => ({
        'Part Number': row.part_no,
        'Line': row.line,
        'Total In': parseInt(row.total_in),
        'Total Out': parseInt(row.total_out),
        'Variance': parseInt(row.variance)
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WIP Report");
    XLSX.writeFile(wb, `WIP_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * ฟังก์ชันสำหรับ Export ข้อมูล "Summary" ของ Entry History เป็นไฟล์ Excel
 */
function exportHistorySummaryToExcel() {
    const summaryData = window.cachedHistorySummary || [];

    if (summaryData.length === 0) {
        showToast("No summary data to export.", '#ffc107');
        return;
    }
    
    const dataToExport = summaryData.map(row => ({
        'Line': row.line,
        'Model': row.model,
        'Part No': row.part_no,
        'Total Quantity In': parseInt(row.total_quantity_in)
    }));
    
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Entry History Summary");

    XLSX.writeFile(wb, `Entry_History_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ===== ฟังก์ชันใหม่ที่เพิ่มเข้ามา =====
/**
 * ฟังก์ชันสำหรับ Export ข้อมูล WIP Report by Lot เป็นไฟล์ Excel
 */
function exportWipReportByLotToExcel() {
    const reportData = window.cachedWipReportByLot || [];
    if (reportData.length === 0) {
        showToast("No WIP by Lot data to export.", '#ffc107');
        return;
    }

    const dataToExport = reportData.map(row => ({
        'Lot Number': row.lot_no,
        'Part Number': row.part_no,
        'Line': row.line,
        'Model': row.model,
        'Total In': parseInt(row.total_in),
        'Total Out': parseInt(row.total_out),
        'WIP/Variance': parseInt(row.variance)
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WIP Report by Lot");
    XLSX.writeFile(wb, `WIP_Report_by_Lot_${new Date().toISOString().split('T')[0]}.xlsx`);
}
// ===== สิ้นสุดฟังก์ชันใหม่ =====