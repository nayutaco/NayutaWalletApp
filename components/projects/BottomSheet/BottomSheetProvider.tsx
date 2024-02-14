import React, {ReactNode, useEffect, useReducer} from 'react';
import {AppState, StyleSheet, Text} from 'react-native';

import BottomSheet from './BottomSheet';

import {reducer, defaultState, BottomSheetStoreContext} from './BottomSheetStore';

import {Theme} from 'styles/theme/interface';
import {useThemeAwareObject} from 'styles/theme/themeHook';

import {fontSizes} from 'styles/variables';

export function BottomSheetProvider({children}: {children: ReactNode}) {
  const [state, dispatch] = useReducer(reducer, defaultState);
  const styles = useThemeAwareObject(createStyles);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        state.sheets.map(sheet => {
          if (sheet._id !== undefined && sheet._id >= 0) {
            dispatch({type: 'dismissSheet', id: sheet._id});
          }
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [state.sheets]);

  return (
    <BottomSheetStoreContext.Provider value={[state, dispatch]}>
      {state.sheets.map(({title, message, buttons, isModal, titleColor, notify, animation, _id}, i) => (
        <BottomSheet
          key={i}
          title={title}
          buttons={buttons.map(btn => ({
            text: btn.text,
            // _id is set internally thus _id is substantially non-null
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            onPress: btn.onPress ?? (() => dispatch({type: 'dismissSheet', id: _id!})),
            style: btn.style,
          }))}
          modal={isModal}
          titleColor={titleColor}
          notify={notify}
          animation={animation}>
          <Text style={styles.message}>{message}</Text>
        </BottomSheet>
      ))}
      {children}
    </BottomSheetStoreContext.Provider>
  );
}

const createStyles = (theme: Theme) => {
  const styles = StyleSheet.create({
    message: {
      fontSize: fontSizes.notifyMessage,
      color: theme.color.textColor,
    },
  });
  return styles;
};
