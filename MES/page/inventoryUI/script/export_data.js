// --- เพิ่มฟังก์ชันนี้เข้าไปใน export_data.js ---
async function exportProductionHistoryToExcel() {
    showToast('Exporting data... This may take a moment.', 'var(--bs-info)');
    showSpinner();

    try {
        // รวบรวม Filter ทั้งหมด และเพิ่ม limit: -1 เพื่อบอก API ว่าต้องการข้อมูลทั้งหมด
        const params = {
            page: 1,
            limit: -1, // << สัญญาณสำหรับการ Export
            part_no: document.getElementById('filterPartNo').value,
            location: document.getElementById('filterLine').value,
            lot_no: document.getElementById('filterLotNo').value,
            count_type: document.getElementById('filterCountType').value,
            startDate: document.getElementById('filterStartDate').value,
            endDate: document.getElementById('filterEndDate').value,
        };

        // เรียก API ซึ่งตอนนี้จะคืนค่ามา 3 ส่วน (data, summary, grand_total)
        const result = await sendRequest(INVENTORY_API_URL, 'get_production_history', 'GET', null, params);

        if (!result.success || result.data.length === 0) {
            showToast("No data to export for the current filter.", 'var(--bs-warning)');
            return;
        }

        // 1. เตรียมข้อมูลสำหรับ Sheet "Raw Data"
        const rawDataSheet = result.data.map(row => ({
            'Date': new Date(row.transaction_timestamp).toLocaleDateString('en-GB'),
            'Start Time': row.start_time || '',
            'End Time': row.end_time || '',
            'Location': row.location_name,
            'Part No': row.part_no,
            'SAP No': row.sap_no,
            'Lot/Ref': row.lot_no,
            'Quantity': row.quantity,
            'Type': row.count_type,
            'User': row.created_by,
            'Notes': row.notes
        }));

        // 2. เตรียมข้อมูลสำหรับ Sheet "Summary by Part"
        const summarySheet = result.summary.map(row => ({
            'SAP No': row.sap_no,
            'Part No': row.part_no,
            'Type': row.count_type,
            'Total Quantity': row.total_quantity
        }));

        // 3. เตรียมข้อมูลสำหรับ Sheet "Grand Total"
        const grandTotalSheet = result.grand_total.map(row => ({
            'Type': row.count_type,
            'Grand Total': row.total_quantity
        }));

        // สร้าง Worksheet จากข้อมูลแต่ละชุด
        const wsRaw = XLSX.utils.json_to_sheet(rawDataSheet);
        const wsSummary = XLSX.utils.json_to_sheet(summarySheet);
        const wsGrandTotal = XLSX.utils.json_to_sheet(grandTotalSheet);

        // สร้าง Workbook และเพิ่ม Worksheet ทั้งหมดเข้าไป
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsRaw, "Raw Data");
        XLSX.utils.book_append_sheet(wb, wsSummary, "Summary by Part");
        XLSX.utils.book_append_sheet(wb, wsGrandTotal, "Grand Total");

        const fileName = `Production_History_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

    } catch (error) {
        console.error('Export failed:', error);
        showToast('Export failed. See console for details.', 'var(--bs-danger)');
    } finally {
        hideSpinner();
    }
}