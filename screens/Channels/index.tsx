import React from 'react';
import {useTranslation} from 'react-i18next';
import {View, StyleSheet, ActivityIndicator} from 'react-native';

import {ChannelList} from 'components/projects/ChannelList';
import {ScrollablePage} from 'components/projects/Page';
import {useLND} from 'hooks/useLND';
import {useTheme} from 'styles/theme/themeContext';

export function Channels() {
  const {status} = useLND();
  const {t} = useTranslation();
  const {theme} = useTheme();

  //const hasChannel = status?.channels && status.channels.length > 0;
  //const hasOpeningChannel = status?.channels && status.channels.some((i) => i.status === 'opening');

  return (
    <ScrollablePage title={t('channels')}>
      {status?.channels ? (
        <View style={styles.container}>
          <ChannelList channels={status?.channels} />
        </View>
      ) : (
        <ActivityIndicator size="large" color={theme.color.textColor} />
      )}
    </ScrollablePage>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
});
