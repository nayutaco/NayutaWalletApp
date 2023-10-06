import React, {useCallback} from 'react';
import {View, StyleSheet, Image} from 'react-native';
import MIcon from 'react-native-vector-icons/MaterialIcons';

import receiveArrow from 'assets/images/arrow_receive.png';
import receiveArrowDark from 'assets/images/arrow_receive_dark.png';
import sendArrow from 'assets/images/arrow_send.png';
import sendArrowDark from 'assets/images/arrow_send_dark.png';
import {useTheme} from 'styles/theme/themeContext';
import {LnStatus, Direction, status as lnStatus, ChainType} from 'txhistory';
import {BtcStatus} from 'txhistory/btc';

export type StatusType = {
  chain: ChainType;
  direction: Direction;
  status: LnStatus | BtcStatus;
  size?: 'default' | 'large';
};

/**
 * Return the status icon component
 * @param props
 * @returns {JSX.Element} StatusIcon Component
 */
export const StatusIcon = ({size = 'default', direction, status}: StatusType) => {
  const {theme} = useTheme();

  const renderIcon = useCallback(() => {
    switch (status) {
      case lnStatus.failed:
      case lnStatus.canceled:
        return <MIcon name="close" size={size === 'default' ? 20 : 25} color={theme.color.tertiary} />;
      case lnStatus.inFlight:
        return <MIcon name="hourglass-top" size={size === 'default' ? 20 : 25} color={theme.color.primaryLighten} />;
      case lnStatus.open:
        return <MIcon name="folder" size={size === 'default' ? 20 : 25} color={theme.color.primaryLighten} />;
      case 'PENDING':
        return <MIcon name="hourglass-top" size={size === 'default' ? 20 : 25} color={theme.color.primaryLighten} />;
      case 'CONFIRMED':
        return <MIcon name="done" size={size === 'default' ? 20 : 25} color={theme.color.accentPrimary} />;
      default:
        return (
          <Image
            style={size === 'default' ? styles.arrowDefaultSize : styles.arrowLargeSize}
            source={theme.id === 'light' ? (direction === 'pay' ? sendArrow : receiveArrow) : direction === 'pay' ? sendArrowDark : receiveArrowDark}
            resizeMode="contain"
          />
        );
    }
  }, [status, size, theme.color.tertiary, theme.color.primaryLighten, theme.color.accentPrimary, theme.id, direction]);

  return <View style={styles.icon}>{renderIcon()}</View>;
};

const styles = StyleSheet.create({
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowDefaultSize: {
    width: 18,
    height: 18,
  },
  arrowLargeSize: {
    width: 22,
    height: 22,
  },
});
