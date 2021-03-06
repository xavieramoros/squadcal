// @flow

import type { ThreadInfo, VisibilityRules } from './thread-types';
import { threadInfoPropType, visibilityRulesPropType } from './thread-types';
import type { RelativeUserInfo } from './user-types';
import { relativeUserInfoPropType } from './user-types';

import invariant from 'invariant';
import PropTypes from 'prop-types';

export const messageType = {
  TEXT: 0,
  CREATE_THREAD: 1,
  ADD_MEMBERS: 2,
  CREATE_SUB_THREAD: 3,
  CHANGE_SETTINGS: 4,
  REMOVE_MEMBERS: 5,
  CHANGE_ROLE: 6,
  LEAVE_THREAD: 7,
  JOIN_THREAD: 8,
  CREATE_ENTRY: 9,
  EDIT_ENTRY: 10,
};
export type MessageType =
  | typeof messageType.TEXT
  | typeof messageType.CREATE_THREAD
  | typeof messageType.ADD_MEMBERS
  | typeof messageType.CREATE_SUB_THREAD
  | typeof messageType.CHANGE_SETTINGS
  | typeof messageType.REMOVE_MEMBERS
  | typeof messageType.CHANGE_ROLE
  | typeof messageType.LEAVE_THREAD
  | typeof messageType.JOIN_THREAD
  | typeof messageType.CREATE_ENTRY
  | typeof messageType.EDIT_ENTRY;
export function assertMessageType(
  ourMessageType: number,
): MessageType {
  invariant(
    ourMessageType === messageType.TEXT ||
      ourMessageType === messageType.CREATE_THREAD ||
      ourMessageType === messageType.ADD_MEMBERS ||
      ourMessageType === messageType.CREATE_SUB_THREAD ||
      ourMessageType === messageType.CHANGE_SETTINGS ||
      ourMessageType === messageType.REMOVE_MEMBERS ||
      ourMessageType === messageType.CHANGE_ROLE ||
      ourMessageType === messageType.LEAVE_THREAD ||
      ourMessageType === messageType.JOIN_THREAD ||
      ourMessageType === messageType.CREATE_ENTRY ||
      ourMessageType === messageType.EDIT_ENTRY,
    "number is not MessageType enum",
  );
  return ourMessageType;
}

export type RawTextMessageInfo = {|
  type: typeof messageType.TEXT,
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
  threadID: string,
  creatorID: string,
  time: number, // millisecond timestamp
  text: string,
|};

type RawInitialThreadState = {|
  name: string,
  parentThreadID: ?string,
  visibilityRules: VisibilityRules,
  color: string,
  memberIDs: string[],
|};

export type RawThreadCreationInfo = {|
  type: typeof messageType.CREATE_THREAD,
  id: string,
  threadID: string,
  creatorID: string,
  time: number,
  initialThreadState: RawInitialThreadState,
|};

export type RawAddMembersInfo = {|
  type: typeof messageType.ADD_MEMBERS,
  id: string,
  threadID: string,
  creatorID: string,
  time: number,
  addedUserIDs: string[],
|};

export type RawSubThreadCreationInfo = {|
  type: typeof messageType.CREATE_SUB_THREAD,
  id: string,
  threadID: string,
  creatorID: string,
  time: number,
  childThreadID: string,
|};

export type RawChangeThreadSettingsInfo = {|
  type: typeof messageType.CHANGE_SETTINGS,
  id: string,
  threadID: string,
  creatorID: string,
  time: number,
  field: string,
  value: string | number,
|};

export type RawRemoveMembersInfo = {|
  type: typeof messageType.REMOVE_MEMBERS,
  id: string,
  threadID: string,
  creatorID: string,
  time: number,
  removedUserIDs: string[],
|};

export type RawChangeRoleInfo = {|
  type: typeof messageType.CHANGE_ROLE,
  id: string,
  threadID: string,
  creatorID: string,
  time: number,
  userIDs: string[],
  newRole: string,
|};

export type RawLeaveThreadInfo = {|
  type: typeof messageType.LEAVE_THREAD,
  id: string,
  threadID: string,
  creatorID: string,
  time: number,
|};

export type RawJoinThreadInfo = {|
  type: typeof messageType.JOIN_THREAD,
  id: string,
  threadID: string,
  creatorID: string,
  time: number,
|};

export type RawCreateEntryInfo = {|
  type: typeof messageType.CREATE_ENTRY,
  id: string,
  threadID: string,
  creatorID: string,
  time: number,
  entryID: string,
  date: string,
  text: string,
|};

export type RawEditEntryInfo = {|
  type: typeof messageType.EDIT_ENTRY,
  id: string,
  threadID: string,
  creatorID: string,
  time: number,
  entryID: string,
  date: string,
  text: string,
|};

export type RawMessageInfo =
  RawTextMessageInfo |
  RawThreadCreationInfo |
  RawAddMembersInfo |
  RawSubThreadCreationInfo |
  RawChangeThreadSettingsInfo |
  RawRemoveMembersInfo |
  RawChangeRoleInfo |
  RawLeaveThreadInfo |
  RawJoinThreadInfo |
  RawCreateEntryInfo |
  RawEditEntryInfo;

export type TextMessageInfo = {|
  type: typeof messageType.TEXT,
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
  threadID: string,
  creator: RelativeUserInfo,
  time: number, // millisecond timestamp
  text: string,
|};

type InitialThreadState = {|
  name: string,
  parentThreadInfo: ?ThreadInfo,
  visibilityRules: VisibilityRules,
  color: string,
  otherMembers: RelativeUserInfo[],
|};
export type RobotextMessageInfo = {|
  type: typeof messageType.CREATE_THREAD,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  initialThreadState: InitialThreadState,
|} | {|
  type: typeof messageType.ADD_MEMBERS,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  addedMembers: RelativeUserInfo[],
|} | {|
  type: typeof messageType.CREATE_SUB_THREAD,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  childThreadInfo: ThreadInfo,
|} | {|
  type: typeof messageType.CHANGE_SETTINGS,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  field: string,
  value: string | number,
|} | {|
  type: typeof messageType.REMOVE_MEMBERS,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  removedMembers: RelativeUserInfo[],
|} | {|
  type: typeof messageType.CHANGE_ROLE,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  members: RelativeUserInfo[],
  newRole: string,
|} | {|
  type: typeof messageType.LEAVE_THREAD,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
|} | {|
  type: typeof messageType.JOIN_THREAD,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
|} | {|
  type: typeof messageType.CREATE_ENTRY,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  entryID: string,
  date: string,
  text: string,
|} | {|
  type: typeof messageType.EDIT_ENTRY,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  entryID: string,
  date: string,
  text: string,
|};

export type MessageInfo = TextMessageInfo | RobotextMessageInfo;

export const messageInfoPropType = PropTypes.oneOfType([
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.TEXT ]).isRequired,
    id: PropTypes.string,
    localID: PropTypes.string,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    text: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.CREATE_THREAD ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    initialThreadState: PropTypes.shape({
      name: PropTypes.string.isRequired,
      parentThreadInfo: threadInfoPropType,
      visibilityRules: visibilityRulesPropType.isRequired,
      color: PropTypes.string.isRequired,
      otherMembers: PropTypes.arrayOf(relativeUserInfoPropType).isRequired,
    }).isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.ADD_MEMBERS ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    addedMembers: PropTypes.arrayOf(relativeUserInfoPropType).isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.CREATE_SUB_THREAD ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    childThreadInfo: threadInfoPropType.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.CHANGE_SETTINGS ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    field: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string,
    ]).isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.REMOVE_MEMBERS ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    removedMembers: PropTypes.arrayOf(relativeUserInfoPropType).isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.CHANGE_ROLE ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    members: PropTypes.arrayOf(relativeUserInfoPropType).isRequired,
    newRole: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.LEAVE_THREAD ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.JOIN_THREAD ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.CREATE_ENTRY ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    entryID: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ messageType.EDIT_ENTRY ]).isRequired,
    id: PropTypes.string.isRequired,
    threadID: PropTypes.string.isRequired,
    creator: relativeUserInfoPropType.isRequired,
    time: PropTypes.number.isRequired,
    entryID: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  }),
]);

export type ThreadMessageInfo = {|
  messageIDs: string[],
  startReached: bool,
  lastNavigatedTo: number, // millisecond timestamp
  lastPruned: number, // millisecond timestamp
|};

export type MessageStore = {|
  messages: {[id: string]: RawMessageInfo},
  threads: {[threadID: string]: ThreadMessageInfo},
|};

export type MessageTruncationStatus = "truncated" | "unchanged" | "exhaustive";
export const messageTruncationStatus = {
  TRUNCATED: "truncated",
  UNCHANGED: "unchanged",
  EXHAUSTIVE: "exhaustive",
};
export function assertMessageTruncationStatus(
  ourMessageTruncationStatus: string,
): MessageTruncationStatus {
  invariant(
    ourMessageTruncationStatus === "truncated" ||
      ourMessageTruncationStatus === "unchanged" ||
      ourMessageTruncationStatus === "exhaustive",
    "string is not ourMessageTruncationStatus enum",
  );
  return ourMessageTruncationStatus;
}
