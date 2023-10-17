import * as bgtimer from './bgtimer';

jest.mock('react-native-background-timer', () => {
  return {
    runBackgroundTimer: jest.fn(),
    stopBackgroundTimer: jest.fn(),
  };
});

describe('bgtimer', () => {
  const evtName = 'test';

  beforeEach(() => {
    while (bgtimer.testTimerHandler.length > 0) {
      bgtimer.testTimerHandler.pop();
    }
    bgtimer.delHandler(evtName);
  });

  it('addHandler: minWaitMsec is too small', () => {
    jest.mock('react-native-background-timer', () => {
      return {
        runBackgroundTimer: (handler: () => void, tick: number) => {
          console.log(`tick: ${tick}`);
          handler();
        },
      };
    });
    const handler = () => ({});
    const minWaitMsec = 0;
    expect(() => bgtimer.addHandler(evtName, minWaitMsec, false, handler, false)).toThrow(Error);
  });

  it('addHandler: minimum minWaitMsec', () => {
    jest.mock('react-native-background-timer', () => {
      return {
        runBackgroundTimer: (handler: () => void, tick: number) => {
          console.log(`tick: ${tick}`);
          handler();
        },
      };
    });
    const handler = () => ({});
    const minWaitMsec = 1;
    bgtimer.addHandler(evtName, minWaitMsec, false, handler, false);
    expect(bgtimer.testTimerHandler.length).toBe(1);
    expect(bgtimer.testTimerHandler[0].execThreshold).toBe(2);
  });

  it('addHandler: tick-1', () => {
    jest.mock('react-native-background-timer', () => {
      return {
        runBackgroundTimer: (handler: () => void, tick: number) => {
          console.log(`tick: ${tick}`);
          handler();
        },
      };
    });
    const handler = () => ({});
    const minWaitMsec = 4999;
    bgtimer.addHandler(evtName, minWaitMsec, false, handler, false);
    expect(bgtimer.testTimerHandler.length).toBe(1);
    expect(bgtimer.testTimerHandler[0].execThreshold).toBe(2);
  });

  it('addHandler: tick', () => {
    jest.mock('react-native-background-timer', () => {
      return {
        runBackgroundTimer: (handler: () => void, tick: number) => {
          console.log(`tick: ${tick}`);
          handler();
        },
      };
    });
    const handler = () => ({});
    const minWaitMsec = 5000;
    bgtimer.addHandler(evtName, minWaitMsec, false, handler, false);
    expect(bgtimer.testTimerHandler.length).toBe(1);
    expect(bgtimer.testTimerHandler[0].execThreshold).toBe(2);
  });

  it('addHandler: tick+1', () => {
    jest.mock('react-native-background-timer', () => {
      return {
        runBackgroundTimer: (handler: () => void, tick: number) => {
          console.log(`tick: ${tick}`);
          handler();
        },
      };
    });
    const handler = () => ({});
    const minWaitMsec = 5001;
    bgtimer.addHandler(evtName, minWaitMsec, false, handler, false);
    expect(bgtimer.testTimerHandler.length).toBe(1);
    expect(bgtimer.testTimerHandler[0].execThreshold).toBe(3);
  });

  it('addTimer: restart', () => {
    jest.mock('react-native-background-timer', () => {
      return {
        runBackgroundTimer: (handler: () => void, tick: number) => {
          console.log(`tick: ${tick}`);
          handler();
        },
      };
    });
    const handler = () => ({});
    const minWaitMsec = 5000;
    // not registered and restart -> OK
    bgtimer.addHandler(evtName, minWaitMsec, false, handler, true);
    expect(bgtimer.testTimerHandler.length).toBe(1); // added
    expect(bgtimer.testTimerHandler[0].execThreshold).toBe(2);
    // registered and not restart -> NG
    expect(() => bgtimer.addHandler(evtName, minWaitMsec, false, handler, false)).toThrow(Error);
    // registered and restart -> OK
    bgtimer.testTimerRun();
    expect(bgtimer.testTimerHandler[0].count).toBe(1);
    bgtimer.addHandler(evtName, minWaitMsec, false, handler, true);
    expect(bgtimer.testTimerHandler.length).toBe(1); // not added
    expect(bgtimer.testTimerHandler[0].execThreshold).toBe(2);
    expect(bgtimer.testTimerHandler[0].count).toBe(0); // reset counter
  });

  it('delTimer', () => {
    jest.mock('react-native-background-timer', () => {
      return {
        runBackgroundTimer: (handler: () => void, tick: number) => {
          console.log(`tick: ${tick}`);
          handler();
        },
      };
    });
    const handler = () => ({});
    const minWaitMsec = 5000;
    bgtimer.addHandler(evtName, minWaitMsec, false, handler, false);
    expect(bgtimer.testTimerHandler.length).toBe(1);
    expect(bgtimer.testTimerHandler[0].execThreshold).toBe(2);
    // not registered event name -> NG
    expect(bgtimer.delHandler('test1')).toBeFalsy();
    expect(bgtimer.testTimerHandler.length).toBe(1);
    // registered event name -> OK
    expect(bgtimer.delHandler(evtName)).toBeTruthy();
    expect(bgtimer.testTimerHandler.length).toBe(0);
  });

  it('repeat: 5000ms', () => {
    jest.mock('react-native-background-timer', () => {
      return {
        runBackgroundTimer: (handler: () => void, tick: number) => {
          console.log(`tick: ${tick}`);
          handler();
        },
      };
    });
    let called = false;
    const handler = () => {
      called = true;
    };
    // oneshot: OFF
    const minWaitMsec = 5000;
    bgtimer.addHandler(evtName, minWaitMsec, false, handler, false);
    expect(bgtimer.testTimerHandler.length).toBe(1);

    // 初回は2カウントでハンドラーが呼ばれる
    expect(bgtimer.testTimerHandler[0].execThreshold).toBe(2);

    bgtimer.testTimerRun();
    expect(bgtimer.testTimerHandler[0].count).toBe(1);
    expect(called).toBeFalsy();
    called = false;
    bgtimer.testTimerRun();
    expect(bgtimer.testTimerHandler[0].count).toBe(0);
    expect(called).toBeTruthy();
    called = false;

    // 以降は1カウントでハンドラーが呼ばれる
    for (let lp = 0; lp < 10; lp++) {
      expect(bgtimer.testTimerHandler[0].execThreshold).toBe(1);

      bgtimer.testTimerRun();
      expect(bgtimer.testTimerHandler[0].count).toBe(0);
      expect(called).toBeTruthy();
      called = false;
    }
  });

  it('repeat: 10000ms', () => {
    jest.mock('react-native-background-timer', () => {
      return {
        runBackgroundTimer: (handler: () => void, tick: number) => {
          console.log(`tick: ${tick}`);
          handler();
        },
      };
    });
    let called = false;
    const handler = () => {
      called = true;
    };
    const minWaitMsec = 10000;
    bgtimer.addHandler(evtName, minWaitMsec, false, handler, false);
    expect(bgtimer.testTimerHandler.length).toBe(1);

    // 初回は3カウントでハンドラーが呼ばれる
    expect(bgtimer.testTimerHandler[0].execThreshold).toBe(3);

    bgtimer.testTimerRun();
    expect(bgtimer.testTimerHandler[0].count).toBe(1);
    expect(called).toBeFalsy();
    called = false;
    bgtimer.testTimerRun();
    expect(bgtimer.testTimerHandler[0].count).toBe(2);
    expect(called).toBeFalsy();
    called = false;
    bgtimer.testTimerRun();
    expect(bgtimer.testTimerHandler[0].count).toBe(0);
    expect(called).toBeTruthy();
    called = false;

    // 以降は2カウントでハンドラーが呼ばれる
    for (let lp = 0; lp < 10; lp++) {
      expect(bgtimer.testTimerHandler[0].execThreshold).toBe(2);

      bgtimer.testTimerRun();
      expect(bgtimer.testTimerHandler[0].count).toBe(1);
      expect(called).toBeFalsy();
      called = false;
      bgtimer.testTimerRun();
      expect(bgtimer.testTimerHandler[0].count).toBe(0);
      expect(called).toBeTruthy();
      called = false;
    }
  });

  it('oneshot: 5000ms', () => {
    jest.mock('react-native-background-timer', () => {
      return {
        runBackgroundTimer: (handler: () => void, tick: number) => {
          console.log(`tick: ${tick}`);
          handler();
        },
      };
    });
    let called = false;
    const handler = () => {
      called = true;
    };
    const minWaitMsec = 5000;
    bgtimer.addHandler(evtName, minWaitMsec, true, handler, false);
    expect(bgtimer.testTimerHandler.length).toBe(1);
    expect(bgtimer.testTimerHandler[0].execThreshold).toBe(2);

    bgtimer.testTimerRun();
    expect(bgtimer.testTimerHandler[0].count).toBe(1);
    expect(called).toBeFalsy();
    called = false;
    bgtimer.testTimerRun();
    expect(bgtimer.testTimerHandler.length).toBe(0);
    expect(called).toBeTruthy();
  });

  it('oneshot: 15000ms', () => {
    jest.mock('react-native-background-timer', () => {
      return {
        runBackgroundTimer: (handler: () => void, tick: number) => {
          console.log(`tick: ${tick}`);
          handler();
        },
      };
    });
    let called = false;
    const handler = () => {
      called = true;
    };
    // oneshot: ON
    bgtimer.addHandler(evtName, 15000, true, handler, false);
    expect(bgtimer.testTimerHandler.length).toBe(1);
    expect(bgtimer.testTimerHandler[0].execThreshold).toBe(4);

    // 1
    bgtimer.testTimerRun();
    expect(bgtimer.testTimerHandler[0].count).toBe(1);
    expect(called).toBeFalsy();
    called = false;
    // 2
    bgtimer.testTimerRun();
    expect(bgtimer.testTimerHandler[0].count).toBe(2);
    expect(called).toBeFalsy();
    called = false;
    // 3
    bgtimer.testTimerRun();
    expect(bgtimer.testTimerHandler[0].count).toBe(3);
    expect(called).toBeFalsy();
    called = false;
    // 4
    bgtimer.testTimerRun();
    expect(bgtimer.testTimerHandler.length).toBe(0);
    expect(called).toBeTruthy();
  });
});
