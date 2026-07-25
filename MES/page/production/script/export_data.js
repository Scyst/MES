async function exportProductionHistoryToExcel() {
    showToast('Exporting data... This may take a moment.', 'var(--bs-info)');
    showSpinner();

    try {
        // [Logic ใหม่]
        const searchString = document.getElementById('filterSearch').value;
        const searchTerms = searchString.split(',').map(term => term.trim()).filter(term => term.length > 0);

        const params = {
            page: 1,
            limit: -1, // Get all data
            'search_terms[]': searchTerms, // [แก้ไข]
            count_type: document.getElementById('filterCountType').value,
            startDate: document.getElementById('filterStartDate').value,
            endDate: document.getElementById('filterEndDate').value,
        };

        // --- 2. [แก้ไข] ยิง API พร้อมกัน 2 ตัว (Parallel) ---
        const [rawResult, summaryResult] = await Promise.all([
            // (เรียกที่ 1) ดึงข้อมูลดิบทั้งหมด (Raw Data)
            sendRequest(INVENTORY_API_URL, 'get_production_history', 'GET', null, { ...params, page: 1, limit: -1 }),
            // (เรียกที่ 2) ดึงข้อมูลสรุป (Summary)
            sendRequest(INVENTORY_API_URL, 'get_production_summary', 'GET', null, params)
        ]);

        // --- 3. ตรวจสอบข้อมูลดิบ (Raw Data) ---
        if (!rawResult.success || !rawResult.data || rawResult.data.length === 0) {
            showToast("No data to export for the current filter.", 'var(--bs-warning)');
            return;
        }

        // --- 4. [แก้ไข] สร้างชีต "Raw Data" (จาก rawResult) ---
        const rawDataSheet = rawResult.data.map(row => ({
            'Date': new Date(row.transaction_timestamp).toLocaleDateString('en-GB'),
            'Start Time': row.start_time || '',
            'End Time': row.end_time || '',
            'Location': row.location_name,
            'Part No': row.part_no,
            'SAP No': row.sap_no,
            'Lot/Ref': row.lot_no || '',
            'Quantity': parseFloat(row.quantity),
            'Type': row.count_type,
            'User': row.created_by,
            'Notes': row.notes || ''
        }));
        const wsRaw = XLSX.utils.json_to_sheet(rawDataSheet);


        // --- 5. [แก้ไข] สร้างชีต "Summary" และ "Grand Total" (จาก summaryResult) ---
        let wsSummary, wsGrandTotal;

        if (summaryResult.success && summaryResult.summary && summaryResult.summary.length > 0) {
            // สร้างชีต Summary (ข้อมูลที่ API สรุปมาให้)
            const summarySheetData = summaryResult.summary.map(row => ({
                'SAP No': row.sap_no,
                'Part No': row.part_no,
                'Type': row.count_type,
                'Total Quantity': parseFloat(row.total_quantity)
            }));
            wsSummary = XLSX.utils.json_to_sheet(summarySheetData);

            // สร้างชีต Grand Total (ข้อมูลที่ API สรุปมาให้)
            let overallGrandTotal = 0;
            const grandTotalSheetData = summaryResult.grand_total.map(row => {
                const quantity = parseFloat(row.total_quantity) || 0;
                overallGrandTotal += quantity;
                return {
                    'Type': row.count_type,
                    'Grand Total': quantity
                };
            });

            // เพิ่มแถว Overall Total (ถ้ามีหลาย Type)
            if (grandTotalSheetData.length > 1) {
                grandTotalSheetData.push({
                    'Type': 'OVERALL TOTAL',
                    'Grand Total': overallGrandTotal
                });
            }
            wsGrandTotal = XLSX.utils.json_to_sheet(grandTotalSheetData);

        } else {
            // (กรณี Summary ไม่มีข้อมูล ก็สร้างชีตเปล่าๆ ไว้)
            wsSummary = XLSX.utils.json_to_sheet([{'Status': 'No summary data found'}]);
            wsGrandTotal = XLSX.utils.json_to_sheet([{'Status': 'No summary data found'}]);
        }

        // --- 6. สร้าง Workbook (เหมือนเดิม) ---
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

async function exportHistoryToExcel() {
    showToast('Exporting data... This may take a moment.', 'var(--bs-info)');
    showSpinner();

    try {
        // [Logic ใหม่]
        const searchString = document.getElementById('filterSearch').value;
        const searchTerms = searchString.split(',').map(term => term.trim()).filter(term => term.length > 0);

        const params = {
            page: 1,
            limit: -1, // Get all data
            'search_terms[]': searchTerms, // [แก้ไข]
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