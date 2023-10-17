export const direction = {
  pay: 'pay',
  receive: 'receive',
  dummy: 'dummy',
} as const;
export type Direction = typeof direction[keyof typeof direction];
