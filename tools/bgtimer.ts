import BackgroundTimer from 'react-native-background-timer';

import {LOG} from './logging';

const tickMsec = 5000; // msec

type TimerType = {
  eventName: string;
  execThreshold: number;
  oneshot: boolean;
  handler: () => void;

  count: number;
  notExecuted: boolean;
};
const timerHandler: TimerType[] = [];

/**
 * addHandler add a handler function to BackgroundTimer.
 *
 * @param {string} eventName - Event name for log
 * @param {number} minWaitMsec - Minimum time to wait before executing the handler. Pick the right number otherwise handler will never be executed.
 * @param {boolean} oneshot - If true, remove the handler after event handler called.
 * @param {function} handler - If true and same eventName already registered, reset the handler counter and restart count.
 */
export function addHandler(eventName: string, minWaitMsec: number, oneshot: boolean, handler: () => void, restart?: boolean) {
  LOG && LOG.trace(`bgtimer.addHandler(${eventName})`);
  for (const fn of timerHandler) {
    if (fn.eventName === eventName) {
      if (restart) {
        LOG && LOG.trace(`bgtimer.addHandler(${eventName}): restart(count=${fn.count})`);
        fn.count = 0;
        return;
      } else {
        throw new Error(`bgtimer.addHandler(${eventName}): event already registered`);
      }
    }
  }
  const reg = {
    eventName,
    execThreshold: Math.ceil(minWaitMsec / tickMsec) + 1, // minWaitMsec 〜 minWaitMsec+tickMsec の範囲で発火する
    oneshot,
    handler,
    count: 0,
    notExecuted: true,
  };
  if (reg.execThreshold < 2) {
    // 1以下の場合はタイマがすぐに発火する可能性がある
    throw new Error(`bgtimer.addHandler(${eventName}): minWaitMsec(${minWaitMsec}) too small`);
  }
  timerHandler.push(reg);
  LOG && LOG.trace(`bgtimer.addHandler(${eventName}): done`);
}

/**
 * delHandler delete the registered handler.
 *
 * @param {string} eventName - Event name for log
 * @return true: delete handler
 */
export function delHandler(eventName: string): boolean {
  LOG && LOG.trace(`bgtimer.delHandler(${eventName})`);
  for (let lp = 0; lp < timerHandler.length; lp++) {
    if (timerHandler[lp].eventName === eventName) {
      timerHandler.splice(lp, 1);
      LOG && LOG.trace(`bgtimer.delHandler(${eventName}): done`);
      return true;
    }
  }
  return false;
}

const timerRun = () => {
  LOG && LOG.trace('bgtimer.timerRun');
  for (const fn of timerHandler) {
    fn.count++;
    LOG && LOG.trace(`bgtimer.timerRun: count(${fn.count}), fireTick(${fn.execThreshold})`);
    if (fn.count >= fn.execThreshold) {
      LOG && LOG.trace(`bgtimer.fire: ${fn.eventName}`);
      fn.handler();
      fn.count = 0;
      if (fn.notExecuted) {
        // 初回はタイマー登録タイミングによってはすぐに実行されるため+1していたので初回以降は元に戻す
        fn.execThreshold--;
        fn.notExecuted = false;
      }
      if (fn.oneshot) {
        fn.execThreshold = 0;
        delHandler(fn.eventName);
      }
    }
  }
  BackgroundTimer.stopBackgroundTimer();
  BackgroundTimer.runBackgroundTimer(timerRun, tickMsec);
};

export function start() {
  BackgroundTimer.runBackgroundTimer(timerRun, tickMsec);
}

LOG && LOG.trace('bgtimer.start');
start();

/**
 * for jest
 */
export const testTimerHandler = timerHandler;
export function testTimerRun() {
  timerRun();
}
