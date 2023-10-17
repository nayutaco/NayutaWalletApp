/**
 * Bottom sheet component.
 */
import LottieView from 'lottie-react-native';
import * as React from 'react';
import {View, StyleSheet, Text, Modal} from 'react-native';

import {Button} from 'components/uiParts/ButtonTheme';
import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {colors, fontSizes, typographyFonts} from 'styles/variables';

// I particularly didn't import these types because they are not the same type in theory.
type Button = {
  /** Button text. */
  text: string;
  /** Button onPress handler. */
  onPress: () => void;
  /**
   * Button style.
   * style will be one of "default", "cancel", "destructive"
   * @see https://facebook.github.io/react-native/docs/alert.html#alert
   */
  style?: string;
};
type Props = {
  /**
   * Title of the bottom sheet.
   */
  title: string;
  /**
   * Content of the bottom sheet.
   */
  children?: React.ReactNode;
  /**
   * Buttons to be displayed in the bottom sheet.
   */
  buttons: Button[];
  /**
   * If true, the bottom sheet will be displayed as a modal, hence blocking the rest of the screen.
   */
  modal?: boolean;
  /**
   * Color of the title text
   */
  titleColor?: string;
  /**
   * For Notify flag
   */
  notify?: boolean;
  /**
   * Show Notify Animation
   */
  animation?: boolean;
};
export default function BottomSheet({title, children, buttons, modal = true, titleColor = colors.tertiary, notify, animation}: Props) {
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);
  const content = (
    <View style={styles.container}>
      <View style={[styles.itemsContainer, animation && {backgroundColor: theme.color.transparent}]}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, notify && {textAlign: 'center'}, {color: titleColor}]}>{title}</Text>
        </View>
        {notify && (
          <View style={styles.notifyIcon}>
            {animation && (
              <LottieView
                style={styles.notifyAnimation}
                source={require('../../../assets/animation/4930-checkbox-animation.json')}
                speed={1.5}
                autoPlay
                loop={false}
              />
            )}
          </View>
        )}
        <View style={styles.messageContainer}>{children}</View>
        <View style={styles.buttons}>
          {buttons.map(({style, text, onPress}, index) => {
            if (style === 'cancel') {
              return (
                <Button key={index} style={styles.button} onPress={onPress} outline>
                  <Text style={styles.buttonOutlineText}>{text}</Text>
                </Button>
              );
            } else if (style === 'destructive') {
              return (
                <Button key={index} style={styles.button} onPress={onPress}>
                  <Text style={styles.buttonText}>{text}</Text>
                </Button>
              );
            }
            return (
              <Button key={index} style={styles.button} onPress={onPress}>
                <Text style={styles.buttonText}>{text}</Text>
              </Button>
            );
          })}
        </View>
      </View>
    </View>
  );
  if (modal) {
    return (
      <Modal animationType="fade" transparent hardwareAccelerated>
        {content}
      </Modal>
    );
  } else {
    return content;
  }
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      justifyContent: 'center',
      backgroundColor: theme.color.modalBackground,
      flexDirection: 'column',
      position: 'absolute',
      width: '100%',
      height: '100%',
      zIndex: 100,
    },
    notifyAnimation: {
      height: 400,
      width: 400,
    },
    notifyIcon: {
      alignItems: 'center',
    },
    itemsContainer: {
      marginHorizontal: 16,
      backgroundColor: theme.color.modal,
      padding: 32,
      borderRadius: 20,
    },
    titleContainer: {
      paddingHorizontal: 8,
    },
    title: {
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      fontSize: fontSizes.headerTitle,
    },
    messageContainer: {
      paddingHorizontal: 8,
      paddingVertical: 16,
    },
    buttons: {
      flexDirection: 'row',
    },
    button: {
      marginTop: 12,
      marginHorizontal: 48,
      borderColor: theme.color.textColor,
      borderWidth: 1,
    },
    buttonText: {
      fontSize: fontSizes.buttonLabel,
      fontFamily: typographyFonts.notoSans,
      letterSpacing: 4,
      width: '100%',
      textAlign: 'center',
      color: theme.color.buttonTextColor,
    },
    buttonOutlineText: {
      fontSize: fontSizes.buttonLabel,
      fontFamily: typographyFonts.notoSansBold,
      letterSpacing: 4,
      width: '100%',
      textAlign: 'center',
      color: theme.color.textColor,
    },
  });
  return styles;
};
