import {EventEmitter} from 'fbemitter';
import {NativeEventEmitter} from 'react-native';

/**
 * wait for seconds
 * @internal
 */
export function waitForSec(sec: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, sec * 1000);
  });
}

/**
 * Factory function that generates function
 * The generated function waits for given EventEmitter
 * and waits for the given event
 *
 * ```
 * const ee = new EventEmitter();
 * const waitFor = waitForFactory(ee);
 * async function foo() {
 *  const someValue = await waitFor<SomeType>("evt");
 * }
 * ```
 *
 * Q. Why don't EventEmitter extended class?
 *
 * A. I want to wait for existing EventEmitter instance.
 *
 * Q. Why don't modify prototype
 *
 * A. I don't like to modify prototype. I prefer doing it by composition when in JavaScript
 *
 * @param ee EventEmitter
 */
export const waitForFactory =
  (ee: EventEmitter | NativeEventEmitter) =>
  <T = any>(evtName: string) => {
    return new Promise(resolve => {
      const subscription = ee.addListener(evtName, (arg: T) => {
        subscription.remove();
        resolve(arg);
      });
    });
  };
