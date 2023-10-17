import {useContext} from 'react';

import {BottomSheetStoreContext} from 'components/projects/BottomSheet/BottomSheetStore';

/**
 * controls bottomsheet
 *
 */
type Button = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};
type Options = {
  cancellable?: boolean;
  onDismiss?: () => void;
};

type ShowParam = {
  title: string;
  titleColor?: string;
  message?: string;
  buttons?: Button[];
};

type NotifyParam = {
  title?: string;
  message?: string;
  buttons?: Button[];
  timeout?: number;
  titleColor?: string;
  notify?: boolean;
  animation?: boolean;
};
export default function useBottomSheet() {
  const [store, dispatch] = useContext(BottomSheetStoreContext);
  return {
    /**
     * Alert.alert compatible API
     * @deprecated
     */
    alert: (title: string, message?: string, buttons?: Button[], _options?: Options) => {
      dispatch({
        type: 'addSheet',
        sheet: {
          title,
          message: message || '',
          buttons: buttons || [{text: 'OK', style: 'cancel'}],
          isModal: true,
        },
      });
    },
    /**
     * Shows modal dialog at the bottom of the screen
     *
     * @returns {() => void} - dismiss function
     */
    show({title, titleColor, message, buttons}: ShowParam): () => void {
      const newId = store._counter;
      dispatch({
        type: 'addSheet',
        sheet: {
          title,
          titleColor,
          message: message || '',
          buttons: buttons || [{text: 'OK', style: 'cancel'}],
          isModal: true,
        },
      });
      return () => {
        // sheet remover
        dispatch({
          type: 'dismissSheet',
          id: newId,
        });
      };
    },
    /**
     * Show bottom sheet as notification popup
     * auto-dismiss after timeout
     *
     * Note: setting buttons are discourared. Let it close by itself.
     */
    notify({title = '', message, buttons, timeout = 1000, titleColor, animation}: NotifyParam) {
      const newId = store._counter;
      dispatch({
        type: 'overwriteSheet',
        sheet: {
          title,
          message: message || '',
          buttons: buttons || [],
          isModal: false,
          titleColor,
          notify: true,
          animation,
        },
      });

      setTimeout(() => {
        dispatch({
          type: 'dismissSheet',
          id: newId,
        });
      }, timeout);
    },
  };
}
