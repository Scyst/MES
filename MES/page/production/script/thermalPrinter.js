/**
 * thermalPrinter.js - Enterprise Thermal Label Printer Hub for MES
 * Supports:
 *  1. ZPL-II Code Generation for 4.00" x 2.00" (203 dpi / 8 dpmm)
 *  2. Web Serial API Direct USB Printing (Honeywell PC42E-T, Zebra ZT411/ZD421)
 *  3. Chrome Kiosk Mode Silent Print (< 0.5s Zero-Click)
 * 
 * Compatible with Honeywell ZSim2 & Zebra ZPL-II
 */

(function(window) {
    'use strict';

    let activeSerialPort = null;
    let serialWriter = null;

    const ThermalPrinter = {
        // Printer Configuration (4.00" x 2.00" at 203 DPI)
        DPI: 203,
        LABEL_WIDTH_INCH: 4.0,
        LABEL_HEIGHT_INCH: 2.0,
        DOTS_WIDTH: 812,   // 4.0in * 203dpi = 812 dots
        DOTS_HEIGHT: 406,  // 2.0in * 203dpi = 406 dots

        /**
         * Check if browser supports Web Serial API
         */
        isSerialSupported() {
            return 'serial' in navigator;
        },

        /**
         * Check if active serial port is open
         */
        isSerialConnected() {
            return activeSerialPort !== null && activeSerialPort.readable !== null;
        },

        /**
         * Request and connect to USB Serial Printer
         */
        async connectUsb(baudRate = 9600) {
            if (!this.isSerialSupported()) {
                throw new Error('เบราว์เซอร์นี้ไม่รองรับ Web Serial API (กรุณาใช้ Google Chrome หรือ MS Edge)');
            }

            try {
                // Prompt user to select port
                activeSerialPort = await navigator.serial.requestPort();
                await activeSerialPort.open({ baudRate: baudRate });

                // Save connected state in localStorage
                localStorage.setItem('mes_thermal_usb_active', '1');
                return { success: true, message: 'เชื่อมต่อเครื่องพิมพ์ผ่าน USB สำเร็จ' };
            } catch (err) {
                activeSerialPort = null;
                throw err;
            }
        },

        /**
         * Disconnect active USB Serial Port
         */
        async disconnectUsb() {
            try {
                if (serialWriter) {
                    await serialWriter.close();
                    serialWriter = null;
                }
                if (activeSerialPort) {
                    await activeSerialPort.close();
                    activeSerialPort = null;
                }
                localStorage.removeItem('mes_thermal_usb_active');
                return { success: true, message: 'ตัดการเชื่อมต่อ USB เรียบร้อย' };
            } catch (err) {
                console.error('Error disconnecting USB:', err);
                activeSerialPort = null;
                return { success: false, message: err.message };
            }
        },

        /**
         * Send raw ZPL string to USB printer via Web Serial
         */
        async printZplUsb(zplString) {
            if (!this.isSerialConnected()) {
                throw new Error('ยังไม่ได้เชื่อมต่อเครื่องพิมพ์ USB กรุณากดเชื่อมต่อก่อน');
            }

            try {
                const encoder = new TextEncoder();
                const data = encoder.encode(zplString);

                serialWriter = activeSerialPort.writable.getWriter();
                await serialWriter.write(data);
                serialWriter.releaseLock();
                serialWriter = null;

                return { success: true, bytesSent: data.length };
            } catch (err) {
                if (serialWriter) {
                    try { serialWriter.releaseLock(); } catch(e) {}
                    serialWriter = null;
                }
                throw err;
            }
        },

        /**
         * Generate ZPL for Production WIP/FG Tag (4.00" x 2.00" @ 203 DPI)
         */
        generateProductionZpl(d) {
            const partNo = (d.part_no || 'UNKNOWN').substring(0, 30);
            const sapNo = (d.sap_no || '-').substring(0, 20);
            const desc = (d.description || d.part_description || '').replace(/[\^~]/g, '');
            const qty = String(Math.floor(d.quantity || 0));
            const prodDate = d.prod_date || '-';
            const manualLot = (d.manual_lot || '-').substring(0, 20);
            const locName = (d.location_name || d.from_location_name || '-').substring(0, 20);
            const remark = (d.remark || d.notes || '-').substring(0, 25).replace(/[\^~]/g, '');
            const scanId = (d.scan_id_display || `${manualLot}/${d.serial_no || '001'}`).substring(0, 30);

            return `^XA
^PW${this.DOTS_WIDTH}
^LL${this.DOTS_HEIGHT}
^PON
^LH0,0
^FO35,72^A0N,34,30^FD${partNo}^FS
^FO35,110^A0N,24,22^FD${sapNo}^FS
^FO35,136^A0N,20,18^FB480,2,0,L^FD${desc}^FS
^FO35,166^GB480,2,2^FS
^FO35,182^A0N,22,20^FDQTY: ${qty}^FS
^FO300,182^A0N,22,20^FDDate: ${prodDate}^FS
^FO35,214^A0N,22,20^FDLot: ${manualLot}^FS
^FO300,214^A0N,22,20^FDLoc: ${locName}^FS
^FO35,246^A0N,22,20^FDRemark: ${remark}^FS
^FO300,246^A0N,22,20^FDTag: ${scanId}^FS
^FO35,282^BY2,2,48^BCN,48,N,N,N^FD${scanId}^FS
^FO540,96^BQN,2,7^FDMA,${scanId}^FS
^XZ`;
        },

        /**
         * Generate ZPL for Store RM Receiving Tag (4.00" x 2.00" @ 203 DPI)
         */
        generateRmZpl(tag) {
            const itemNo = (tag.item_no || 'UNKNOWN').substring(0, 30);
            const category = (tag.category || 'RAW MATERIAL').substring(0, 30);
            const desc = (tag.part_description || tag.description_ref || '').replace(/[\^~]/g, '');
            const qty = parseFloat(tag.qty_per_pallet || tag.qty || 0).toLocaleString();
            const inv = (tag.warehouse_no || tag.wh || '-').substring(0, 20);
            const po = (tag.po_number || '-').substring(0, 20);
            const pallet = (tag.pallet_no || '-').substring(0, 20);
            const ctn = (tag.ctn_number || '-').substring(0, 20);
            const week = (tag.week_no || '-').substring(0, 20);
            const date = tag.received_date || tag.created_at || '-';
            const remark = (tag.remark || '-').substring(0, 25).replace(/[\^~]/g, '');
            const serialNo = (tag.serial_no || '-').substring(0, 30);

            return `^XA
^PW${this.DOTS_WIDTH}
^LL${this.DOTS_HEIGHT}
^PON
^LH0,0
^FO35,25^A0N,36,30^FD${itemNo}^FS
^FO35,68^A0N,24,20^FD${category}^FS
^FO35,95^A0N,20,18^FB510,2,0,L^FD${desc}^FS
^FO35,140^GB510,2,2^FS
^FO35,150^A0N,22,20^FDQTY:^FS
^FO95,146^A0N,28,26^FD${qty}^FS
^FO300,150^A0N,22,20^FDInv: ${inv}^FS
^FO35,182^A0N,22,20^FDPO: ${po}^FS
^FO300,182^A0N,22,20^FDPallet: ${pallet}^FS
^FO35,214^A0N,22,20^FDCTN: ${ctn}^FS
^FO300,214^A0N,22,20^FDWeek: ${week}^FS
^FO35,246^A0N,22,20^FDDate: ${date}^FS
^FO300,246^A0N,22,20^FDRemark: ${remark}^FS
^FO35,278^BY2,2,40^BCN,40,N,N,N^FD${serialNo}^FS
^FO580,55^BQN,2,6^FDMA,${serialNo}^FS
^FO550,250^A0N,22,20^FB240,1,0,C^FD${serialNo}^FS
^XZ`;
        },

        /**
         * Test sample label print (Either via Web Serial or Chrome Kiosk Silent Print)
         */
        async testPrintSample(type = 'production') {
            const sampleData = {
                part_no: 'PART-XYZ-9999',
                sap_no: '10029384',
                description: 'Cover Plate Aluminum 2.5mm Finished Powder Coated Black',
                quantity: 500,
                prod_date: new Date().toISOString().split('T')[0],
                manual_lot: 'L-' + new Date().toISOString().slice(2,10).replace(/-/g,''),
                location_name: 'LINE-A01',
                remark: 'TEST PRINT OK',
                serial_no: '001',
                scan_id_display: 'L-' + new Date().toISOString().slice(2,10).replace(/-/g,'') + '/001'
            };

            if (this.isSerialConnected()) {
                const zpl = (type === 'rm') ? this.generateRmZpl(sampleData) : this.generateProductionZpl(sampleData);
                return await this.printZplUsb(zpl);
            } else {
                // Fallback to standard window.print()
                if (typeof executeHiddenPrint === 'function') {
                    executeHiddenPrint([sampleData]);
                } else if (typeof renderPrintTags === 'function') {
                    renderPrintTags([{
                        item_no: sampleData.part_no,
                        category: 'PRODUCTION / WIP',
                        part_description: sampleData.description,
                        qty: sampleData.quantity,
                        warehouse_no: sampleData.location_name,
                        po_number: 'PO-TEST',
                        pallet_no: 'PL-001',
                        ctn_number: '1/1',
                        week_no: 'W' + Math.ceil(new Date().getDate() / 7),
                        received_date: sampleData.prod_date,
                        remark: sampleData.remark,
                        serial_no: sampleData.scan_id_display
                    }]);
                    setTimeout(() => window.print(), 300);
                } else {
                    window.print();
                }
                return { success: true, message: 'ส่งคำสั่งพิมพ์ไปยังเบราว์เซอร์แล้ว' };
            }
        }
    };

    window.ThermalPrinter = ThermalPrinter;
})(window);
