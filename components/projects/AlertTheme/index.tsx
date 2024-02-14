import Clipboard from '@react-native-clipboard/clipboard';
import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Modal, Pressable, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import MIcon from 'react-native-vector-icons/MaterialIcons';

import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, typographyFonts} from 'styles/variables';
import {duringCopying} from 'tools/constants';

type Props = {
  isAlertVisible: boolean;
  title: string;
  message: string;
  button?: AlertButtonProps[];
  closing?: () => void; // should add a method for closing each modal
  copyBtn?: boolean;
};

type AlertButtonType = 'cancel' | 'submit' | 'attention';

export type AlertButtonProps = {
  text: string;
  style: AlertButtonType;
  onPress: () => void;
};

export const Alert = ({isAlertVisible, title, message, button, closing, copyBtn}: Props) => {
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);
  const {t} = useTranslation();

  const [copying, setCopying] = useState<boolean>(false);
  const copy = () => {
    setCopying(true);
    Clipboard.setString(message);
    setTimeout(() => setCopying(false), duringCopying);
  };

  const buttonDisplay = () => {
    return (
      button &&
      button.map((content, index) => (
        <TouchableOpacity
          key={index}
          style={styles.touch_modal}
          onPress={content.onPress}
          hitSlop={{
            bottom: 20,
            left: 20,
            top: 20,
          }}>
          <Text
            style={
              (content.style === 'cancel' && styles.cancelBtn) ||
              (content.style === 'submit' && styles.submitBtn) ||
              (content.style === 'attention' && styles.attentionBtn)
            }>
            {content.text}
          </Text>
        </TouchableOpacity>
      ))
    );
  };

  const closeButtonDisplay = () => {
    return (
      <TouchableOpacity
        style={styles.touch_modal}
        onPress={closing}
        hitSlop={{
          bottom: 20,
          left: 20,
          top: 20,
        }}>
        <Text style={styles.submitBtn}>{t('close')}</Text>
      </TouchableOpacity>
    );
  };

  const messageContainer = !copying ? (
    <Text style={styles.modalMessage}>{message}</Text>
  ) : (
    <View style={styles.copyContainer}>
      <Text style={styles.copyText}>{t('copied')}</Text>
      <Text style={[styles.modalMessage, {color: theme.color.transparent}]}>{message}</Text>
    </View>
  );

  return (
    <Modal visible={isAlertVisible} animationType="fade" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modal}>
          <View style={styles.modalTitleFrame}>
            <Text style={styles.modalTitle}>{title}</Text>
            {copyBtn && (
              <Pressable onPress={copy} android_ripple={{color: '#666'}}>
                <MIcon name="content-copy" size={fontSizes.basic4} color={theme.color.textColor} style={{margin: 3}} />
              </Pressable>
            )}
          </View>
          {messageContainer}
          <View style={styles.btn_container}>{closing ? closeButtonDisplay() : buttonDisplay()}</View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.color.modalBackground,
    },
    modal: {
      width: '85%',
      backgroundColor: theme.color.modal,
      borderRadius: 20,
      marginVertical: 48,
      padding: 32,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    modalMessage: {
      fontSize: fontSizes.basic5,
      textAlign: 'left',
      color: theme.color.textColor,
      marginBottom: 8,
    },
    modalTitle: {
      fontFamily: typographyFonts.notoSansBold,
      fontSize: fontSizes.basic4,
      color: theme.color.textColor,
      letterSpacing: 2,
    },
    modalTitleFrame: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 4,
      marginTop: 16,
      marginBottom: 24,
      borderBottomColor: theme.color.accentSecondary,
      borderBottomWidth: 2,
    },
    btn_container: {
      flex: 1,
      flexDirection: 'row',
      alignSelf: 'flex-end',
      maxHeight: 56,
      paddingVertical: 12,
      paddingBottom: 24,
    },
    touch_modal: {
      minWidth: 64,
      height: 36,
    },
    cancelBtn: {
      fontSize: fontSizes.basic8,
      fontFamily: typographyFonts.notoSansBold,
      textAlign: 'center',
      color: theme.color.cancelButtonColor,
      marginHorizontal: 12,
      padding: 8,
    },
    submitBtn: {
      fontSize: fontSizes.basic8,
      fontFamily: typographyFonts.notoSansBold,
      textAlign: 'center',
      color: theme.color.buttonTextColor,
      backgroundColor: theme.color.accentPrimary,
      borderRadius: 12,
      padding: 8,
      overflow: 'hidden',
    },
    attentionBtn: {
      fontSize: fontSizes.basic8,
      fontFamily: typographyFonts.notoSansBold,
      textAlign: 'center',
      color: theme.color.buttonTextColor,
      backgroundColor: theme.color.tertiary,
      borderRadius: 12,
      padding: 8,
      overflow: 'hidden',
    },
    copyContainer: {
      borderRadius: 8,
      backgroundColor: theme.color.textBackground,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    copyText: {
      position: 'absolute',
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic4,
      color: theme.color.primary,
    },
  });
  return styles;
};
