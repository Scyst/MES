"use strict";

/**
 * Sends an asynchronous request to the specified endpoint.
 * Handles CSRF token and JSON body automatically.
 * Shows error messages via showToast on failure.
 * Assumes showToast function is available globally.
 *
 * @param {string} endpoint The API endpoint URL (e.g., 'api/locationsManage.php').
 * @param {string} action The action parameter for the API.
 * @param {'GET'|'POST'|'PUT'|'DELETE'} method The HTTP method.
 * @param {object|null} body The request body (for POST/PUT). Will be JSON.stringify-ed.
 * @param {object|null} params URL parameters (key-value pairs). Filters out null/empty values.
 * @returns {Promise<object>} A promise that resolves with the JSON response from the server ({success: boolean, ...}). Returns a standard error object on failure.
 */
window.sendRequest = async function sendRequest(endpoint, action, method, body = null, params = null) {
    try {
        let url = `${endpoint}?action=${action}`;
        if (params) {
            // Filter out null or empty string parameters before appending
            const filteredParams = Object.entries(params)
                                    .filter(([key, value]) => value !== null && value !== '')
                                    .reduce((obj, [key, value]) => {
                                        obj[key] = value;
                                        return obj;
                                    }, {});
            if (Object.keys(filteredParams).length > 0) {
                 url += `&${new URLSearchParams(filteredParams).toString()}`;
            }
        }

        // Get CSRF token from meta tag
        const csrfTokenMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfTokenMeta ? csrfTokenMeta.getAttribute('content') : null;

        const options = {
            method: method.toUpperCase(),
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        };

        // Add CSRF token for non-GET requests
        if (options.method !== 'GET' && csrfToken) {
            options.headers['X-CSRF-TOKEN'] = csrfToken;
        }

        // Add body for relevant methods
        if (body && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH')) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        // Try to parse JSON regardless of status, but prioritize error message if response not ok
        const result = await response.json().catch(() => ({})); // Default to empty object on JSON parse error

        if (response.status === 401 || result.is_expired === true || (response.redirected && response.url && response.url.includes('login_form.php'))) {
            if (typeof window.__mesTriggerSessionLogout === 'function') {
                window.__mesTriggerSessionLogout();
            }
            const authErr = new Error(result.message || 'Session expired');
            authErr.isSessionExpired = true;
            throw authErr;
        }

        if (!response.ok) {
            // Use message from JSON if available, otherwise use status text or default
            const errorMessage = result.message || response.statusText || `HTTP error! status: ${response.status}`;
            throw new Error(errorMessage);
        }

        // Ensure 'success' property exists, default to false if not present
        if (typeof result.success === 'undefined') {
            // Consider logging this case, as APIs should ideally always return a 'success' status
            console.warn(`API action '${action}' response missing 'success' property. Assuming failure.`);
            result.success = false; // Assume failure if 'success' is missing
        }

        return result;

    } catch (error) {
        if (window.__mesSessionRedirecting || (error && error.isSessionExpired)) {
            return { success: false, is_expired: true, message: 'Session expired' };
        }
        const msg = (error && error.message) ? error.message : String(error || 'An unexpected network or server error occurred.');
        console.error(`Request for action '${action}' to endpoint '${endpoint}' failed:`, error);
        // Ensure showToast exists before calling it (it should come from toast.js included in common_head)
        if (typeof showToast === 'function') {
             showToast(`Error: ${msg}`, 'var(--bs-danger)');
        } else {
             alert(`Error: ${msg}`); // Fallback alert
        }
        // Return a standard error structure
        return { success: false, message: msg };
    }
}