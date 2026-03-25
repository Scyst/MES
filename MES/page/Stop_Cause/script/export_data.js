// --- ค่าคงที่และฟังก์ชันกลาง ---
const STOP_CAUSE_API_URL = 'api/stopCauseManage.php';

/**
 * ฟังก์ชันสำหรับรวบรวมค่า Filter ทั้งหมดและสร้าง URLSearchParams
 * @returns {URLSearchParams} Object ที่มี Parameters ทั้งหมดสำหรับส่งไปกับ Request
 */
function getStopCauseFilterParams() {
    // Helper function สำหรับป้องกัน TypeError
    const getValue = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
    };

    return new URLSearchParams({
        action: 'get_stops',
        startDate: getValue("filterStartDate"),
        endDate: getValue("filterEndDate"),
        line: getValue("filterLine"),
        machine: getValue("filterMachine"),
        cause: getValue("filterCause"),
        page: 1,
        limit: 100000 // กำหนด limit ให้สูงเพื่อดึงข้อมูลทั้งหมดสำหรับการ Export
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

async function exportToExcel() {
    const notify = (msg, color) => {
        if (typeof showToast === 'function') showToast(msg, color);
        else alert(msg);
    };

    notify("Preparing Excel export... Please wait.", '#0dcaf0');
    if (typeof showSpinner === 'function') showSpinner();
    
    try {
        const response = await fetch(`${STOP_CAUSE_API_URL}?${getStopCauseFilterParams().toString()}`);
        const result = await response.json();

        if (!result.success || !result.data || result.data.length === 0) {
            notify("No data to export.", '#ffc107');
            return;
        }

        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX library (SheetJS) is not loaded.');
        }

        const workbook = XLSX.utils.book_new();
        const totalOccurrences = result.summary ? result.summary.reduce((acc, curr) => acc + Number(curr.count || 0), 0) : 0;
        const grandTotalRow = { 
            "Line": "Grand Total", 
            "Occurrences": totalOccurrences,
            "Total Duration": formatDurationForExport(result.grand_total_minutes)
        };
        
        const summaryData = result.summary ? result.summary.map(row => ({
            "Line": row.line || 'N/A',
            "Occurrences": row.count,
            "Total Duration": formatDurationForExport(row.total_minutes)
        })) : [];

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
        
        const rawDataSheet = XLSX.utils.json_to_sheet(rawData);
        XLSX.utils.book_append_sheet(workbook, rawDataSheet, "Raw Data");
        
        const summarySheet = XLSX.utils.json_to_sheet([grandTotalRow, ...summaryData]);
        XLSX.utils.book_append_sheet(workbook, summarySheet, "Stop Cause Summary");
        const exportDate = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `Stop_Cause_History_${exportDate}.xlsx`);

    } catch (error) {
        console.error('Excel Export failed:', error);
        notify('Failed to export data. Please check console.', '#dc3545');
    } finally {
        if (typeof hideSpinner === 'function') hideSpinner();
    }
}