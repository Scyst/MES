// page/manpower/script/manpower_api.js
"use strict";

const API = {
    // แก้ไข: ชี้ไปที่ read_summary เพื่อเอาข้อมูลตัวเลขสรุปมาทำกราฟ
    URL_GET_SUMMARY: 'api/api_daily_operations.php?action=read_summary',
    URL_SYNC: 'api/sync_from_api.php', 

    async getSummary(dateString) {
        try {
            // อันนี้ใช้ & ถูกแล้ว เพราะ URL_GET_SUMMARY มี ?action=... อยู่แล้ว
            const response = await fetch(`${this.URL_GET_SUMMARY}&date=${dateString}`);
            if (!response.ok) throw new Error("Network response was not ok");
            
            const json = await response.json();
            
            // [FIX] แกะข้อมูลจาก key "raw_data" ตามที่ PHP ส่งมา
            if (json.success && Array.isArray(json.raw_data)) {
                return json.raw_data;
            } else {
                console.warn("API format mismatch:", json);
                return [];
            }

        } catch (error) {
            console.error("API Error:", error);
            return [];
        }
    },

    async triggerSync(dateString) {
        try {
            // ✅ แก้ไข: เปลี่ยน & เป็น ? เพราะ URL_SYNC ยังไม่มี Parameter ตัวแรก
            const response = await fetch(`${this.URL_SYNC}?startDate=${dateString}&endDate=${dateString}`);
            
            if (!response.ok) {
                // อ่าน Error เป็น Text ก่อนเผื่อไม่ใช่ JSON (เช่น 404 HTML)
                const text = await response.text();
                throw new Error(`Server Error: ${response.status} - ${text.substring(0, 100)}`);
            }

            return JSON.parse(await response.text()); // ใช้ JSON.parse เพื่อความชัวร์
        } catch (error) {
            console.error("Sync Error:", error);
            throw error;
        }
    },

    async getDailyLog(date, line) {
        // เรียก Action: read_daily
        const url = `api/api_daily_operations.php?action=read_daily&date=${date}&line=${encodeURIComponent(line)}`;
        const res = await fetch(url);
        const json = await res.json();
        return json.success ? json.data : [];
    },

    async updateLog(payload) {
        // เรียก Action: update_log (POST)
        const res = await fetch('api/api_daily_operations.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await res.json();
    }
};