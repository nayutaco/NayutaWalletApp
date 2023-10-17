import React from 'react';
import {StyleProp, ViewStyle} from 'react-native';

import {Button, buttonColor, buttonType, buttonSize} from 'components/uiParts/Button';

type Props = {
  /**
   * Function to execute on press
   */
  onPress?: () => void;
  /**
   * Label text of the button
   */
  children?: React.ReactNode;
  /**
   * Style of button's content.
   */
  style?: StyleProp<ViewStyle>;
};

/**
 * Return the floating action button
 * @param porps props
 * @returns {JSX.Element} FloatingActionButton
 */
export const FloatingActionButton = ({onPress, children, style = {}}: Props) => {
  return (
    <Button style={style} type={buttonType.default} color={buttonColor.primary} size={buttonSize.large} onPress={onPress} rounded floating>
      {children}
    </Button>
  );
};
