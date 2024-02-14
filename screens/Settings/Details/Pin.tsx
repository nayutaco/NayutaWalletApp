import {RouteProp, StackActions, useNavigation, useRoute} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity, Text, View, StyleSheet, Vibration} from 'react-native';
import TouchID from 'react-native-touch-id';
import MIcon from 'react-native-vector-icons/MaterialIcons';

import {ScrollablePage} from 'components/projects/Page';
import {InputStatus, ParamList} from 'navigation/paramList';
import {useStore} from 'store/storeContext';
import {useTheme} from 'styles/theme';
import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';
import {fontSizes, typographyFonts} from 'styles/variables';
import {LOG} from 'tools/logging';

type Props = RouteProp<ParamList, 'Pin'>;

export const PinScreen = () => {
  const {params} = useRoute<Props>();
  const navigation = useNavigation<StackNavigationProp<ParamList>>();
  const {t} = useTranslation();
  const [store, dispatch] = useStore();
  const {theme} = useTheme();
  const styles = useThemeAwareObject(createStyles);

  const [status, setStatus] = useState<InputStatus>(params.status);
  const [pinArray, setPinArray] = useState<number[]>([]);
  const [update, setUpdata] = useState<boolean>(false);
  const [dummyNum, setDummyNum] = useState('');
  const [errorIntervalFlag, setErrorIntervalFlag] = useState(false);
  const [intervalcount, setIntervalCount] = useState(0);
  const [remainCount, setRemainCount] = useState(0);

  useEffect(() => {
    setRemainCount(intervalcount);
  }, [intervalcount]);

  const optionalConfigObject = {
    title: t('detailSettings:biometricsAuth'), // Android
    imageColor: theme.color.accentPrimary, // Android
    imageErrorColor: theme.color.tertiary, // Android
    sensorDescription: t('detailSettings:touchSensor'), // Android
    sensorErrorDescription: t('failure'), // Android
    cancelText: t('cancel'), // Android
    //fallbackLabel: 'Show Passcode', // iOS (if empty, then label is hidden)
    unifiedErrors: false, // use unified error messages (default false)
    //passcodeFallback: false, // iOS - allows the device to fall back to using the passcode, if faceid/touch is not available. this does not mean that if touchid/faceid fails the first few times it will revert to passcode, rather that if the former are not enrolled, then it will use the passcode.
  };

  useEffect(() => {
    navigation.addListener('beforeRemove', e => {
      if (e.data.action.type === 'GO_BACK') {
        if (store.pin === pinArray.join('')) {
          navigation.dispatch(e.data.action);
        } else {
          e.preventDefault();
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, pinArray]);

  useEffect(() => {
    if ((params.status === 'ENTER' || params.status === 'FORE') && store.biometrics) {
      TouchID.authenticate(t('detailSettings:biometricsAuthMsg'), optionalConfigObject)
        .then(() => {
          if (params.status === 'ENTER') {
            // screenで遷移先を指定出来る。指定しない場合はCheck画面に遷移する。
            if (params.screen != null) {
              navigation.replace(params.screen.name, params.screen.params);
            } else {
              goToCheck();
            }
          } else if (params.status === 'FORE') {
            const converted = [...store.pin];
            setPinArray(Array.from(converted, pin => parseInt(pin, 10)));
            returnPrevious();
          }
        })
        .catch((error: any) => {
          LOG.error(error.toString());
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToCheck = () => {
    setPinArray([]);
    navigation.reset({index: 0, routes: [{name: 'Check', params: {value: 'unlock'}} as never]});
  };

  const returnPrevious = () => {
    setPinArray(pinArray);
    if (params.reset) {
      navigation.reset({index: 0, routes: [{name: 'Root'}] as never});
    } else {
      navigation.canGoBack() && navigation.goBack();
    }
  };

  const alertError = () => {
    let counter = intervalcount + 1;
    setPinArray([]);
    setErrorIntervalFlag(true);
    setIntervalCount(counter);
    Vibration.vibrate(200, false);
    setStatus('ERROR');
    const intervalId = setInterval(() => {
      counter--;
      setRemainCount(counter);
      if (counter === 0) {
        setErrorIntervalFlag(false);
        clearInterval(intervalId);
      }
    }, 1000);
  };

  const readPin = () => {
    switch (status) {
      case 'ENTER':
        if (store.pin === pinArray.join('')) {
          // screenで遷移先を指定出来る。指定しない場合はCheck画面に遷移する。
          if (params.screen != null) {
            navigation.replace(params.screen.name, params.screen.params);
          } else {
            goToCheck();
          }
        } else {
          alertError();
        }
        break;
      case 'FORE':
        if (store.pin === pinArray.join('')) {
          returnPrevious();
        } else {
          alertError();
        }
        break;
      case 'SETTINGS':
        if (store.pin === pinArray.join('')) {
          setPinArray([]);
          navigation.dispatch(StackActions.replace('SecureLockSettings'));
        } else {
          alertError();
        }
        break;
      case 'REGISTER':
        setPinArray([]);
        setDummyNum(pinArray.join(''));
        setStatus('CONFIRM');
        break;
      case 'CONFIRM':
        if (dummyNum === pinArray.join('')) {
          if (store.pin === '') {
            //When just after downloading or reset PIN
            dispatch({type: 'setPin', pin: pinArray.join('')});
            navigation.dispatch(StackActions.replace('SecureLockSettings'));
          } else {
            dispatch({type: 'setPin', pin: pinArray.join('')});
            navigation.goBack();
          }
        } else {
          alertError();
        }
        break;
      case 'ERROR':
        setPinArray([]);
        if (params.status === 'ENTER') {
          if (store.pin === pinArray.join('')) {
            // screenで遷移先を指定出来る。指定しない場合はCheck画面に遷移する。
            if (params.screen != null) {
              navigation.replace(params.screen.name, params.screen.params);
            } else {
              goToCheck();
            }
          } else {
            alertError();
          }
        } else if (params.status === 'FORE') {
          if (store.pin === pinArray.join('')) {
            returnPrevious();
          } else {
            alertError();
          }
        } else if (params.status === 'SETTINGS') {
          if (store.pin === pinArray.join('')) {
            navigation.dispatch(StackActions.replace('SecureLockSettings'));
          } else {
            alertError();
          }
        } else if (params.status === 'REGISTER') {
          if (dummyNum === pinArray.join('')) {
            dispatch({type: 'setPin', pin: pinArray.join('')});
            navigation.dispatch(StackActions.replace('SecureLockSettings'));
          } else {
            alertError();
          }
        }
    }
  };

  const addPin = (i: number) => {
    if (pinArray.length >= 4) {
      return;
    } else {
      pinArray.push(i);
      setUpdata(update ? false : true);
      if (pinArray.length === 4) {
        readPin();
      }
      return;
    }
  };

  const deletePin = () => {
    if (pinArray.length >= 1) {
      pinArray.pop();
      setUpdata(update ? false : true);
      return;
    } else {
      return;
    }
  };

  const titleSelector = () => {
    if (status === 'ENTER' || status === 'FORE' || status === 'SETTINGS') {
      return t('detailSettings:enterTitle');
    } else if (status === 'REGISTER' || status === 'CONFIRM') {
      if (store.pin === '') {
        return t('detailSettings:registerTitle');
      } else {
        return t('detailSettings:pinChange');
      }
    } else if (status === 'ERROR') {
      return t('error');
    }
  };

  const descriptionSelector = () => {
    if (status === 'ENTER' || status === 'FORE' || status === 'SETTINGS') {
      return t('detailSettings:enterDescription');
    } else if (status === 'REGISTER') {
      return t('detailSettings:registerDescription');
    } else if (status === 'CONFIRM') {
      return t('detailSettings:confirmDescription');
    } else if (status === 'ERROR') {
      return t('detailSettings:errorDescription');
    }
  };

  return (
    <ScrollablePage noHeader={true}>
      <View style={styles.container}>
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>{titleSelector()}</Text>
          <Text style={styles.description}>{descriptionSelector()}</Text>
          <Text style={styles.errorInterval}>{remainCount !== 0 && t('detailSettings:errorInterval', {count: remainCount})}</Text>
        </View>
        <View style={styles.inputDot}>
          <MIcon name={pinArray.length >= 1 ? 'circle' : 'radio-button-unchecked'} size={16} style={styles.dot} />
          <MIcon name={pinArray.length >= 2 ? 'circle' : 'radio-button-unchecked'} size={16} style={styles.dot} />
          <MIcon name={pinArray.length >= 3 ? 'circle' : 'radio-button-unchecked'} size={16} style={styles.dot} />
          <MIcon name={pinArray.length >= 4 ? 'circle' : 'radio-button-unchecked'} size={16} style={styles.dot} />
        </View>
        <View style={styles.row}>
          <TouchableOpacity style={styles.rowNumber} delayPressOut={50} onPress={() => addPin(1)} disabled={errorIntervalFlag}>
            <Text style={styles.numberButton}>1</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowNumber} delayPressOut={50} onPress={() => addPin(2)} disabled={errorIntervalFlag}>
            <Text style={styles.numberButton}>2</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowNumber} delayPressOut={50} onPress={() => addPin(3)} disabled={errorIntervalFlag}>
            <Text style={styles.numberButton}>3</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <TouchableOpacity style={styles.rowNumber} delayPressOut={50} onPress={() => addPin(4)} disabled={errorIntervalFlag}>
            <Text style={styles.numberButton}>4</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowNumber} delayPressOut={50} onPress={() => addPin(5)} disabled={errorIntervalFlag}>
            <Text style={styles.numberButton}>5</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowNumber} delayPressOut={50} onPress={() => addPin(6)} disabled={errorIntervalFlag}>
            <Text style={styles.numberButton}>6</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <TouchableOpacity style={styles.rowNumber} delayPressOut={50} onPress={() => addPin(7)} disabled={errorIntervalFlag}>
            <Text style={styles.numberButton}>7</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowNumber} delayPressOut={50} onPress={() => addPin(8)} disabled={errorIntervalFlag}>
            <Text style={styles.numberButton}>8</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowNumber} delayPressOut={50} onPress={() => addPin(9)} disabled={errorIntervalFlag}>
            <Text style={styles.numberButton}>9</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <TouchableOpacity disabled style={styles.rowNumber} />
          <TouchableOpacity style={styles.rowNumber} delayPressOut={50} onPress={() => addPin(0)} disabled={errorIntervalFlag}>
            <Text style={styles.numberButton}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowNumber} delayPressOut={50} onPress={() => deletePin()}>
            <View style={styles.deleteIconContainer}>
              <MIcon name="backspace" size={32} style={styles.icon} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollablePage>
  );
};

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      marginHorizontal: 28,
      backgroundColor: theme.color.background,
    },
    descriptionContainer: {
      marginBottom: 28,
    },
    descriptionTitle: {
      color: theme.color.textColor,
      fontFamily: typographyFonts.notoSansBold,
      fontSize: fontSizes.basic5,
      textAlign: 'center',
      marginBottom: 8,
    },
    description: {
      color: theme.color.textColor,
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      textAlign: 'center',
      marginBottom: 8,
    },
    errorInterval: {
      color: theme.color.tertiary,
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic5,
      textAlign: 'center',
    },
    inputDot: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    dot: {
      color: theme.color.textColor,
      marginHorizontal: 8,
    },
    numberButton: {
      color: theme.color.textColor,
      fontFamily: typographyFonts.notoSans,
      fontSize: fontSizes.basic3,
    },
    deleteIconContainer: {
      height: '100%',
      justifyContent: 'center',
    },
    icon: {
      color: theme.color.textColor,
    },
    row: {
      flexDirection: 'row',
    },
    rowNumber: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      height: 100,
      width: 100,
      borderRadius: 50,
      margin: 3,
    },
  });
  return styles;
};
