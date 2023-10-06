export interface ColorTheme {
  primary: string;
  primaryLighten: string;
  primaryDarken: string;
  primaryAccent: string;
  secondary: string;
  secondaryLighten: string;
  secondaryDarken: string;
  tertiary: string;
  tertiaryLighten: string;
  tertiaryDarken: string;
  quaternary: string;
  quaternaryLighten: string;
  quaternaryDarken: string;
  black: string;
  white: string;
  transparent: string;
  disabled: string;
  amountCard: string;
  listItemSubLabel: string;
  headerBackground: string;
  permissionIcon: string;
  borderColor: string;
  balanceBarBackground: string;
  bottomSheetMessage: string;
  bottomSheetBackground: string;
  quinary: string;
  senary: string;
  buttonColor: string;
  buttonTextColor: string;
  buttonBorderColor: string;
  textColor: string;
  textColorTranslucent: string;
  textBackground: string;
  outlineBorder: string;
  headerBackGround: string;
  background: string;
  pageBackground: string;
  txListBackground: string;
  passphraseBorder: string;
  modal: string;
  modalBackground: string;
  accentPrimary: string;
  accentSecondary: string;
  divider: string;
  formBackground: string;
  selectButtonColor: string;
  selectButtonTextColor: string;
  cancelButtonColor: string;
}

export interface Theme {
  id: string;
  color: ColorTheme;
}
