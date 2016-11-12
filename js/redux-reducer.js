// @flow

import type { SquadInfo } from './squad-info';
import type { EntryInfo } from './calendar/entry-info';

import invariant from 'invariant';

export type AppState = {
  thisURL: string,
  baseURL: string,
  monthURL: string,
  currentNavID: string,
  currentNavName: string,
  loggedIn: bool,
  username: string,
  email: string,
  emailVerified: bool,
  sessionID: string,
  year: number,
  month: number, // 1-indexed
  show: string,
  verifyCode: string,
  resetPasswordUsername: string,
  entryInfos: {[day: string]: {[id: string]: EntryInfo}},
  squadInfos: {[id: string]: SquadInfo},
};

export type UpdateCallback = (prevState: AppState) => AppState;
export type UpdateStore = (update: UpdateCallback) => void;

export type Action =
  { type: "@@redux/INIT" } |
  { type: "GENERIC", callback: UpdateCallback };

export default function reducer(state: AppState, action: Action) {
  if (action.type === "GENERIC") {
    return action.callback(state);
  }
  return state;
}