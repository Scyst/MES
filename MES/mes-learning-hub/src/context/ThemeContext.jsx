import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {}
});

const THEME_STORAGE_KEY = 'mes_learning_theme';

export function ThemeProvider({ children }) {
  // Initialize theme from localStorage, default to 'dark' to preserve user preference
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {
      // ignore
    }
    return 'dark';
  });

  const isDark = theme === 'dark';

  // Apply classes to both <html> and <body>
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (theme === 'light') {
      root.classList.remove('dark', 'theme-dark');
      root.classList.add('light', 'theme-light');
      body.classList.remove('dark', 'theme-dark');
      body.classList.add('light', 'theme-light');
    } else {
      root.classList.remove('light', 'theme-light');
      root.classList.add('dark', 'theme-dark');
      body.classList.remove('light', 'theme-light');
      body.classList.add('dark', 'theme-dark');
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      setThemeState(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
