async function exportProductionHistoryToExcel() {
    showToast('Exporting data... This may take a moment.', 'var(--bs-info)');
    showSpinner();

    try {
        const params = {
            page: 1,
            limit: -1, // Get all data
            search_term: document.getElementById('filterSearch').value,
            count_type: document.getElementById('filterCountType').value,
            startDate: document.getElementById('filterStartDate').value,
            endDate: document.getElementById('filterEndDate').value,
        };

        const result = await sendRequest(INVENTORY_API_URL, 'get_production_history', 'GET', null, params);

        // <== [แก้ไข] ตรวจสอบ result.data ด้วย
        if (!result.success || !result.data || result.data.length === 0) {
            showToast("No data to export for the current filter.", 'var(--bs-warning)');
            return;
        }

        // --- สร้าง Raw Data Sheet ---
        const rawDataSheet = result.data.map(row => ({
            'Date': new Date(row.transaction_timestamp).toLocaleDateString('en-GB'),
            'Start Time': row.start_time || '',
            'End Time': row.end_time || '',
            'Location': row.location_name,
            'Part No': row.part_no,
            'SAP No': row.sap_no,
            'Lot/Ref': row.lot_no || '',
            'Quantity': parseFloat(row.quantity), // <== [แนะนำ] ใช้ parseFloat
            'Type': row.count_type,
            'User': row.created_by,
            'Notes': row.notes || '' // <== [แนะนำ] เพิ่ม || ''
        }));

        // <== [แก้ไข] คำนวณ Summary และ Grand Total จาก result.data ---
        const summary = {};
        let grandTotalByType = {}; // แยก Grand Total ตาม Type
        let overallGrandTotal = 0;

        result.data.forEach(row => {
            const key = `${row.sap_no}|${row.part_no}|${row.count_type}`;
            if (!summary[key]) {
                summary[key] = {
                    'SAP No': row.sap_no,
                    'Part No': row.part_no,
                    'Type': row.count_type,
                    'Total Quantity': 0
                };
            }
            const quantity = parseFloat(row.quantity) || 0;
            summary[key]['Total Quantity'] += quantity;

            // คำนวณ Grand Total แยกตาม Type
            if (!grandTotalByType[row.count_type]) {
                grandTotalByType[row.count_type] = 0;
            }
            grandTotalByType[row.count_type] += quantity;
            overallGrandTotal += quantity; // รวมยอดทั้งหมด
        });

        // แปลง Summary Object เป็น Array สำหรับ Sheet
        const summarySheetData = Object.values(summary).sort((a, b) => {
            if (a['SAP No'] !== b['SAP No']) return a['SAP No'].localeCompare(b['SAP No']);
            if (a['Part No'] !== b['Part No']) return a['Part No'].localeCompare(b['Part No']);
            return a['Type'].localeCompare(b['Type']);
        });

        // แปลง Grand Total Object เป็น Array สำหรับ Sheet
        const grandTotalSheetData = Object.keys(grandTotalByType).map(type => ({
            'Type': type,
            'Grand Total': grandTotalByType[type]
        })).sort((a, b) => a['Type'].localeCompare(b['Type']));

        // เพิ่มแถว Overall Grand Total
        grandTotalSheetData.push({
            'Type': 'OVERALL TOTAL',
            'Grand Total': overallGrandTotal
        });
        // --- สิ้นสุดการคำนวณ ---

        // --- สร้าง Workbook ---
        const wsRaw = XLSX.utils.json_to_sheet(rawDataSheet);
        // <== [แก้ไข] ใช้ข้อมูลที่คำนวณใหม่
        const wsSummary = XLSX.utils.json_to_sheet(summarySheetData);
        // <== [แก้ไข] ใช้ข้อมูลที่คำนวณใหม่
        const wsGrandTotal = XLSX.utils.json_to_sheet(grandTotalSheetData);

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

// (ฟังก์ชัน exportHistoryToExcel ดูถูกต้องแล้ว ไม่ต้องแก้ไข)
async function exportHistoryToExcel() {
    showToast('Exporting data... This may take a moment.', 'var(--bs-info)');
    showSpinner();

    try {
        const params = {
            page: 1,
            limit: -1, // Get all data
            search_term: document.getElementById('filterSearch').value,
            startDate: document.getElementById('filterStartDate').value,
            endDate: document.getElementById('filterEndDate').value,
        };

        // API นี้ส่ง 'data' กลับมา ซึ่งถูกต้องแล้ว
        const result = await sendRequest(INVENTORY_API_URL, 'get_receipt_history', 'GET', null, params);

        if (!result.success || !result.data || result.data.length === 0) { // <== [แนะนำ] เช็ค result.data ด้วย
            showToast("No data to export for the current filter.", 'var(--bs-warning)');
            return;
        }

        const dataToExport = result.data.map(row => {
            const transactionDate = new Date(row.transaction_timestamp);
            return {
                'Date': transactionDate.toLocaleDateString('en-GB'),
                'Time': transactionDate.toTimeString().substring(0, 8),
                'From (Source)': row.source_location || 'External',
                'To (Destination)': row.destination_location || 'N/A',
                'SAP No.': row.sap_no,
                'Part No.': row.part_no,
                'Lot / Reference': row.lot_no || '',
                'Quantity': parseFloat(row.quantity),
                'Notes': row.notes || ''
            };
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Entry History");

        const fileName = `Entry_History_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

    } catch (error) {
        console.error('Export failed:', error);
        showToast('Export failed. See console for details.', 'var(--bs-danger)');
    } finally {
        hideSpinner();
    }
}