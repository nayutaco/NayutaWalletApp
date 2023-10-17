import * as channel from './channel';
import LndReactController from './LndReactController';
import * as manager from './manager';
import * as request from './request';

import {LOG} from 'tools/logging';

export async function addChannelList(channelPoint: string): Promise<void> {
  await LndReactController.ccAddChannelList(channelPoint);
}

export async function removeChannelList(channelPoint: string): Promise<void> {
  await LndReactController.ccRemoveChannelList(channelPoint);
}

export async function removeChannelListAll(): Promise<void> {
  await LndReactController.ccRemoveChannelListAll();
}

export async function startup() {
  LOG.info('closechecker.startup()');

  const params = await LndReactController.ccGetAlarmParams();
  LOG.info(`close checker params: ${JSON.stringify(params)}`);
  await sync();

  // add closechecker DB on open channel
  request.subscribeChannelEvents();
  channel.addChannelEventListener((event, channelPoint) => {
    switch (event) {
      case 'OPEN_CHANNEL':
        console.log(`detect open channel: ${channelPoint}`);
        addChannelList(channelPoint);
        break;
      case 'CLOSED_CHANNEL':
        removeChannelList(channelPoint);
        break;
      case 'completed':
        LOG.trace('closechecker: completed');
        manager.emitEventCompleted('addChannelEventListener:completed', event);
        break;
      default:
        console.error(`closechecker: unknown event: ${event}`);
        manager.emitEventCompleted('addChannelEventListener:unknown event', event);
    }
  });
}

// sync closechecker DB and LND channels
export async function sync() {
  await removeChannelListAll();
  const list = await channel.listChannels();
  for (let lp = 0; lp < list.length; lp++) {
    LOG.debug(`add close checker: ${list[lp].channel_point}`);
    await addChannelList(list[lp].channel_point);
  }
}

export async function getAlarmParams(): Promise<{enabled: boolean; intervalMinute: string; limitMinute: string}> {
  const params = await LndReactController.ccGetAlarmParams();
  return {enabled: params.enabled, intervalMinute: params.intervalMinute, limitMinute: params.limitMinute};
}

export async function setAlarmParams(enabled: boolean, intervalMinute: number, limitMinute: number) {
  await LndReactController.ccSetAlarmParams(enabled, intervalMinute, limitMinute);
}
