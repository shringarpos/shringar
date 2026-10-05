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

  const setColorMode = () => {
    if (mode === "light") {
      setMode("dark");
    } else {
      setMode("light");
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
        // you can change the theme colors here. example: ...RefineThemes.Magenta,
        theme={{
          ...RefineThemes.Blue,
          algorithm: mode === "light" ? defaultAlgorithm : darkAlgorithm,
        }}
      >
        {children}
      </ConfigProvider>
    </ColorModeContext.Provider>
  );
};
