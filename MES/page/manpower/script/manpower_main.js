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

        // 5. 🔥 เริ่มนาฬิกา Live Clock (เรียกจาก UI หรือฟังก์ชัน global)
        if (typeof startLiveClock === 'function') {
            startLiveClock();
        }
    },

    async loadData() {
        UI.showLoader(); 
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
        } finally {
            UI.hideLoader();
        }
    },

    async syncNow() {
        UI.showLoader();
        try {
            await API.triggerSync(this.currentDate);
            UI.showToast("✅ Sync Successful!", "success");
            await this.loadData(); 
        } catch (err) {
            console.error(err);
            UI.showToast("❌ Sync Failed!", "danger");
        } finally {
            UI.hideLoader();
        }
    },

    setView(mode) {
        this.viewMode = mode;
        const buttons = document.querySelectorAll('.card-header .btn-group button');
        buttons.forEach(btn => btn.classList.remove('active'));
        if (event && event.target) event.target.classList.add('active');
        this.loadData(); 
    },

    startAutoRefresh() {
        if (this.autoRefreshTimer) clearInterval(this.autoRefreshTimer);
        this.autoRefreshTimer = setInterval(() => {
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

        UI.showLoader(); 
        try {
            console.log("1. Clearing data...");
            const clearRes = await API.clearDailyLog(targetDate);
            if (!clearRes.success) throw new Error("Clear Failed: " + clearRes.message);

            console.log("2. Syncing new data...");
            await API.triggerSync(targetDate); 

            UI.showToast(`✅ รีเซ็ตข้อมูลวันที่ ${targetDate} เรียบร้อยแล้ว`, "success");
            await this.loadData();
        } catch (err) {
            console.error(err);
            UI.showToast("❌ เกิดข้อผิดพลาด: " + err.message, "danger");
        } finally {
            UI.hideLoader();
        }
    }
};

// 🔥 ฟังก์ชันนาฬิกา (ย้ายมาไว้ที่นี่ หรือเอาไว้ท้าย manpower_ui.js แต่ไม่ต้องสั่งทำงานเอง)
function startLiveClock() {
    const clockElement = document.getElementById('live-clock');
    if (!clockElement) return;
    
    function update() {
        const now = new Date();
        clockElement.innerText = now.toLocaleTimeString('th-TH', { hour12: false });
    }
    update(); 
    setInterval(update, 1000); 
}

// เริ่มต้นแอพเมื่อโหลดหน้าเว็บเสร็จ
document.addEventListener('DOMContentLoaded', () => {
    // 1. โหลด Dropdown ก่อน
    Actions.initDropdowns(); 
    
    // 2. เริ่ม App (รวมถึงเริ่มนาฬิกาข้างใน App.init แล้ว)
    App.init();
});