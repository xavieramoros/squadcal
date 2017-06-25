// @flow

import type { MessageInfo } from '../types/message-types';

import invariant from 'invariant';

// Prefers localID
function messageKey(messageInfo: MessageInfo): string {
  if (messageInfo.localID) {
    return messageInfo.localID;
  }
  invariant(messageInfo.id, "localID should exist if ID does not");
  return messageInfo.id;
}

// Prefers serverID
function messageID(messageInfo: MessageInfo): string {
  if (messageInfo.id) {
    return messageInfo.id;
  }
  invariant(messageInfo.localID, "localID should exist if ID does not");
  return messageInfo.localID;
}

export { messageKey, messageID }