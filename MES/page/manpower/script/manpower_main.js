// page/manpower/script/manpower_main.js
"use strict";

const App = {
    // State
    currentDate: null,
    viewMode: 'LINE', // LINE or SHIFT
    autoRefreshTimer: null,

    init() {
        // 1. ตั้งค่าเริ่มต้น
        const dateInput = document.getElementById('filterDate');
        if (dateInput) {
            this.currentDate = dateInput.value;
            // 2. Bind Events
            dateInput.addEventListener('change', (e) => {
                this.currentDate = e.target.value;
                this.loadData();
            });
        } else {
            console.error('Date Input (#filterDate) not found!');
            this.currentDate = new Date().toISOString().split('T')[0];
        }

        // 3. เริ่มโหลดข้อมูลครั้งแรก
        this.loadData();

        // 4. ตั้ง Auto Refresh ทุก 5 นาที (300,000 ms)
        this.startAutoRefresh();
    },

    async loadData() {
        UI.showLoader(); // Optional: ถ้าไม่อยากให้กระพริบก็เอาออกได้
        try {
            // เรียก API
            const data = await API.getSummary(this.currentDate);
            
            // ส่งข้อมูลให้ UI วาด
            if (data) {
                UI.renderKPI(data);
                UI.renderCharts(data);
                UI.renderTable(data, this.viewMode);
            }
        } catch (error) {
            console.error('Load Data Failed:', error);
            // UI.showToast("Load Failed", "danger");
        } finally {
            UI.hideLoader();
        }
    },

    // [UPDATED] ตัด confirm ออก เพราะ Modal ถามไปแล้ว
    async syncNow() {
        UI.showLoader();
        try {
            await API.triggerSync(this.currentDate);
            UI.showToast("✅ Sync Successful!", "success");
            await this.loadData(); // โหลดข้อมูลใหม่หลัง Sync เสร็จ
        } catch (err) {
            console.error(err);
            UI.showToast("❌ Sync Failed!", "danger");
        } finally {
            UI.hideLoader();
        }
    },

    setView(mode) {
        this.viewMode = mode;
        // ปรับปุ่ม Active
        const buttons = document.querySelectorAll('.card-header .btn-group button');
        buttons.forEach(btn => btn.classList.remove('active'));
        if (event && event.target) event.target.classList.add('active');
        
        // Render ตารางใหม่โดยไม่ต้องโหลด API ใหม่ (ใช้ข้อมูลเดิมถ้าเก็บไว้ หรือโหลดใหม่ก็ได้)
        this.loadData(); 
    },

    startAutoRefresh() {
        if (this.autoRefreshTimer) clearInterval(this.autoRefreshTimer);
        this.autoRefreshTimer = setInterval(() => {
            // เช็คว่าเป็นวันปัจจุบันหรือไม่ ถ้าดูย้อนหลังไม่ต้อง Refresh
            const today = new Date().toISOString().split('T')[0];
            const dateInput = document.getElementById('filterDate');
            const selectedDate = dateInput ? dateInput.value : this.currentDate;

            if (selectedDate === today) {
                console.log("Auto refreshing data...");
                this.loadData();
            }
        }, 300000); // 5 นาที
    },

    async resetDailyData() {
        const targetDate = document.getElementById('filterDate').value;
        
        if (!confirm(`⚠️ คำเตือน: คุณต้องการ "ล้างข้อมูล" และ "ดึงใหม่" ของวันที่ [${targetDate}] ใช่หรือไม่?\n\nข้อมูลการแก้ไข Manual (Remark/Status) จะหายไปทั้งหมด!`)) {
            return;
        }

        UI.showLoader(); // โชว์ Loading

        try {
            // Step 1: สั่งลบข้อมูลเก่า
            console.log("1. Clearing data...");
            const clearRes = await API.clearDailyLog(targetDate);
            
            if (!clearRes.success) {
                throw new Error("Clear Failed: " + clearRes.message);
            }

            // Step 2: สั่ง Sync ใหม่ (Logic เดียวกับ syncNow)
            console.log("2. Syncing new data...");
            // ส่ง date ไปทั้ง start และ end เพื่อ sync แค่วันเดียว
            await API.triggerSync(targetDate); 

            UI.showToast(`✅ รีเซ็ตข้อมูลวันที่ ${targetDate} เรียบร้อยแล้ว`, "success");
            
            // Step 3: โหลดหน้าจอใหม่
            await this.loadData();

        } catch (err) {
            console.error(err);
            UI.showToast("❌ เกิดข้อผิดพลาด: " + err.message, "danger");
        } finally {
            UI.hideLoader(); // ปิด Loading
        }
    }
};

// เริ่มต้นแอพเมื่อโหลดหน้าเว็บเสร็จ
document.addEventListener('DOMContentLoaded', () => {
    // 1. โหลด Dropdown ก่อน (สำคัญมาก เพื่อให้ Modal มีข้อมูลพร้อมใช้)
    Actions.initDropdowns(); 
    
    // 2. เริ่ม App
    App.init();
});