import i18next from 'i18next';
import {initReactI18next} from 'react-i18next';

import resources from './locales';

i18next.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  resources,
  lng: 'en',
  fallbackLng: 'en',
  ns: ['common', 'tutorial', 'category'],
  defaultNS: 'common',
  debug: false,
});
