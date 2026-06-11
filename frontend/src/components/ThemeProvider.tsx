import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react"

export type Theme = "light" | "dark" | "cyberpunk" | "matrix" | "solarized" | "nordic" | "paper" | "synthwave" | "ethereal" | "academia" | "forest" | "sakura" | "dracula"

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = "codify-theme"

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readInitialTheme(): Theme {
  if (typeof window !== "undefined") {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY)
    if (
      storedTheme === "dark" ||
      storedTheme === "light" ||
      storedTheme === "cyberpunk" ||
      storedTheme === "matrix" ||
      storedTheme === "solarized" ||
      storedTheme === "nordic" ||
      storedTheme === "paper" ||
      storedTheme === "synthwave" ||
      storedTheme === "ethereal" ||
      storedTheme === "academia" ||
      storedTheme === "forest" ||
      storedTheme === "sakura" ||
      storedTheme === "dracula"
    ) {
      return storedTheme as Theme
    }
  }

  if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
    return "dark"
  }

  return "light"
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    // Remove all old classes
    root.classList.remove("light", "dark", "theme-cyberpunk", "theme-matrix", "theme-solarized", "theme-nordic", "theme-paper", "theme-synthwave", "theme-ethereal", "theme-academia", "theme-forest", "theme-sakura", "theme-dracula")
    
    // Add dark/light depending on theme base
    if (theme === "light" || theme === "nordic" || theme === "paper" || theme === "ethereal" || theme === "sakura") {
      root.classList.add("light")
      root.style.colorScheme = "light"
      if (theme !== "light") {
        root.classList.add(`theme-${theme}`)
      }
    } else {
      root.classList.add("dark")
      root.style.colorScheme = "dark"
      
      if (theme !== "dark") {
        root.classList.add(`theme-${theme}`)
      }
    }

    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.")
  }

  return context
}
