// script/theme-switcher.js
(() => {
    'use strict'

    // --- ส่วนจัดการ Storage (เก็บไว้เหมือนเดิม แต่ยังไม่เรียกใช้) ---
    const getStoredTheme = () => localStorage.getItem('theme')
    const setStoredTheme = theme => localStorage.setItem('theme', theme)

    // --- ส่วนตรวจสอบ Theme (แก้: บังคับ return 'light' เสมอ) ---
    const getPreferredTheme = () => {
        // [TEMP] ปิดการเช็คค่าเดิมและ System Preference ชั่วคราว
        /*
        const storedTheme = getStoredTheme()
        if (storedTheme) {
            return storedTheme
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        */
       
        // [TEMP] บังคับเป็น Light Mode เท่านั้น
        return 'light'
    }

    const setTheme = theme => {
        if (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-bs-theme', 'dark')
        } else {
            document.documentElement.setAttribute('data-bs-theme', theme)
        }
    }

    // เรียกใช้งานทันที (จะได้ผลเป็น Light เสมอ)
    setTheme(getPreferredTheme())

    window.addEventListener('DOMContentLoaded', () => {
        const themeSwitcher = document.getElementById('theme-switcher-btn')

        if (themeSwitcher) {
            // [TEMP] ซ่อนปุ่มไม่ให้ user เห็น (ไม่ต้องไปลบ html)
            themeSwitcher.style.display = 'none';

            // [TEMP] ปิด Event Listener ชั่วคราว
            /*
            themeSwitcher.addEventListener('click', () => {
                const currentTheme = getStoredTheme() || getPreferredTheme()
                const newTheme = currentTheme === 'light' ? 'dark' : 'light'
                setStoredTheme(newTheme)
                setTheme(newTheme)
            })
            */
        }
    })
})()