import React from 'react';
import {useTranslation} from 'react-i18next';
import {
  Appearance,
  InputAccessoryView,
  Keyboard,
  KeyboardTypeOptions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {ModalTheme} from 'components/uiParts/Modal';
import {Theme} from 'styles/theme/interface';
import {IosPartsTheme} from 'styles/theme/iosTheme';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, typographyFonts} from 'styles/variables';

type Props = {
  isDialogVisible: boolean;
  title: string;
  message: string;
  hintInput?: string;
  inputUnit?: string;
  keyboradType?: KeyboardTypeOptions;
  submitText?: string;
  submitInput: (value: string) => void | Promise<void>;
  closeDialog: () => void;
  value?: string;
  onChange?: (value: string) => void;
};

export const DialogInput = ({
  isDialogVisible,
  title,
  message,
  hintInput,
  inputUnit,
  keyboradType = 'default',
  submitText,
  submitInput,
  closeDialog,
  value,
  onChange,
}: Props) => {
  const {t} = useTranslation();
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);

  const inputAccessoryViewID = '1';

  const handleOnCloseDialog = () => {
    closeDialog();
  };

  const handleSubmit = () => {
    value ? submitInput(value) : submitInput('');
  };

  const cancelText = t('cancel');
  const submitDefaultText = t('save');

  return (
    <ModalTheme
      visible={isDialogVisible}
      closing={handleOnCloseDialog}
      title={title}
      children={
        <>
          {message && <Text style={styles.message_modal}>{message}</Text>}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.inputText}
              autoFocus={true}
              underlineColorAndroid="transparent"
              placeholder={hintInput}
              placeholderTextColor={theme.color.textColorTranslucent}
              value={value}
              onChangeText={onChange}
              selectionColor={theme.color.accentPrimary}
              keyboardType={keyboradType}
              inputAccessoryViewID={inputAccessoryViewID}
            />
            <Text style={styles.inputTextUnit}>{inputUnit}</Text>
          </View>
          <View style={styles.btn_container}>
            <TouchableOpacity
              style={styles.touch_modal}
              onPress={handleOnCloseDialog}
              hitSlop={{
                bottom: 20,
                left: 20,
                top: 20,
              }}>
              <Text style={styles.btn_modal_left}>{cancelText}</Text>
            </TouchableOpacity>
            <View style={styles.divider_btn} />
            <TouchableOpacity
              style={styles.touch_modal}
              onPress={handleSubmit}
              hitSlop={{
                bottom: 20,
                right: 20,
                top: 20,
              }}>
              <Text style={styles.btn_modal_right}>{submitText ? submitText : submitDefaultText}</Text>
            </TouchableOpacity>
          </View>
          {Platform.OS === 'ios' && (
            <InputAccessoryView nativeID={inputAccessoryViewID}>
              <View style={styles.iosKeyboard}>
                <Pressable style={styles.closeButton} onPress={() => Keyboard.dismiss()}>
                  <Text style={styles.closeText}>{t('close')}</Text>
                </Pressable>
              </View>
            </InputAccessoryView>
          )}
        </>
      }
    />
  );
};

const createStyles = (theme: Theme) => {
  const colorScheme = Appearance.getColorScheme();
  const iosColor = IosPartsTheme;
  const styles = StyleSheet.create({
    message_modal: {
      fontSize: fontSizes.basic5,
      textAlign: 'left',
      color: theme.color.textColor,
      marginBottom: 8,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: 8,
      borderBottomWidth: 2,
      borderColor: theme.color.accentPrimary,
    },
    inputText: {
      width: '90%',
      fontSize: fontSizes.basic4,
      color: theme.color.textColor,
      height: 50,
    },
    inputTextUnit: {
      fontSize: fontSizes.basic4,
      color: theme.color.textColor,
      marginHorizontal: 8,
    },
    btn_container: {
      flex: 1,
      flexDirection: 'row',
      alignSelf: 'flex-end',
      maxHeight: 56,
      paddingTop: 12,
      paddingBottom: 24,
    },
    divider_btn: {
      width: 0,
    },
    touch_modal: {
      minWidth: 64,
      height: 36,
    },
    btn_modal_left: {
      fontSize: fontSizes.basic8,
      fontFamily: typographyFonts.notoSansBold,
      textAlign: 'center',
      color: theme.color.cancelButtonColor,
      padding: 8,
      marginRight: 12,
    },
    btn_modal_right: {
      fontSize: fontSizes.basic8,
      fontFamily: typographyFonts.notoSansBold,
      textAlign: 'center',
      color: theme.color.buttonTextColor,
      backgroundColor: theme.color.accentPrimary,
      borderRadius: 12,
      padding: 8,
      overflow: 'hidden',
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
