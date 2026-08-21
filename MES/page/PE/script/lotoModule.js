// MES/page/PE/script/lotoModule.js

const LotoModule = (function () {
    const API_URL = 'api/lotoAPI.php';
    let currentMachineId = null;
    let currentWoId = null;

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
        
        $('#lotoFrmMachineId').val(machineId);
        $('#lotoFrmWoId').val(woId || '');
        
        try {
            Swal.showLoading();
            const response = await fetch(`${API_URL}?action=status&machine_id=${machineId}`);
            const result = await response.json();
            Swal.close();

            if (result.success && result.data && result.data.is_loto) {
                // Machine is locked - Show Unlock UI
                $('#lotoLockSection').hide();
                $('#lotoUnlockSection').show();
                
                $('#lotoLblLockedBy').text(result.data.locked_by || '-');
                $('#lotoLblLockedAt').text(result.data.locked_at ? new Date(result.data.locked_at).toLocaleString('th-TH') : '-');
                $('#lotoLblReason').text(result.data.loto_reason || '-');
                $('#lotoFrmUnlockedBy').val('');
            } else {
                // Machine is unlocked - Show Lock UI
                $('#lotoUnlockSection').hide();
                $('#lotoLockSection').show();
                $('#lotoFrmReason').val('');
            }
            
            $('#lotoModal').modal('show');
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด', text: 'ไม่สามารถดึงข้อมูลสถานะ LOTO ได้' });
            console.error(error);
        }
    }

    /**
     * Applies LOTO to the machine
     */
    async function applyLoto() {
        const lockedBy = $('#lotoFrmLockedBy').val().trim();
        const reason = $('#lotoFrmReason').val().trim();

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
                $('#lotoModal').modal('hide');
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
        const unlockedBy = $('#lotoFrmUnlockedBy').val().trim();

        if (!unlockedBy) {
            Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณาระบุชื่อผู้ยืนยันการปลดล็อก' });
            return;
        }

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'unlock',
                    machine_id: currentMachineId,
                    unlocked_by: unlockedBy
                })
            });
            const result = await response.json();

            if (result.success) {
                $('#lotoModal').modal('hide');
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
