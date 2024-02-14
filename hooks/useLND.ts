/* eslint @typescript-eslint/no-unused-vars: 0 */
import {useEffect, useState} from 'react';

import LndReactController from 'bridge/LndReactController';
import * as manager from 'bridge/manager';
import * as types from 'types/index';

export function useLND() {
  /* state variable.
    variable is ratained between rerender unless `set*()` is called
  */
  const [lndStatus, setLndStatus] = useState<types.LNDStatus | null>(null);

  useEffect(() => {
    (global as any).manager = manager as any;
    (global as any).lnd = LndReactController as any;
  }, []);

  useEffect(() => {
    let isUnmounted = false;
    manager.getStatus().then(status => {
      if (isUnmounted) return;
      setLndStatus(status); // initial status
    });
    return () => {
      isUnmounted = true;
    };
  }, []);
  useEffect(() => {
    let isUnmounted = false;
    const listener = manager.statusUpdatedListener((info: any) => {
      if (isUnmounted) return;
      setLndStatus(info); // update status
    });
    return () => {
      isUnmounted = true;
      listener.remove();
    };
  }, []);
  return {status: lndStatus};
}
