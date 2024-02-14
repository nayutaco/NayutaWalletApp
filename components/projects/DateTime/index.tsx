import React, {useMemo} from 'react';
import {Text, StyleProp, TextStyle} from 'react-native';

import {dateString} from 'tools/locale';

type Props = {
  timestamp?: string;
  style?: StyleProp<TextStyle>;
  noValueLabel?: string;
  showSeconds?: boolean;
};

export const formatDate = (timestamp: string, noValueLabel: string, showSeconds: boolean): string => {
  if (!timestamp) {
    return noValueLabel;
  }

  const dateObj = new Date(parseInt(timestamp, 10) * 1000);
  return dateString(dateObj, showSeconds);
};

export const DateTime = ({timestamp = '', style = {}, noValueLabel = '---', showSeconds = true}: Props) => {
  const dateTime = useMemo(() => {
    return formatDate(timestamp, noValueLabel, showSeconds);
  }, [timestamp, noValueLabel, showSeconds]);
  return <Text style={style}>{dateTime}</Text>;
};
