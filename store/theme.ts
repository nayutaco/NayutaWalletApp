import {getThemeId, setThemeId} from './storage';

import {Theme} from 'styles/theme';
import {DARK_THEME} from 'styles/theme/dark';
import {LIGHT_THEME} from 'styles/theme/light';

export async function getTheme(): Promise<Theme> {
  const current = await getThemeId();
  if (current === 'dark') {
    return DARK_THEME;
  } else {
    return LIGHT_THEME;
  }
}

export async function setTheme(theme: Theme) {
  await setThemeId(theme.id);
}
