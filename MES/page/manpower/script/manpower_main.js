// page/manpower/script/manpower_main.js
"use strict";

const App = {
    currentDate: null,
    viewMode: 'LINE', // LINE or SHIFT
    autoRefreshTimer: null,

    init() {
        const dateInput = document.getElementById('filterDate');
        if (dateInput) {
            this.currentDate = dateInput.value;
            dateInput.addEventListener('change', (e) => {
                this.currentDate = e.target.value;
                this.loadData();
            });
        } else {
            console.error('Date Input (#filterDate) not found!');
            this.currentDate = new Date().toISOString().split('T')[0];
        }

        this.loadData();
        this.loadTrend(7);
        this.startAutoRefresh();

        if (typeof startLiveClock === 'function') {
            startLiveClock();
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
            // 🔥 [FIXED] เช็คก่อนว่า User กำลังเปิด Modal ทำงานอยู่ไหม?
            const isModalOpen = document.getElementById('detailModal')?.classList.contains('show');
            const isEmpModalOpen = document.getElementById('empListModal')?.classList.contains('show');
            
            // ถ้ามี Modal เปิดอยู่ "ห้าม Refresh" เดี๋ยวงาน User หาย
            if (isModalOpen || isEmpModalOpen) {
                console.log("Auto-refresh skipped (User is working)");
                return; 
            }

            // ถ้าไม่มีใครทำงาน ค่อยโหลดแบบ Silent
            this.loadData(true); 

        }, 300000); // 5 นาที (300,000 ms)
    },

    // ปรับปรุง loadData ให้รองรับ Silent Mode (ไม่ขึ้น Loading บังหน้าจอ)
    async loadData(isSilent = false) {
        // ถ้าไม่ใช่ Silent (เช่น กดเปลี่ยนวันที่เอง) ให้โชว์ Loader
        if (!isSilent) UI.showLoader(); 
        
        try {
            const data = await API.getSummary(this.currentDate);
            
            if (data) {
                UI.renderKPI(data);
                UI.renderCharts(data);
                
                // ถ้าเป็น Silent Mode และ User ไม่ได้เปิด Modal ค่อยอัปเดตตารางหลัก
                const isModalOpen = document.getElementById('detailModal')?.classList.contains('show');
                if (!isModalOpen) {
                    UI.renderTable(data, this.viewMode);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            if (!isSilent) UI.hideLoader();
        }
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
    },

    async loadTrend(days = 7) {
        if (typeof event !== 'undefined' && event && event.type === 'click' && event.target && event.target.classList) {
            
            // หาปุ่มพี่น้องใน Group เดียวกันเพื่อเอา active ออก
            const btn = event.target.closest('button'); // กันพลาดกรณีกดโดน icon ข้างใน
            if (btn) {
                const parent = btn.parentElement;
                if (parent) {
                    parent.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                }
                btn.classList.add('active');
            }
        }

        // ดึงข้อมูลและเรนเดอร์กราฟตามปกติ
        const data = await API.getTrend(days);
        UI.renderTrendChart(data);
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