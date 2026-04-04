import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// Get system preference
const getSystemTheme = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// Apply theme to document
const applyTheme = (isDark: boolean) => {
  if (typeof window === 'undefined') return;
  
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light', // Default to light instead of system
      isDark: false,

      setTheme: (theme: Theme) => {
        let isDark = false;

        if (theme === 'system') {
          isDark = getSystemTheme();
        } else {
          isDark = theme === 'dark';
        }

        applyTheme(isDark);
        set({ theme, isDark });
      },

      toggleTheme: () => {
        const currentIsDark = get().isDark;
        
        // Simple toggle: if dark -> light, if light -> dark
        const newTheme = currentIsDark ? 'light' : 'dark';
        
        get().setTheme(newTheme);
      },
    }),
    {
      name: 'avaltra-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Re-apply theme after rehydration
          applyTheme(state.isDark);
        }
      },
    }
  )
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const store = useThemeStore.getState();
    if (store.theme === 'system') {
      const isDark = e.matches;
      applyTheme(isDark);
      useThemeStore.setState({ isDark });
    }
  });
}
