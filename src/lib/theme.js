import { createContext, useContext } from 'react'
// themeMode: 'dark' | 'light' | 'browser'
// dark: boolean derived from themeMode (used by pages for content styling)
export const ThemeContext = createContext({ dark: true, themeMode: 'mix', setThemeMode: () => {} })
export const useTheme = () => useContext(ThemeContext)
