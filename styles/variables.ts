import {Platform, ViewStyle} from 'react-native';

/**
 * color schemes
 */
export const colors = {
  primary: '#39496F',
  primaryLighten: '#B0B6C5',
  primaryDarken: '#2B3753',
  primaryAccent: '#8892a9',
  secondary: '#FFD900',
  secondaryLighten: '#F8E495',
  secondaryDarken: '#B69E3B',
  tertiary: '#ED6F63',
  tertiaryLighten: '#F8C5C1',
  tertiaryDarken: '#B2534A',
  quaternary: '#E7E6E6',
  quaternaryLighten: '#ECEBEB',
  quaternaryDarken: '#ADADAD',
  black: '#000000',
  white: '#FFFFFF',
  transparent: 'transparent',
  disabled: '#A39F9F',
  listItemSubLabel: '#898989',
  headerBackground: 'rgba(255,255,255,1)',
  permissionIcon: '#43a047',
  borderColor: '#D7DBE2',
  balanceBarBackground: '#D7DBE2',
  bottomSheetMessage: '#666666',
  bottomSheetBackground: '#F5DB72',
  shadow: '#666666',
} as const;

/**
 * typography fonts
 */
export const typographyFonts = {
  notoSans: 'NotoSans',
  notoSansBold: 'NotoSans-Bold',
  notoSansItalic: 'NotoSans-Italic',
  notoSansBoldItalic: 'NotoSans-BoldItalic',
} as const;

/**
 * font size
 */
export const fontSizes = {
  // TODO: give meaningful naming to text sizes (ex. subTitle, caption, body, subbody, heading...)
  title: 52,
  subTitle: 36,
  heading: 34,
  basic1: 39,
  basic2: 31,
  basic3: 25,
  basic4: 20,
  basic5: 16,
  basic6: 13,
  basic7: 10,
  basic8: 14,
  label: 12,
  checkText: 18,
  headerTitle: 18,
  listItemLabel: 16,
  listItemSubLabel: 14,
  balanceLabel: 16,
  balanceValue: 22,
  subBalanceValue: 15,
  inputLabel: 16,
  inputValue: 18,
  inputSubValue: 14,
  inputErrorLabel: 16,
  buttonLabel: 16,
  dictTableLabel: 16,
  dictTableItem: 14,
  modalLabel: 16,
  notifyMessage: 14,
} as const;

export const defaultShadowProps: ViewStyle = Platform.select({
  android: {
    shadowColor: colors.shadow,
    elevation: 8,
  },
  default: {
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
});

export const contentSizes = {
  textInputHeight: 55,
  subValueHeight: 23.5,
} as const;

export const iconSizes = {
  basic1: 40,
  basic2: 24,
  basic3: 22,
} as const;
