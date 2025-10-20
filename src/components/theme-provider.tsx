import React, { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Force light mode on auth pages
    const isAuthPage = window.location.pathname === '/auth' || window.location.pathname === '/inscription';
    if (isAuthPage) {
      return "light";
    }
    
    // Récupérer le thème sauvegardé
    const savedTheme = localStorage.getItem(storageKey) as Theme;
    
    // Si pas de thème sauvegardé ou si c'est "system", utiliser le thème par défaut (light)
    if (!savedTheme || savedTheme === "system") {
      localStorage.setItem(storageKey, defaultTheme);
      return defaultTheme;
    }
    
    // Utiliser le thème sauvegardé s'il est valide
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }
    
    // Fallback au thème par défaut
    return defaultTheme;
  })

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    // Ne plus gérer "system", seulement "light" ou "dark"
    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      // Only save to localStorage if not on auth pages
      const isAuthPage = window.location.pathname === '/auth' || window.location.pathname === '/inscription';
      if (!isAuthPage) {
        localStorage.setItem(storageKey, theme);
      }
      setTheme(theme);
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}