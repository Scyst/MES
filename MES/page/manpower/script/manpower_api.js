// page/manpower/script/manpower_api.js
"use strict";

const API = {
    // แก้ไข: ชี้ไปที่ read_summary เพื่อเอาข้อมูลตัวเลขสรุปมาทำกราฟ
    URL_GET_SUMMARY: 'api/api_daily_operations.php?action=read_summary',
    URL_SYNC: 'api/sync_from_api.php', 

    async getSummary(dateString, useNewFormula = false) {
        try {
            // ส่งค่าไปที่ API (&use_new_formula=true/false)
            const response = await fetch(`${this.URL_GET_SUMMARY}&date=${dateString}&use_new_formula=${useNewFormula}`);
            if (!response.ok) throw new Error("Network response was not ok");
            
            const json = await response.json();
            
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

    async getTrend(days = 7) {
        try {
            // คำนวณวันที่ Start/End ใน JS
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - (days - 1)); // ย้อนหลัง X วันรวมวันนี้
            
            const sStr = start.toISOString().split('T')[0];
            const eStr = end.toISOString().split('T')[0];

            const response = await fetch(`api/api_daily_operations.php?action=read_trend&startDate=${sStr}&endDate=${eStr}`);
            const json = await response.json();
            return json.success ? json.data : [];
        } catch (error) {
            console.error("Trend API Error:", error);
            return [];
        }
    },

    async triggerSync(dateString) {
        try {
            const secretKey = "SNC_TOOLBOX_SECURE_KEY_998877";
            const response = await fetch(`${this.URL_SYNC}?startDate=${dateString}&endDate=${dateString}&secret_key=${secretKey}`);
            
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Server Error: ${response.status} - ${text.substring(0, 100)}`);
            }

            return JSON.parse(await response.text());
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
    },
    async clearDailyLog(date) {
        try {
            const response = await fetch('api/api_daily_operations.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'clear_day',
                    date: date,
                    line: 'ALL' // ลบทุกไลน์ของวันนั้น
                })
            });
            return await response.json();
        } catch (error) {
            console.error("Clear Data Error:", error);
            throw error;
        }
    }
};