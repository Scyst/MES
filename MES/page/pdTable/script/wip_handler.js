/**
 * ฟังก์ชันสำหรับดึงข้อมูลและแสดงผลรายงาน WIP (Work-In-Progress)
 */
async function fetchWipReport() {
    //-- ดึง Element ของ Table Body ทั้งสองตาราง --
    const reportBody = document.getElementById('wipReportTableBody');
    const historyBody = document.getElementById('wipHistoryTableBody');
    if (!reportBody || !historyBody) return;

    //-- แสดงสถานะ "Loading..." ระหว่างรอข้อมูล --
    reportBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading Report...</td></tr>';
    historyBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading History...</td></tr>';
    
    //-- รวบรวมค่า Filter ปัจจุบัน --
    const params = new URLSearchParams({
        line: document.getElementById('filterLine')?.value || '',
        part_no: document.getElementById('filterPartNo')?.value || '',
        lot_no: document.getElementById('filterLotNo')?.value || '',
        startDate: document.getElementById('filterStartDate')?.value || '',
        endDate: document.getElementById('filterEndDate')?.value || ''
    });

    try {
        //-- เรียก API เพื่อดึงข้อมูลรายงานและประวัติ --
        const response = await fetch(`../../api/wipManage/wipManage.php?action=get_wip_report&${params.toString()}`);
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message);
        }

        //-- 1. Render ตารางสรุป WIP Report --
        reportBody.innerHTML = '';
        if (result.report.length === 0) {
            reportBody.innerHTML = '<tr><td colspan="5" class="text-center">No WIP data found for the selected filters.</td></tr>';
        } else {
            result.report.forEach(item => {
                const variance = parseInt(item.variance);
                //-- หากมีผลต่าง (Variance) ให้ไฮไลท์แถวเป็นสีเหลือง --
                const rowClass = variance !== 0 ? 'table-warning' : ''; 
                const tr = document.createElement('tr');
                tr.className = rowClass;
                tr.innerHTML = `
                    <td>${item.part_no}</td>
                    <td>${item.line}</td>
                    <td>${parseInt(item.total_in).toLocaleString()}</td>
                    <td>${parseInt(item.total_out).toLocaleString()}</td>
                    <td><b>${variance.toLocaleString()}</b></td>
                `;
                reportBody.appendChild(tr);
            });
        }
        
        //-- 2. Render ตารางประวัติการนำเข้า WIP --
        historyBody.innerHTML = '';
         if (result.history.length === 0) {
            historyBody.innerHTML = '<tr><td colspan="7" class="text-center">No entry history found for the selected filters.</td></tr>';
        } else {
            result.history.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(item.entry_time).toLocaleString('th-TH')}</td>
                    <td>${item.line}</td>
                    <td>${item.lot_no || '-'}</td>
                    <td>${item.part_no}</td>
                    <td>${parseInt(item.quantity_in).toLocaleString()}</td>
                    <td>${item.operator}</td>
                    <td>${item.remark || '-'}</td>
                `;
                historyBody.appendChild(tr);
            });
        }

    } catch (error) {
        //-- จัดการข้อผิดพลาดและแสดงในตาราง --
        console.error('Failed to fetch WIP report:', error);
        reportBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${error.message}</td></tr>`;
        historyBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error loading history.</td></tr>`;
    }
}

//-- Event Listener ที่จะทำงานเมื่อหน้าเว็บโหลดเสร็จสมบูรณ์ --
document.addEventListener('DOMContentLoaded', () => {
    const wipTabButton = document.getElementById('wip-report-tab');
    const filterButton = document.getElementById('filterButton');

    //-- หากมีการกด Tab "WIP Report" ให้โหลดข้อมูล --
    if (wipTabButton) {
        wipTabButton.addEventListener('shown.bs.tab', () => {
            fetchWipReport();
        });
    }
    
    //-- หากมีการกดปุ่ม Filter ให้โหลดข้อมูลใหม่ (เฉพาะเมื่ออยู่บน Tab WIP) --
    if (filterButton) {
        filterButton.addEventListener('click', () => {
            if (document.getElementById('wip-report-pane')?.classList.contains('active')) {
                 fetchWipReport();
            }
        });
    }
});