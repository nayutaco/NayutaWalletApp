/**
 * A general input component.
 */
import React, {ReactNode} from 'react';
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

import Divider from 'components/uiParts/Divider';
import {Theme} from 'styles/theme/interface';
import {IosPartsTheme} from 'styles/theme/iosTheme';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {colors, fontSizes, typographyFonts, contentSizes} from 'styles/variables';

type Props = {
  /**
   * the value of the input
   */
  value: string;
  /**
   * onChange handler
   */
  onChange: (value: string) => void;
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
};
export default function Input({
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
}: Props) {
  const styles = useThemeAwareObject(createStyles);
  const {theme} = useTheme();
  const {t} = useTranslation();

  const inputAccessoryViewID = '1';

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputContainer}>
        {left}
        <TextInput
          editable={!disabled}
          placeholder={placeholder}
          placeholderTextColor={theme.color.textColorTranslucent}
          underlineColorAndroid="transparent"
          value={value}
          onChangeText={onChange}
          style={[styles.input, inputStyle]}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          autoCapitalize={autoCapitalize}
          selectionColor={theme.color.accentPrimary}
          inputAccessoryViewID={inputAccessoryViewID}
        />
        {right}
      </View>
      <Divider />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={inputAccessoryViewID}>
          <View style={styles.iosKeyboard}>
            <Pressable style={styles.closeButton} onPress={() => Keyboard.dismiss()}>
              <Text style={styles.closeText}>{t('close')}</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) => {
  const colorScheme = Appearance.getColorScheme();
  const iosColor = IosPartsTheme;
  const styles = StyleSheet.create({
    container: {
      flexDirection: 'column',
      width: '100%',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      height: contentSizes.textInputHeight,
    },
    input: {
      flexGrow: 1,
      fontSize: fontSizes.inputValue,
      color: theme.color.textColor,
      fontFamily: typographyFonts.notoSans,
      textAlign: 'left',
      width: '90%',
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
