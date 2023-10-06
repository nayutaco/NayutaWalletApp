import {createContext, Dispatch} from 'react';

type Button = {
  text: string;
  onPress?: () => void;
  style?: string;
};
type Sheet = {
  title: string;
  message: string;
  buttons: Button[];
  isModal: boolean;
  titleColor?: string;
  notify?: boolean;
  animation?: boolean;
  /**
   * @internal
   * Unique id for the bottom sheet.
   * it is generally determined internally and should not be set manually.
   */
  _id?: number;
};

type State = {
  /**
   * Array of the currently visible bottom sheets.
   */

  sheets: Sheet[];
  /**
   * accumulator
   *
   * Used to assign unique id for each bottom sheet.
   */
  _counter: number;
};
export const defaultState = {
  sheets: [],
  _counter: 0,
};
type Action =
  | {
      type: 'addSheet';
      sheet: Sheet;
    }
  | {
      type: 'overwriteSheet';
      sheet: Sheet;
    }
  | {
      type: 'dismissSheet';
      id: number;
    };
export const BottomSheetStoreContext = createContext<[State, Dispatch<Action>]>([
  defaultState,
  /* eslint @typescript-eslint/no-empty-function: 0*/
  () => {},
]);

export const reducer = (state: State, action: Action) => {
  switch (action.type) {
    case 'addSheet':
      return {
        _counter: state._counter + 1,
        sheets: [...state.sheets, {...action.sheet, _id: state._counter}],
      };
    case 'overwriteSheet':
      return {
        _counter: state._counter,
        sheets: [{...action.sheet, _id: state._counter}],
      };
    case 'dismissSheet':
      return {
        ...state,
        sheets: state.sheets.filter(s => s._id !== action.id),
      };
    default:
      return state;
  }
};
