// e:\MES\MES\MES\page\PE\script\quick_hazard.js
document.addEventListener('DOMContentLoaded', () => {
    const cameraBtn = document.getElementById('cameraBtn');
    const cameraInput = document.getElementById('cameraInput');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const removeImgBtn = document.getElementById('removeImgBtn');
    const imageBase64 = document.getElementById('imageBase64');
    const hazardForm = document.getElementById('hazardForm');

    // Trigger file input when clicking the nice button
    cameraBtn.addEventListener('click', () => {
        cameraInput.click();
    });

    // Handle image selection
    cameraInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Compress image using Canvas
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const max_size = 1200; // max width/height

                if (width > height) {
                    if (width > max_size) {
                        height *= max_size / width;
                        width = max_size;
                    }
                } else {
                    if (height > max_size) {
                        width *= max_size / height;
                        height = max_size;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                
                imagePreview.src = dataUrl;
                imageBase64.value = dataUrl;
                
                cameraBtn.style.display = 'none';
                previewContainer.style.display = 'block';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // Remove image
    removeImgBtn.addEventListener('click', () => {
        cameraInput.value = '';
        imageBase64.value = '';
        imagePreview.src = '';
        previewContainer.style.display = 'none';
        cameraBtn.style.display = 'block';
    });

    // Form Submission
    hazardForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!imageBase64.value) {
            Swal.fire({
                icon: 'warning',
                title: 'กรุณาถ่ายรูป',
                text: 'การแจ้งเหตุฉุกเฉินจำเป็นต้องมีรูปถ่ายเพื่อประเมินสถานการณ์เบื้องต้น',
                confirmButtonColor: '#dc3545'
            });
            return;
        }

        Swal.fire({
            title: 'กำลังส่งข้อมูล...',
            text: 'กรุณารอสักครู่',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const formData = new FormData(hazardForm);

        try {
            const response = await fetch('api/publicHazardAPI.php', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'ส่งข้อมูลสำเร็จ!',
                    text: `ระบบได้รับแจ้งปัญหาของคุณแล้ว (รหัส: ${result.wo_number}) ทีมงานกำลังเร่งดำเนินการ`,
                    confirmButtonColor: '#198754',
                    confirmButtonText: 'รับทราบ'
                }).then(() => {
                    // Reset form but keep machine code if it was prefilled
                    const machineCode = document.getElementById('machineCode').value;
                    const isReadonly = document.getElementById('machineCode').hasAttribute('readonly');
                    hazardForm.reset();
                    removeImgBtn.click();
                    if (isReadonly) {
                        document.getElementById('machineCode').value = machineCode;
                    }
                });
            } else {
                Swal.fire('เกิดข้อผิดพลาด', result.message || 'ไม่สามารถส่งข้อมูลได้', 'error');
            }
        } catch (error) {
            console.error('Error submitting hazard report:', error);
            Swal.fire('การเชื่อมต่อล้มเหลว', 'กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง', 'error');
        }
    });
});
