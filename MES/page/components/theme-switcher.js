// script/theme-switcher.js
(() => {
    'use strict'

    const getStoredTheme = () => localStorage.getItem('theme')
    const setStoredTheme = theme => localStorage.setItem('theme', theme)

    const getPreferredTheme = () => {
        const storedTheme = getStoredTheme()
        if (storedTheme) {
            return storedTheme
        }
        // ตรวจสอบธีมของอุปกรณ์
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    const setTheme = theme => {
        if (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-bs-theme', 'dark')
        } else {
            document.documentElement.setAttribute('data-bs-theme', theme)
        }
    }

    setTheme(getPreferredTheme())

    window.addEventListener('DOMContentLoaded', () => {
        const themeSwitcher = document.getElementById('theme-switcher-btn')

        if (themeSwitcher) {
            themeSwitcher.addEventListener('click', () => {
                const currentTheme = getStoredTheme() || getPreferredTheme()
                const newTheme = currentTheme === 'light' ? 'dark' : 'light'
                setStoredTheme(newTheme)
                setTheme(newTheme)
            })
        }
    })
})()