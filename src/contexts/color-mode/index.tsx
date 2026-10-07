import { RefineThemes } from "@refinedev/antd";
import { ConfigProvider, theme } from "antd";
import {
  type PropsWithChildren,
  createContext,
  useEffect,
  useState,
} from "react";

type ColorModeContextType = {
  mode: string;
  setMode: (mode: string) => void;
};

export const ColorModeContext = createContext<ColorModeContextType>(
  {} as ColorModeContextType
);

const applyThemeToDocument = (themeMode: string) => {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", themeMode);
    document.documentElement.style.colorScheme = themeMode;
    if (document.body) {
      document.body.setAttribute("data-theme", themeMode);
      document.body.style.colorScheme = themeMode;
      document.body.style.backgroundColor = themeMode === "dark" ? "#000000" : "#f1f5f9";
      document.body.style.color = themeMode === "dark" ? "#f8fafc" : "#0f172a";
    }
  }
};

export const ColorModeContextProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const colorModeFromLocalStorage = localStorage.getItem("colorMode");
  const isSystemPreferenceDark = window?.matchMedia?.(
    "(prefers-color-scheme: dark)"
  )?.matches;

  const systemPreference = isSystemPreferenceDark ? "dark" : "light";
  const [mode, setMode] = useState(() => {
    const initial = colorModeFromLocalStorage || systemPreference;
    applyThemeToDocument(initial);
    return initial;
  });

  useEffect(() => {
    window.localStorage.setItem("colorMode", mode);
    applyThemeToDocument(mode);
  }, [mode]);

  const setColorMode = (newMode?: string) => {
    if (typeof newMode === "string") {
      setMode(newMode);
    } else {
      setMode((prev) => (prev === "light" ? "dark" : "light"));
    }
  };

  const { darkAlgorithm, defaultAlgorithm } = theme;

  return (
    <ColorModeContext.Provider
      value={{
        setMode: setColorMode,
        mode,
      }}
    >
      <ConfigProvider
        theme={{
          ...RefineThemes.Blue,
          algorithm: mode === "dark" ? darkAlgorithm : defaultAlgorithm,
          token: {
            ...(mode === "dark"
              ? {
                  colorBgLayout: "#000000",
                  colorBgContainer: "#141414",
                  colorBgElevated: "#18181b",
                  colorBorderSecondary: "#27272a",
                  colorText: "#f8fafc",
                  colorTextSecondary: "#94a3b8",
                }
              : {
                  colorBgLayout: "#f1f5f9",
                  colorBgContainer: "#ffffff",
                  colorBgElevated: "#ffffff",
                  colorBorderSecondary: "#e2e8f0",
                  colorText: "#0f172a",
                  colorTextSecondary: "#64748b",
                }),
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ColorModeContext.Provider>
  );
};
