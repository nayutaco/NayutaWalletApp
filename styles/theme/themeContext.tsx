import React from 'react';

import {DARK_THEME, DARK_THEME_ID} from 'styles/theme/dark';
import {Theme} from 'styles/theme/interface';
import {LIGHT_THEME, LIGHT_THEME_ID} from 'styles/theme/light';

interface ProvidedValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const Context = React.createContext<ProvidedValue>({
  theme: LIGHT_THEME,
  setTheme: () => {
    console.log('ThemeProvider is not rendered!');
  },
  toggleTheme: () => {
    console.log('ThemeProvider is not rendered!');
  },
});

export interface Props {
  initial: Theme;
  children?: React.ReactNode;
}

export const ThemeProvider = React.memo<Props>(props => {
  const [theme, setTheme] = React.useState<Theme>(props.initial);

  const SetThemeCallback = React.useCallback((newTheme: Theme) => {
    setTheme((currentTheme: Theme) => {
      if (currentTheme.id === newTheme.id) {
        return currentTheme;
      }

      return newTheme;
    });
  }, []);

  const ToggleThemeCallback = React.useCallback(() => {
    setTheme(currentTheme => {
      if (currentTheme.id === LIGHT_THEME_ID) {
        return DARK_THEME;
      }
      if (currentTheme.id === DARK_THEME_ID) {
        return LIGHT_THEME;
      }
      return currentTheme;
    });
  }, []);

  const MemoizedValue = React.useMemo(() => {
    const value: ProvidedValue = {
      theme,
      setTheme: SetThemeCallback,
      toggleTheme: ToggleThemeCallback,
    };
    return value;
  }, [theme, SetThemeCallback, ToggleThemeCallback]);

  return <Context.Provider value={MemoizedValue}>{props.children}</Context.Provider>;
});

export const useTheme = () => React.useContext(Context);
