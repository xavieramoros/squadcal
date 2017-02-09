// @flow

import type {
  BaseAppState,
  BaseAction,
} from '../types/redux-types';
import type { CalendarInfo } from '../types/calendar-types';

import invariant from 'invariant';

export default function reduceCalendarInfos<T: BaseAppState>(
  state: {[id: string]: CalendarInfo},
  action: BaseAction<T>,
): {[id: string]: CalendarInfo} {
  if (
    action.type === "LOG_OUT_SUCCESS" ||
      action.type === "DELETE_ACCOUNT_SUCCESS"
  ) {
    return action.payload;
  }
  return state;
}