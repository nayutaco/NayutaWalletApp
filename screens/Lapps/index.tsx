import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React from 'react';
import {useTranslation} from 'react-i18next';
import {View, StyleSheet, Linking, Platform} from 'react-native';

import LappListItem from 'components/projects/LappListItem';
import {ScrollablePage} from 'components/projects/Page';
import {Card} from 'components/uiParts/Card';

import lapps from 'misc/lapps';
import {ParamList} from 'navigation/paramList';
import {LOG} from 'tools/logging';
import {AppDetail} from 'types';

const apps: {[key: string]: AppDetail[]} = {};
lapps.forEach((app: AppDetail) => {
  apps[app.category] = [...(apps[app.category] || []), app]; // awful hack
});

/**
 * Return the lapps screen
 * @returns {JSX.Element} Lapps Screen
 */
export const LappsScreen = () => {
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const {t} = useTranslation();

  const connect = (app: AppDetail) => {
    if (app.connect) {
      navigation.navigate('Connect', {appId: app.appId});
    } else {
      Linking.openURL(app.homepage);
    }
  };

  return (
    <ScrollablePage title={t('lapps')}>
      {Object.keys(apps).map(category => (
        <Card title={t(`category:${category}`)} key={category} style={styles.category} innerStyle={styles.innerStyle} noShadow>
          <View style={styles.appList}>
            {apps[category].map((app, index) => {
              switch (Platform.OS) {
                case 'android':
                  return <LappListItem name={app.name} source={app.icon} key={index} onPress={() => connect(app)} />;
                  break;
                case 'ios':
                  if (app.enableIos) {
                    return <LappListItem name={app.name} source={app.icon} key={index} onPress={() => connect(app)} />;
                  }
                  break;
                default:
                  LOG.debug('Lapps: None displayable items.');
              }
            })}
          </View>
        </Card>
      ))}
    </ScrollablePage>
  );
};

const styles = StyleSheet.create({
  appList: {
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 0,
  },
  category: {
    marginVertical: 8,
  },
  innerStyle: {
    padding: 0,
  },
});
