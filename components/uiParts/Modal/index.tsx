import React from 'react';
import {Pressable, StyleSheet, View, Modal, Text, StyleProp, TextStyle, KeyboardAvoidingView, Platform} from 'react-native';
import MIcon from 'react-native-vector-icons/MaterialIcons';

import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, iconSizes, typographyFonts} from 'styles/variables';

type Props = {
  visible: boolean;
  closing: () => void;
  title?: string;
  titleStyle?: StyleProp<TextStyle>;
  children: React.ReactNode;
};

export const ModalTheme = ({visible = false, closing, title, titleStyle, children}: Props) => {
  const styles = useThemeAwareObject(createStyles);
  return (
    <Modal visible={visible} onRequestClose={closing} animationType="fade" transparent>
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            <View pointerEvents="box-none">
              <Pressable onPress={closing} android_ripple={{color: '#ccc'}} style={styles.button} hitSlop={40}>
                <MIcon name="close" size={iconSizes.basic2} style={styles.icon} />
              </Pressable>
              {title && <Text style={[styles.modalTitle, titleStyle]}>{title}</Text>}
              {children}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
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
      width: '90%',
      backgroundColor: theme.color.modal,
      borderRadius: 20,
      marginVertical: 80,
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
    button: {
      alignSelf: 'flex-end',
    },
    icon: {
      color: theme.color.textColor,
      opacity: 0.6,
    },
    modalTitle: {
      fontFamily: typographyFonts.notoSansBold,
      fontSize: fontSizes.basic4,
      color: theme.color.textColor,
      borderBottomColor: theme.color.accentSecondary,
      borderBottomWidth: 2,
      marginTop: 16,
      marginLeft: 2,
      marginBottom: 24,
      letterSpacing: 2,
    },
  });
  return styles;
};
