export interface INotification {
  readonly to: string[];
  readonly title: string;
  readonly body: string;
  readonly subtitle?: string;
  readonly data?: string;
}
export interface ISendNotification {
  readonly userId: number;
  readonly title: string;
  readonly body: string;
  readonly subtitle?: string;
  readonly data?: string;
}
