import React from 'react';

import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';

type Generator<T extends Record<string, unknown>> = (theme: Theme) => T;

export const useThemeAwareObject = <T extends Record<string, unknown>>(fn: Generator<T>) => {
  const {theme} = useTheme();

  const ThemeAwareObject = React.useMemo(() => fn(theme), [fn, theme]);
  return ThemeAwareObject;
};
