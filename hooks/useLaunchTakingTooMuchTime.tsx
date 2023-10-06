import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Alert} from 'react-native';

import {killProcess, forceRestart, getLndExitReason} from 'bridge/manager';
import {useLND} from 'hooks/useLND';

export function useLaunchTakingTooMuchTime() {
  const {t} = useTranslation();
  const {status} = useLND();
  const [opened, setOpened] = useState(false);
  const [hasTimedOut, setTimedOut] = useState(false);
  const [exitReason, setErrorReason] = useState('');
  const timeout = 180;

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    if (!opened) {
      timerId = setTimeout(() => setTimedOut(true), timeout * 1000);
    }
    return () => {
      timerId !== null && clearTimeout(timerId);
    };
  }, [opened]);
  useEffect(() => {
    setErrorReason(getLndExitReason());
    if (!opened) {
      if (exitReason.length > 0) {
        // LND error
        setOpened(true);
        Alert.alert(t('home:failLndTitle'), `${exitReason}`, [
          {
            text: t('home:failQuit'),
            onPress: killProcess,
            style: 'destructive',
          },
        ]);
      } else if (hasTimedOut && status && !status.ready && status.started) {
        // LND status ready waiting timeout
        setOpened(true);
        Alert.alert(t('home:failLaunchTitle'), t('home:failLaunchMsg'), [
          {
            text: t('home:failWait'),
            onPress: () => {
              setOpened(false);
            },
            style: 'cancel',
          },
          {
            text: t('home:failRestart'),
            onPress: () => {
              forceRestart();
            },
            style: 'destructive',
          },
        ]);
        setTimedOut(false);
      }
    }
  }, [opened, exitReason, hasTimedOut, status, t]);
}
