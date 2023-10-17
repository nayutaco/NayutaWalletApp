import React from 'react';

import {StyleSheet} from 'react-native';
import MIcon from 'react-native-vector-icons/MaterialIcons';

import ListItem from 'components/uiParts/List/Item';

import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';

type Props = {
  onPress: () => void;
  label: string;
  subLabel?: string;
  right?: boolean;
  checking?: boolean;
  indent?: boolean;
};

export default function WrapListItem({onPress, label, subLabel, right, checking, indent}: Props) {
  const styles = useThemeAwareObject(createStyles);

  if (checking) {
    return <></>;
  } else {
    return (
      <ListItem
        onPress={onPress}
        label={label}
        subLabel={subLabel}
        right={right && <MIcon name="chevron-right" size={24} style={styles.icon} />}
        indent={indent}
      />
    );
  }
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    icon: {
      color: theme.color.textColor,
      opacity: 0.6,
    },
  });
  return styles;
};
