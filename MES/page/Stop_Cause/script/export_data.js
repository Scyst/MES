// --- ค่าคงที่และฟังก์ชันกลาง ---
const STOP_CAUSE_API_URL = 'api/stopCauseManage.php';

/**
 * ฟังก์ชันสำหรับรวบรวมค่า Filter ทั้งหมดและสร้าง URLSearchParams
 * @returns {URLSearchParams} Object ที่มี Parameters ทั้งหมดสำหรับส่งไปกับ Request
 */
function getStopCauseFilterParams() {
    return new URLSearchParams({
        action: 'get_stops',
        startDate: document.getElementById("filterStartDate")?.value,
        endDate: document.getElementById("filterEndDate")?.value,
        line: document.getElementById("filterLine")?.value.trim() || '',
        machine: document.getElementById("filterMachine")?.value.trim() || '',
        cause: document.getElementById("filterCause")?.value.trim() || '',
        page: 1,
        limit: 100000 //-- กำหนด limit ให้สูงเพื่อดึงข้อมูลทั้งหมดสำหรับการ Export --
    });
}

/**
 * ฟังก์ชันสำหรับแปลงนาทีเป็นรูปแบบ "Xh Ym"
 * @param {number} totalMinutes - จำนวนนาทีทั้งหมด
 * @returns {string} ข้อความที่จัดรูปแบบแล้ว
 */
function formatDurationForExport(totalMinutes) {
    if (isNaN(totalMinutes) || totalMinutes === null) return '0h 0m';
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
}

// --- ฟังก์ชันหลักสำหรับการ Export ---

/**
 * ฟังก์ชันสำหรับ Export ข้อมูลเป็นไฟล์ PDF
 */
/*
async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    if (!doc.autoTable) {
        showToast("jsPDF AutoTable plugin not loaded.", '#dc3545');
        return;
    }
    
    showToast("Preparing PDF export... Please wait.", '#0dcaf0');
    showSpinner(); // <-- เพิ่ม: แสดง Spinner
    try {
        const response = await fetch(`${STOP_CAUSE_API_URL}?${getStopCauseFilterParams().toString()}`);
        const result = await response.json();

        if (!result.success || result.data.length === 0) {
            showToast("No data to export.", '#ffc107');
            return;
        }

        // ... (โค้ดสร้าง PDF เหมือนเดิม) ...
        doc.save(`Stop_Cause_History_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
        console.error("PDF Export failed:", error);
        showToast("An error occurred during PDF export.", '#dc3545');
    } finally {
        hideSpinner(); // <-- เพิ่ม: ซ่อน Spinner เสมอ
    }
}
/*

/**
 * ฟังก์ชันสำหรับ Export ข้อมูลเป็นไฟล์ Excel แบบหลาย Sheet
 */
async function exportToExcel() {
    showToast("Preparing Excel export... Please wait.", '#0dcaf0');
    showSpinner(); // <-- เพิ่ม: แสดง Spinner
    try {
        const response = await fetch(`${STOP_CAUSE_API_URL}?${getStopCauseFilterParams().toString()}`);
        const result = await response.json();

        if (!result.success || result.data.length === 0) {
            showToast("No data to export.", '#ffc107');
            return;
        }

        const workbook = XLSX.utils.book_new();

        //-- 1. เตรียมข้อมูลสำหรับ Sheet "Stop Cause Summary" --
        const totalOccurrences = result.summary.reduce((acc, curr) => acc + Number(curr.count || 0), 0);
        const grandTotalRow = { 
            "Line": "Grand Total", 
            "Occurrences": totalOccurrences,
            "Total Duration": formatDurationForExport(result.grand_total_minutes)
        };
        const summaryData = result.summary.map(row => ({
            "Line": row.line || 'N/A',
            "Occurrences": row.count,
            "Total Duration": formatDurationForExport(row.total_minutes)
        }));

        //-- 2. เตรียมข้อมูลสำหรับ Sheet "Raw Data" --
        const rawData = result.data.map(row => ({
            "ID": row.id,
            "Date": row.log_date,
            "Start": row.stop_begin,
            "End": row.stop_end,
            "Duration (min)": row.duration,
            "Line": row.line,
            "Machine/Station": row.machine,
            "Cause": row.cause,
            "Recovered By": row.recovered_by,
            "Note": row.note || ''
        }));
        
        //-- สร้าง Worksheet และเพิ่มลงใน Workbook --
        const rawDataSheet = XLSX.utils.json_to_sheet(rawData);
        XLSX.utils.book_append_sheet(workbook, rawDataSheet, "Raw Data");
        const summarySheet = XLSX.utils.json_to_sheet([grandTotalRow, ...summaryData]);
        XLSX.utils.book_append_sheet(workbook, summarySheet, "Stop Cause Summary");
        
        //-- สั่งดาวน์โหลดไฟล์ Excel --
        XLSX.writeFile(workbook, `Stop_Cause_History_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (error) {
        console.error('Excel Export failed:', error);
        showToast('Failed to export data.', '#dc3545');
    } finally {
        hideSpinner(); // <-- เพิ่ม: ซ่อน Spinner เสมอ
    }
}