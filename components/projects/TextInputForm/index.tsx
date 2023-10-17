/**
 * A general input component.
 */
import React, {ReactNode, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  Appearance,
  InputAccessoryView,
  Keyboard,
  KeyboardTypeOptions,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import {useStore} from 'store';
import {Theme} from 'styles/theme/interface';
import {IosPartsTheme} from 'styles/theme/iosTheme';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {colors, fontSizes, typographyFonts, contentSizes} from 'styles/variables';
import {canParseFloat} from 'tools';
import {convertToSatoshiFromUnit} from 'tools/currencyConvert';
import {convertNumberString} from 'tools/locale';
import {LOG} from 'tools/logging';

type Props = {
  /**
   * the value of the input
   */
  value?: string;
  /**
   * onChange handler
   */
  onChange: (value: any) => void;
  /**
   * override the style of the container
   */
  style?: StyleProp<ViewStyle>;
  /**
   * disables the input
   */
  disabled?: boolean;
  /**
   * error message
   */
  error?: string;
  /**
   * the placeholder text to show in the input
   */
  placeholder?: string;
  /**
   * the text to show above the input
   */
  label?: string;
  /**
   * left item slot
   */
  left?: ReactNode;
  /**
   * right item slot
   */
  right?: ReactNode;
  /**
   * select keyboard type
   */
  keyboardType?: KeyboardTypeOptions;
  /**
   * enable auto focus
   */
  autoFocus?: boolean;
  /**
   * automatically capitalize certain characters
   */
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /**
   * style for input form
   */
  inputStyle?: StyleProp<TextStyle>;
  /**
   * for sat input
   */
  satInput?: boolean;
  defaultValue?: string;
};

export default function TextInputForm({
  value,
  onChange,
  style,
  disabled,
  error,
  placeholder,
  label,
  left,
  right,
  keyboardType,
  autoFocus,
  autoCapitalize = 'sentences',
  inputStyle,
  satInput = false,
  defaultValue,
}: Props) {
  const {t} = useTranslation();
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);

  const [focused, setFocused] = useState(false);
  const defaultText = placeholder;

  const onFocus = () => {
    setFocused(true);
    placeholder = '';
  };
  const onBlur = () => {
    setFocused(false);
    placeholder = defaultText;
  };

  const [store] = useStore();
  const inputUnit = store.showInFiat ? store.fiat : store.crypto;
  const inputAccessoryViewID = '1';

  const handleChange = async (text: string) => {
    const numberWithoutDigitSeparator = convertNumberString(text, store.digitDecimalRule);
    const satoshi = await convertToSatoshiFromUnit(inputUnit, numberWithoutDigitSeparator);

    if (!satoshi) {
      LOG.error('Failed to convert unit');
      onChange(null);
      return;
    }

    if (!canParseFloat(satoshi.toString(), false)) {
      LOG.warn('input value is not a number');
      onChange(null);
      return;
    }

    onChange(satoshi.floorMsat());
  };

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputContainer, focused && {borderBottomColor: theme.color.accentPrimary}]}>
        {left}
        <TextInput
          editable={!disabled}
          placeholder={placeholder}
          placeholderTextColor={theme.color.textColorTranslucent}
          onFocus={onFocus}
          onBlur={onBlur}
          underlineColorAndroid="transparent"
          value={value}
          onChangeText={satInput ? handleChange : onChange}
          style={[styles.input, inputStyle]}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          autoCapitalize={autoCapitalize}
          selectionColor={theme.color.accentPrimary}
          defaultValue={defaultValue}
          inputAccessoryViewID={inputAccessoryViewID}
        />
        {Platform.OS === 'ios' && (
          <InputAccessoryView nativeID={inputAccessoryViewID}>
            <View style={styles.iosKeyboard}>
              <Pressable style={styles.closeButton} onPress={() => Keyboard.dismiss()}>
                <Text style={styles.closeText}>{t('close')}</Text>
              </Pressable>
            </View>
          </InputAccessoryView>
        )}
        {satInput && <Text style={!disabled ? styles.unit : styles.unitDisabled}>{t(`currencyUnit:${inputUnit}`)}</Text>}
        {right}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (theme: Theme) => {
  const colorScheme = Appearance.getColorScheme();
  const iosColor = IosPartsTheme;
  const styles = StyleSheet.create({
    container: {
      flexDirection: 'column',
      marginBottom: 24,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomColor: theme.color.textColor,
      borderBottomWidth: 2,
      backgroundColor: theme.color.formBackground,
      borderRadius: 3,
    },
    input: {
      flexGrow: 1,
      flexShrink: 1,
      fontSize: fontSizes.inputValue,
      color: theme.color.textColor,
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      textAlign: 'left',
      height: contentSizes.textInputHeight,
    },
    label: {
      color: theme.color.textColor,
      fontFamily: typographyFonts.notoSansBold,
      fontSize: fontSizes.inputLabel,
    },
    error: {
      color: colors.tertiary,
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.inputErrorLabel,
    },
    satInputContainer: {
      flexDirection: 'row',
    },
    unit: {
      flexGrow: 0,
      fontSize: fontSizes.inputValue,
      color: theme.color.textColor,
      fontFamily: typographyFonts.notoSans,
      paddingRight: 8,
    },
    unitDisabled: {
      flexGrow: 0,
      fontSize: fontSizes.inputValue,
      color: theme.color.textColorTranslucent,
      fontFamily: typographyFonts.notoSans,
      paddingRight: 8,
    },
    iosKeyboard: {
      backgroundColor: colorScheme === 'light' ? iosColor.keyboardAccessoryLight : iosColor.keyboardAccessoryDark,
      alignItems: 'flex-end',
    },
    keyboardClose: {
      flex: 1,
    },
    closeButton: {
      alignItems: 'center',
      padding: 10,
    },
    closeText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: iosColor.applyButton,
    },
  });
  return styles;
};
