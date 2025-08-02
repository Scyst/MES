"use strict";

const API_ENDPOINT = 'api/locationsManage.php';
let currentEditingLocation = null;

/**
 * ฟังก์ชันกลางสำหรับส่ง Request ไปยัง API
 */
async function sendRequest(action, method, body = null) {
    try {
        const url = `${API_ENDPOINT}?action=${action}`;
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        
        const options = { method, headers: {} };
        if (method.toUpperCase() !== 'GET' && csrfToken) {
            options.headers['X-CSRF-TOKEN'] = csrfToken;
        }
        if (body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }
        return result;
    } catch (error) {
        console.error(`Request for action '${action}' failed:`, error);
        showToast(error.message || 'An unexpected error occurred.', 'var(--bs-danger)');
        return { success: false, message: "Network or server error." };
    }
}

/**
 * โหลดข้อมูล Locations และแสดงผลในตาราง
 */
async function loadLocations() {
    showSpinner();
    try {
        const result = await sendRequest('get_locations', 'GET');
        const tbody = document.getElementById('locationsTableBody');
        tbody.innerHTML = '';

        if (result.success && result.data.length > 0) {
            result.data.forEach(location => {
                const tr = document.createElement('tr');
                tr.style.cursor = 'pointer';
                tr.title = 'Click to edit';
                
                // vvvvvv START: แก้ไขโค้ดบรรทัดนี้ vvvvvv
                tr.innerHTML = `
                    <td>${location.location_name}</td>
                    <td>${location.location_description || ''}</td>
                    <td class="text-center">
                        <span class="badge ${location.is_active == 1 ? 'bg-success' : 'bg-secondary'}">
                            ${location.is_active == 1 ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                `;
                // ^^^^^^ END: แก้ไขโค้ดบรรทัดนี้ ^^^^^^

                tr.addEventListener('click', () => openLocationModal(location));
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center">No locations found. Click "Add New Location" to start.</td></tr>';
        }
    } finally {
        hideSpinner();
    }
}

/**
 * เปิด Modal สำหรับเพิ่ม/แก้ไข Location
 */
function openLocationModal(location = null) {
    currentEditingLocation = location;
    const form = document.getElementById('locationForm');
    const modalLabel = document.getElementById('locationModalLabel');
    const deleteBtn = document.getElementById('deleteLocationBtn');
    
    form.reset();
    
    if (location) {
        modalLabel.textContent = 'Edit Location';
        document.getElementById('location_id').value = location.location_id;
        document.getElementById('location_name').value = location.location_name;
        document.getElementById('location_description').value = location.location_description;
        document.getElementById('is_active').checked = location.is_active == 1; // ** แก้ไขตรงนี้ด้วย **
        deleteBtn.classList.remove('d-none');
    } else {
        modalLabel.textContent = 'Add New Location';
        document.getElementById('location_id').value = '0';
        document.getElementById('is_active').checked = true;
        deleteBtn.classList.add('d-none');
    }

    const modal = new bootstrap.Modal(document.getElementById('locationModal'));
    modal.show();
}

/**
 * จัดการการ Submit ฟอร์ม
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    data.is_active = document.getElementById('is_active').checked;

    showSpinner();
    try {
        const result = await sendRequest('save_location', 'POST', data);
        showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('locationModal')).hide();
            await loadLocations();
        }
    } finally {
        hideSpinner();
    }
}

/**
 * จัดการการลบ Location
 */
async function deleteLocation() {
    if (!currentEditingLocation) return;
    
    if (confirm(`Are you sure you want to delete the location "${currentEditingLocation.location_name}"? This action cannot be undone.`)) {
        showSpinner();
        try {
            const result = await sendRequest('delete_location', 'POST', { location_id: currentEditingLocation.location_id });
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) {
                bootstrap.Modal.getInstance(document.getElementById('locationModal')).hide();
                await loadLocations();
            }
        } finally {
            hideSpinner();
        }
    }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    loadLocations();

    document.getElementById('addLocationBtn').addEventListener('click', () => openLocationModal());
    document.getElementById('locationForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('deleteLocationBtn').addEventListener('click', deleteLocation);
});