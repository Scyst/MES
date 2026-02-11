// page/manpower/script/manpower_main.js
"use strict";

const App = {
    currentDate: null,
    viewMode: 'LINE', // LINE or SHIFT
    autoRefreshTimer: null,
    
    // ✅ [NEW] ตัวแปรเก็บสถานะสูตร (false=Standard, true=Simulation)
    useNewFormula: false,

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

        // ✅ [NEW] ผูกปุ่ม Toggle สูตรคำนวณ (ถ้ามีใน HTML)
        const toggleBtn = document.getElementById('btnFormulaToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleFormula());
        }

        this.loadData();
        this.loadTrend(7);
        this.startAutoRefresh();

        if (typeof startLiveClock === 'function') {
            startLiveClock();
        }
    },

    // ✅ [NEW] ฟังก์ชันสลับสูตร
    toggleFormula() {
        this.useNewFormula = !this.useNewFormula; // สลับสถานะ
        
        // อัปเดตหน้าตาปุ่มเพื่อให้รู้ว่าอยู่โหมดไหน
        const btn = document.getElementById('btnFormulaToggle');
        if (btn) {
            if (this.useNewFormula) {
                // โหมดใหม่ (Simulation): สีส้ม/แดง
                btn.className = 'btn btn-warning btn-sm shadow-sm fw-bold transition-btn text-dark';
                btn.innerHTML = '<i class="fas fa-flask me-2"></i>New Logic (Sim)';
            } else {
                // โหมดเดิม (Standard): สีขาว/เทา
                btn.className = 'btn btn-white border text-secondary btn-sm shadow-sm fw-bold transition-btn';
                btn.innerHTML = '<i class="fas fa-calculator me-2"></i>Standard Cost';
            }
        }

        // โหลดข้อมูลใหม่ทันทีด้วยสูตรที่เลือก
        this.loadData(); 
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
        // Logic เดิมของคุณสำหรับการเปลี่ยน Active Class ปุ่ม View
        const buttons = document.querySelectorAll('.card-header .btn-group button');
        buttons.forEach(btn => btn.classList.remove('active'));
        if (typeof event !== 'undefined' && event && event.target) {
            event.target.classList.add('active');
        }
        
        // โหลดข้อมูลใหม่ (หรือจะแค่ Re-render ก็ได้ถ้า Cache ไว้ แต่โหลดใหม่ชัวร์สุด)
        this.loadData(true); 
    },

    startAutoRefresh() {
        if (this.autoRefreshTimer) clearInterval(this.autoRefreshTimer);
        
        const REFRESH_INTERVAL = 600000; // 10 นาที

        console.log(`[System] Auto-refresh started: Every ${REFRESH_INTERVAL/60000} minutes.`);

        this.autoRefreshTimer = setInterval(() => {
            // เช็คว่าเปิด Modal ค้างไว้ไหม ถ้าเปิดอยู่ไม่ควร Refresh เดี๋ยวงานหาย
            const isModalOpen = document.getElementById('detailModal')?.classList.contains('show');
            const isEmpModalOpen = document.getElementById('empListModal')?.classList.contains('show');
            const isEditModalOpen = document.getElementById('empEditModal')?.classList.contains('show');
            
            if (isModalOpen || isEmpModalOpen || isEditModalOpen) {
                console.log("[Auto-refresh] Skipped (User is working in modal)");
                return; 
            }

            console.log("[Auto-refresh] Updating data...");
            this.loadData(true); // Silent Load

            // Refresh Trend Chart
            const activeBtn = document.querySelector('#view-chart-trend .btn-group button.active');
            let days = 7;
            if (activeBtn) {
                const txt = activeBtn.innerText;
                days = parseInt(txt) || 7;
            }
            this.loadTrend(days);

        }, REFRESH_INTERVAL);
    },

    async loadData(isSilent = false) {
        if (!isSilent) UI.showLoader(); 
        
        try {
            // ✅ [MODIFIED] ส่ง this.useNewFormula ไปด้วย เพื่อบอก API ว่าจะเอาสูตรไหน
            const data = await API.getSummary(this.currentDate, this.useNewFormula);
            
            if (data) {
                UI.renderKPI(data);
                UI.renderCharts(data);
                
                // ถ้า User ไม่ได้เปิด Modal ดูรายละเอียดอยู่ ก็ให้อัปเดตตารางหลัก
                const isModalOpen = document.getElementById('detailModal')?.classList.contains('show');
                if (!isModalOpen) {
                    UI.renderTable(data, this.viewMode);
                }
            }
        } catch (err) {
            console.error(err);
            // UI.showToast("Failed to load data", "danger"); // เปิดบรรทัดนี้ถ้าอยากให้แจ้งเตือน
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
            const btn = event.target.closest('button');
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

// 🔥 ฟังก์ชันนาฬิกา
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
    // 1. โหลด Dropdown ก่อน (สำคัญสำหรับ UI.openDetailModal ในภายหลัง)
    if (typeof Actions !== 'undefined' && Actions.initDropdowns) {
        Actions.initDropdowns(); 
    }
    
    // 2. เริ่ม App
    App.init();
});