import React, {ReactNode} from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};
export default function DictTable({children, style}: Props) {
  return <View style={[styles.container, style]}>{children}</View>;
}
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    flexDirection: 'column',
  },
});
