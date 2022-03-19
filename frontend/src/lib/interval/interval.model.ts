export abstract class Interval {
  id?: number;
  name?: string;
  // eslint-disable-next-line @typescript-eslint/ban-types
  handler?: Function;
  interval?: number;
  arguments?: any[];
  timestamp?: number;
}
