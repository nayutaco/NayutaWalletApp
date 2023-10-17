import {RouteProp, useRoute} from '@react-navigation/native';
import React, {useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';

import * as manager from 'bridge/manager';
import {ScrollablePage} from 'components/projects/Page';
import {Button} from 'components/uiParts/ButtonTheme';
import {ParamList} from 'navigation/paramList';
import {setRestarted} from 'store/storage';
import {useStore} from 'store/storeContext';
import {Theme} from 'styles/theme/interface';
import {useTheme} from 'styles/theme/themeContext';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, typographyFonts} from 'styles/variables';
import {LOG} from 'tools/logging';

type Props = RouteProp<ParamList, 'Shutdown'>;

export const ShutdownScreen = () => {
  const {t} = useTranslation();
  const {params} = useRoute<Props>();
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);
  const [, dispatch] = useStore();

  useEffect(() => {
    LOG.debug(`Rescan: ${params.rescan}`);
    if (params.rescan) {
      dispatch({
        type: 'setRescanWallet',
        rescanWallet: true,
      });
    }
    (async () => {
      await manager.stopLND();
      if (params.option === 'RESTART') {
        await setRestarted(true);
        manager.forceRestart();
      } else if (params.option === 'QUIT') {
        manager.killProcess();
      } else if (params.option === 'NONE') {
        return;
      } else {
        throw new Error("The option of this parameter allows 'QUIT' or 'RESTART' or 'NONE'");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollablePage noHeader>
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.color.textColor} />
        {(params.option === 'QUIT' || params.option === 'NONE') && <Text style={styles.description}>{t('shutdown:quit')}</Text>}
        {params.option === 'RESTART' && <Text style={styles.description}>{t('shutdown:restart')}</Text>}
        <Button onPress={() => manager.killProcess()} style={styles.forceKillButton}>
          <Text style={styles.forceKillButtonText}>{t('shutdown:forceKill')}</Text>
        </Button>
      </View>
    </ScrollablePage>
  );
};

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    description: {
      marginVertical: 56,
      color: theme.color.textColor,
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      textAlign: 'center',
    },
    forceKillButton: {
      justifyContent: 'flex-end',
      marginHorizontal: 28,
    },
    forceKillButtonText: {
      fontSize: fontSizes.buttonLabel,
      fontFamily: typographyFonts.notoSans,
      width: '100%',
      textAlign: 'center',
      letterSpacing: 2,
      color: theme.color.buttonTextColor,
    },
  });
  return styles;
};
