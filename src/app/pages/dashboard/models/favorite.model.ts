import { BaseState } from 'src/app/store/states/base.state';

export interface Favorite {
  id: string;
  type?: string;
  notification: BaseState;
}