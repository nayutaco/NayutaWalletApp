import LndReactController from 'bridge/LndReactController';

export const message = {
  backupScb: 'Backup channel: {RESULT}',
  backupScbFail: 'Fail backup channel: {RESULT}',
  backupDb: 'Backup database: {RESULT}',
  backupDbFail: 'Fail backup database: {RESULT}',
  shutdown: 'Shutting Down...',
};
export const iconType = {
  normal: 0,
  alert: 2,
};

// export function messageNotification(msg: string, icon: number) {
//   LndReactController.messageNotification(msg, icon);
// }

export function messageNormal(msg: string) {
  LndReactController.messageNotification(msg, iconType.normal);
}

export function messageAlert(msg: string) {
  LndReactController.messageNotification(msg, iconType.alert);
}

export function iconNormal() {
  LndReactController.messageNotification('', iconType.normal);
}
