import {withStyle} from 'components/uiParts/Sat';
import {fontSizes, typographyFonts} from 'styles/variables';

export const TotalBalance = withStyle({
  valueStyle: {
    flex: 1,
    fontFamily: typographyFonts.notoSansBold,
    fontSize: fontSizes.heading,
    textAlign: 'center',
  },
  unitStyle: {fontFamily: typographyFonts.notoSansBold, fontSize: fontSizes.basic3, marginRight: 10},
  showSwapButton: true,
});

export const EachBalance = withStyle({
  valueStyle: {
    fontFamily: typographyFonts.notoSansBold,
    fontSize: fontSizes.balanceValue,
    textAlign: 'center',
    marginRight: 16,
  },
  unitStyle: {fontFamily: typographyFonts.notoSansBold, fontSize: fontSizes.basic4},
  showSwapButton: false,
});

export const Fiat = withStyle({
  valueStyle: {
    fontSize: fontSizes.subBalanceValue,
  },
  unitStyle: {
    fontSize: fontSizes.subBalanceValue,
    marginHorizontal: 4,
  },
  containerStyle: {
    justifyContent: 'center',
  },
  showSwapButton: false,
  overrideUnit: 'ANY_FIAT',
});

export const Crypto = withStyle({
  valueStyle: {
    fontSize: fontSizes.balanceValue,
    fontWeight: 'bold',
  },
  unitStyle: {
    fontSize: fontSizes.balanceValue,
    marginHorizontal: 4,
  },
  containerStyle: {
    justifyContent: 'center',
  },
  showSwapButton: false,
  overrideUnit: 'ANY_CRYPTO',
});

export const CryptoInTable = withStyle({
  valueStyle: {
    fontFamily: typographyFonts.notoSans,
    fontSize: fontSizes.basic5,
  },
  unitStyle: {
    fontFamily: typographyFonts.notoSans,
    fontSize: fontSizes.basic5,
    marginHorizontal: 4,
  },
  showSwapButton: false,
  overrideUnit: 'ANY_CRYPTO',
});

export const FiatInTable = withStyle({
  valueStyle: {
    fontFamily: typographyFonts.notoSans,
    fontSize: fontSizes.basic5,
  },
  unitStyle: {
    fontFamily: typographyFonts.notoSans,
    fontSize: fontSizes.basic5,
    marginHorizontal: 4,
  },
  showSwapButton: false,
  overrideUnit: 'ANY_FIAT',
});

export const TxDetailValue = withStyle({
  valueStyle: {
    fontFamily: typographyFonts.notoSans,
    fontSize: fontSizes.basic5,
  },
  unitStyle: {
    fontFamily: typographyFonts.notoSans,
    fontSize: fontSizes.basic5,
    marginHorizontal: 5,
  },
  showSwapButton: false,
});
