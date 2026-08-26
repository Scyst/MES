// MES/page/PE/script/lotoModule.js

const LotoModule = (function () {
    const API_URL = 'api/lotoAPI.php';
    let currentMachineId = null;
    let currentWoId = null;
    let lotoModalInstance = null;

    function getModalInstance() {
        const modalEl = document.getElementById('lotoModal');
        if (!modalEl) return null;
        if (!lotoModalInstance) {
            lotoModalInstance = new bootstrap.Modal(modalEl);
        }
        return lotoModalInstance;
    }

    /**
     * Opens the LOTO modal.
     * Checks the current LOTO status and displays either the Lock or Unlock UI.
     */
    async function openLotoModal(machineId, woId = null) {
        if (!machineId) {
            Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด', text: 'ไม่พบ Machine ID' });
            return;
        }

        currentMachineId = machineId;
        currentWoId = woId;
        
        document.getElementById('lotoFrmMachineId').value = machineId;
        document.getElementById('lotoFrmWoId').value = woId || '';
        
        try {
            Swal.showLoading();
            const response = await fetch(\?action=status&machine_id=\);
            const result = await response.json();
            Swal.close();

            if (result.success && result.data && (result.data.is_loto == 1 || result.data.is_loto === true)) {
                // Machine is locked - Show Unlock UI
                document.getElementById('lotoLockSection').style.display = 'none';
                document.getElementById('lotoUnlockSection').style.display = 'block';
                
                document.getElementById('lotoLblLockedBy').textContent = result.data.locked_by || '-';
                document.getElementById('lotoLblLockedAt').textContent = result.data.locked_at ? new Date(result.data.locked_at).toLocaleString('th-TH') : '-';
                document.getElementById('lotoLblReason').textContent = result.data.loto_reason || '-';
                document.getElementById('lotoFrmUnlockedBy').value = '';
                document.getElementById('lotoFrmUnlockedPin').value = '';
            } else {
                // Machine is unlocked - Show Lock UI
                document.getElementById('lotoUnlockSection').style.display = 'none';
                document.getElementById('lotoLockSection').style.display = 'block';
                document.getElementById('lotoFrmReason').value = '';
            }
            
            const modal = getModalInstance();
            if (modal) modal.show();
            
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด', text: 'ไม่สามารถดึงข้อมูลสถานะ LOTO ได้' });
            console.error(error);
        }
    }

    /**
     * Applies LOTO to the machine
     */
    async function applyLoto() {
        const lockedBy = document.getElementById('lotoFrmLockedBy').value.trim();
        const reason = document.getElementById('lotoFrmReason').value.trim();

        if (!lockedBy) {
            Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณาระบุชื่อผู้ทำการล็อก' });
            return;
        }

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'lock',
                    machine_id: currentMachineId,
                    wo_id: currentWoId,
                    locked_by: lockedBy,
                    reason: reason
                })
            });
            const result = await response.json();

            if (result.success) {
                const modal = getModalInstance();
                if (modal) modal.hide();
                Swal.fire({ icon: 'success', title: 'สำเร็จ', text: result.message, timer: 1500, showConfirmButton: false });
                
                // Refresh relevant UI
                if (typeof WorkOrderModule !== 'undefined' && typeof WorkOrderModule.loadData === 'function') {
                    WorkOrderModule.loadData();
                }
                if (typeof MachineModule !== 'undefined' && typeof MachineModule.loadMachines === 'function') {
                    MachineModule.loadMachines();
                }
                if (typeof VisualBoardModule !== 'undefined' && typeof VisualBoardModule.loadBoard === 'function') {
                    VisualBoardModule.loadBoard();
                }
            } else {
                Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด', text: result.message });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด', text: 'ไม่สามารถล็อกเครื่องจักรได้' });
            console.error(error);
        }
    }

    /**
     * Removes LOTO from the machine
     */
    async function removeLoto() {
        const unlockedBy = document.getElementById('lotoFrmUnlockedBy').value.trim();
        const unlockedPin = document.getElementById('lotoFrmUnlockedPin').value.trim();

        if (!unlockedBy || !unlockedPin) {
            Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณาระบุชื่อผู้ยืนยันการปลดล็อก และรหัสผ่าน' });
            return;
        }

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'unlock',
                    machine_id: currentMachineId,
                    unlocked_by: unlockedBy,
                    unlocked_pin: unlockedPin
                })
            });
            const result = await response.json();

            if (result.success) {
                const modal = getModalInstance();
                if (modal) modal.hide();
                Swal.fire({ icon: 'success', title: 'สำเร็จ', text: result.message, timer: 1500, showConfirmButton: false });
                
                // Refresh relevant UI
                if (typeof WorkOrderModule !== 'undefined' && typeof WorkOrderModule.loadData === 'function') {
                    WorkOrderModule.loadData();
                }
                if (typeof MachineModule !== 'undefined' && typeof MachineModule.loadMachines === 'function') {
                    MachineModule.loadMachines();
                }
                if (typeof VisualBoardModule !== 'undefined' && typeof VisualBoardModule.loadBoard === 'function') {
                    VisualBoardModule.loadBoard();
                }
            } else {
                Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด', text: result.message });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด', text: 'ไม่สามารถปลดล็อกเครื่องจักรได้' });
            console.error(error);
        }
    }

    return {
        openLotoModal,
        applyLoto,
        removeLoto
    };
})();
window.LotoModule = LotoModule;
