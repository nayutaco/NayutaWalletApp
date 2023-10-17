import Clipboard from '@react-native-clipboard/clipboard';
import React, {ReactNode, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Text, Pressable, StyleSheet, View} from 'react-native';

import DictTableItem, {CopyEventProps, OpenEventProps} from 'components/uiParts/DictTable/Item';
import Divider from 'components/uiParts/Divider';
import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, typographyFonts} from 'styles/variables';
import {duringCopying} from 'tools/constants';

type Props = {
  /**
   * Label of item
   */
  label: string;
  /**
   * Label of value
   */
  value?: string;
  /**
   * Content of item
   */
  children?: ReactNode;
  /**
   * After Content of item
   */
  afterChildren?: ReactNode;
  /**
   * Whether to have divider or not
   */
  hasDivider?: boolean;
  /**
   * jump to url
   */
  openUrl?: OpenEventProps;
};

/**
 * Return the dictTable copyable item
 * @returns {JSX.Element} DictTableCopyableItem
 */
export const DictTableCopyableItem = ({label, value, children, afterChildren, hasDivider = false, openUrl}: Props) => {
  const {t} = useTranslation();
  const styles = useThemeAwareObject(createStyles);

  const [copying, setCopying] = useState(false);
  const [height, setHeight] = useState();
  /**
   * copy to clipboard
   */
  const copy = (text: string | undefined) => () => {
    if (text === '' || text === undefined) return;
    setCopying(true);
    Clipboard.setString(text);
    setTimeout(() => setCopying(false), duringCopying);
  };

  const getHeight = (event: {nativeEvent: {layout: {height: any}}}) => {
    setHeight(event.nativeEvent.layout.height);
  };

  const copyEvent: CopyEventProps = {
    copyable: true,
    onPress: copy(value),
    getHeight: getHeight,
  };

  return (
    <>
      <DictTableItem label={label} copyEvent={copyEvent} openEvent={openUrl}>
        <View style={[!copying ? styles.default : styles.copying, {height: height}]}>
          {!copying ? (
            <View>
              {children ? (
                children
              ) : (
                <Text style={styles.value} numberOfLines={1} ellipsizeMode={'middle'}>
                  {value}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.copyText}>{t('copied')}</Text>
          )}
        </View>
      </DictTableItem>
      {hasDivider && <Divider />}
      {afterChildren && <Pressable onPress={copy(value)}>{afterChildren}</Pressable>}
    </>
  );
};

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    value: {
      color: theme.color.textColor,
    },
    default: {},
    copying: {
      borderRadius: 16,
      backgroundColor: theme.color.textBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copyText: {
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.dictTableLabel,
      color: theme.color.textColor,
    },
  });
  return styles;
};
