// in file: export_data.js (New Version)

async function exportProductionHistoryToExcel() {
    showToast('Exporting data... This may take a moment.', 'var(--bs-info)');
    showSpinner();

    try {
        // --- START: ส่วนที่แก้ไข ---
        // รวบรวม Filter จากช่องค้นหาใหม่
        const params = {
            page: 1,
            limit: -1, // Signal for export to get all data
            search_term: document.getElementById('filterSearch').value,
            count_type: document.getElementById('filterCountType').value,
            startDate: document.getElementById('filterStartDate').value,
            endDate: document.getElementById('filterEndDate').value,
        };
        // --- END: ส่วนที่แก้ไข ---

        const result = await sendRequest(INVENTORY_API_URL, 'get_production_history', 'GET', null, params);

        if (!result.success || result.data.length === 0) {
            showToast("No data to export for the current filter.", 'var(--bs-warning)');
            return;
        }

        // ส่วนที่เหลือของฟังก์ชันเหมือนเดิม...
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

        const summarySheet = result.summary.map(row => ({
            'SAP No': row.sap_no,
            'Part No': row.part_no,
            'Type': row.count_type,
            'Total Quantity': row.total_quantity
        }));
        
        const grandTotalSheet = result.grand_total.map(row => ({
            'Type': row.count_type,
            'Grand Total': row.total_quantity
        }));

        const wsRaw = XLSX.utils.json_to_sheet(rawDataSheet);
        const wsSummary = XLSX.utils.json_to_sheet(summarySheet);
        const wsGrandTotal = XLSX.utils.json_to_sheet(grandTotalSheet);

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

// in file: export_data.js

// (ข้างล่างฟังก์ชัน exportProductionHistoryToExcel ที่มีอยู่เดิม)

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

        const result = await sendRequest(INVENTORY_API_URL, 'get_receipt_history', 'GET', null, params);

        if (!result.success || result.data.length === 0) {
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