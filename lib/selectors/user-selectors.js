// @flow

import type { BaseAppState } from '../types/redux-types';
import type { UserInfo, RelativeUserInfo } from '../types/user-types';
import type { MemberInfo, RelativeMemberInfo } from '../types/thread-types';

import { createSelector } from 'reselect';
import _memoize from 'lodash/memoize';
import _keys from 'lodash/keys';

import SearchIndex from '../shared/search-index';

// Used for specific message payloads that include an array of user IDs, ie.
// array of initial users, array of added users
function userIDsToRelativeUserInfos(
  userIDs: string[],
  viewerID: ?string,
  userInfos: {[id: string]: UserInfo},
): RelativeUserInfo[] {
  const relativeUserInfos = [];
  for (let userID of userIDs) {
    const username = userInfos[userID]
      ? userInfos[userID].username
      : null;
    if (userID === viewerID) {
      relativeUserInfos.unshift({
        id: userID,
        username,
        isViewer: true,
      });
    } else {
      relativeUserInfos.push({
        id: userID,
        username,
        isViewer: false,
      });
    }
  }
  return relativeUserInfos;
}

// Includes current user at the start
const baseRelativeMemberInfoSelectorForMembersOfThread = (threadID: string) =>
  createSelector(
    (state: BaseAppState) => state.threadInfos[threadID].members,
    (state: BaseAppState) => state.currentUserInfo && state.currentUserInfo.id,
    (state: BaseAppState) => state.userInfos,
    (
      memberInfos: MemberInfo[],
      currentUserID: ?string,
      userInfos: {[id: string]: UserInfo},
    ): RelativeMemberInfo[] => {
      const relativeMemberInfos = [];
      for (let memberInfo of memberInfos) {
        const username = userInfos[memberInfo.id]
          ? userInfos[memberInfo.id].username
          : null;
        if (memberInfo.id === currentUserID) {
          relativeMemberInfos.unshift({
            id: memberInfo.id,
            role: memberInfo.role,
            permissions: memberInfo.permissions,
            username,
            isViewer: true,
          });
        } else {
          relativeMemberInfos.push({
            id: memberInfo.id,
            role: memberInfo.role,
            permissions: memberInfo.permissions,
            username,
            isViewer: false,
          });
        }
      }
      return relativeMemberInfos;
    },
  );

const relativeMemberInfoSelectorForMembersOfThread = _memoize(
  baseRelativeMemberInfoSelectorForMembersOfThread,
);

// If threadID is null, then all users except the logged-in user are returned
const baseUserInfoSelectorForOtherMembersOfThread = (threadID: ?string) =>
  createSelector(
    (state: BaseAppState) => state.userInfos,
    (state: BaseAppState) => state.currentUserInfo && state.currentUserInfo.id,
    (state: BaseAppState) => threadID && state.threadInfos[threadID]
      ? state.threadInfos[threadID].members
      : null,
    (
      userInfos: {[id: string]: UserInfo},
      currentUserID: ?string,
      members: ?MemberInfo[],
    ): {[id: string]: UserInfo} => {
      const others = {};
      const memberUserIDs = members
        ? members.map(memberInfo => memberInfo.id)
        : _keys(userInfos);
      for (let memberID of memberUserIDs) {
        if (memberID !== currentUserID && userInfos[memberID]) {
          others[memberID] = userInfos[memberID];
        }
      }
      return others;
    },
  );

const userInfoSelectorForOtherMembersOfThread = _memoize(
  baseUserInfoSelectorForOtherMembersOfThread,
);

function searchIndexFromUserInfos(userInfos: {[id: string]: UserInfo}) {
  const searchIndex = new SearchIndex();
  for (const id in userInfos) {
    searchIndex.addEntry(id, userInfos[id].username);
  }
  return searchIndex;
}

const baseUserSearchIndexForOtherMembersOfThread = (threadID: ?string) =>
  createSelector(
    userInfoSelectorForOtherMembersOfThread(threadID),
    searchIndexFromUserInfos,
  );

const userSearchIndexForOtherMembersOfThread = _memoize(
  baseUserSearchIndexForOtherMembersOfThread,
);

export {
  userIDsToRelativeUserInfos,
  relativeMemberInfoSelectorForMembersOfThread,
  userInfoSelectorForOtherMembersOfThread,
  userSearchIndexForOtherMembersOfThread,
};
