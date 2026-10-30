/**
 * Initialize theme from localStorage or system preference.
 * Should be called on app startup.
 */
export function initTheme() {
  const saved = localStorage.getItem('theme');
  
  if (saved === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (saved === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    // Follow system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

/**
 * Toggles the theme between dark and light, saving the choice to localStorage.
 * @returns {boolean} True if new theme is dark, false if light.
 */
export function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  
  if (isDark) {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
    return false;
  } else {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    return true;
  }
}

/**
 * Check if the current active theme is dark.
 * @returns {boolean} True if dark mode is active.
 */
export function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}
