// @flow

import type { ThreadInfo, RelativeMemberInfo } from 'lib/types/thread-types';
import {
  threadInfoPropType,
  threadPermissions,
  relativeMemberInfoPropType,
} from 'lib/types/thread-types';
import type { AppState } from '../../redux-setup';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { ChangeThreadSettingsResult } from 'lib/actions/thread-actions';

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import PropTypes from 'prop-types';
import _isEqual from 'lodash/fp/isEqual';
import { connect } from 'react-redux';
import invariant from 'invariant';
import PopoverTooltip from 'react-native-popover-tooltip';

import { threadHasPermission } from 'lib/shared/thread-utils';
import { stringForUser } from 'lib/shared/user-utils';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import {
  removeUsersFromThreadActionTypes,
  removeUsersFromThread,
  changeThreadMemberRolesActionTypes,
  changeThreadMemberRoles,
} from 'lib/actions/thread-actions';

import EditSettingButton from './edit-setting-button.react';
import Button from '../../components/button.react';

type Props = {|
  memberInfo: RelativeMemberInfo,
  threadInfo: ThreadInfo,
  canEdit: bool,
  removeUsersLoadingStatus: LoadingStatus,
  changeRolesLoadingStatus: LoadingStatus,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  removeUsersFromThread: (
    threadID: string,
    userIDs: string[],
  ) => Promise<ChangeThreadSettingsResult>,
  changeThreadMemberRoles: (
    threadID: string,
    userIDs: string[],
    newRole: string,
  ) => Promise<ChangeThreadSettingsResult>,
|};
type State = {|
  popoverConfig: $ReadOnlyArray<{ label: string, onPress: () => void }>,
|};
class ThreadSettingsUser extends React.PureComponent<Props, State> {

  static propTypes = {
    memberInfo: relativeMemberInfoPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    canEdit: PropTypes.bool.isRequired,
  };

  static memberIsAdmin(props: Props) {
    const role = props.memberInfo.role &&
      props.threadInfo.roles[props.memberInfo.role];
    return role && !role.isDefault && role.name === "Admins";
  }

  generatePopoverConfig(props: Props) {
    const role = props.memberInfo.role;
    if (!props.canEdit || !role) {
      return [];
    }

    const canRemoveMembers = threadHasPermission(
      props.threadInfo,
      threadPermissions.REMOVE_MEMBERS,
    );
    const canChangeRoles = threadHasPermission(
      props.threadInfo,
      threadPermissions.CHANGE_ROLE,
    );

    const result = [];
    if (
      canRemoveMembers &&
      !props.memberInfo.isViewer &&
      (
        canChangeRoles ||
        (
          props.threadInfo.roles[role] &&
          props.threadInfo.roles[role].isDefault
        )
      )
    ) {
      result.push({ label: "Remove user", onPress: this.onPressRemoveUser });
    }

    if (canChangeRoles && props.memberInfo.username) {
      const adminText = ThreadSettingsUser.memberIsAdmin(props)
        ? "Remove admin"
        : "Make admin";
      result.push({ label: adminText, onPress: this.onPressMakeAdmin });
    }

    return result;
  }

  constructor(props: Props) {
    super(props);
    this.state = {
      popoverConfig: this.generatePopoverConfig(props),
    };
  }

  componentWillReceiveProps(nextProps: Props) {
    const nextPopoverConfig = this.generatePopoverConfig(nextProps);
    if (!_isEqual(this.state.popoverConfig)(nextPopoverConfig)) {
      this.setState({ popoverConfig: nextPopoverConfig });
    }
  }

  render() {
    const userText = stringForUser(this.props.memberInfo);
    let userInfo = null;
    if (this.props.memberInfo.username) {
      userInfo = (
        <Text style={styles.username} numberOfLines={1}>{userText}</Text>
      );
    } else {
      userInfo = (
        <Text style={[styles.username, styles.anonymous]} numberOfLines={1}>
          {userText}
        </Text>
      );
    }

    let editButton = null;
    if (
      this.props.removeUsersLoadingStatus === "loading" ||
      this.props.changeRolesLoadingStatus === "loading"
    ) {
      editButton = <ActivityIndicator size="small" />;
    } else if (this.state.popoverConfig.length !== 0) {
      editButton = (
        <PopoverTooltip
          buttonComponent={icon}
          items={this.state.popoverConfig}
          labelStyle={styles.popoverLabelStyle}
        />
      );
    }

    let roleInfo = null;
    if (ThreadSettingsUser.memberIsAdmin(this.props)) {
      roleInfo = (
        <View style={styles.row}>
          <Text style={styles.role}>admin</Text>
        </View>
      );
    } else {
      // In the future, when we might have more than two roles per threads, we
      // will need something more sophisticated here. For now, if the user isn't
      // an admin and yet has the CHANGE_ROLE permissions, we know that they are
      // an admin of an ancestor of this thread.
      const canChangeRoles =
        this.props.memberInfo.permissions[threadPermissions.CHANGE_ROLE] &&
        this.props.memberInfo.permissions[threadPermissions.CHANGE_ROLE].value;
      if (canChangeRoles) {
        roleInfo = (
          <View style={styles.row}>
            <Text style={styles.role}>parent admin</Text>
          </View>
        );
      }
    }

    return (
      <View style={styles.container}>
        <View style={styles.row}>
          {userInfo}
          {editButton}
        </View>
        {roleInfo}
      </View>
    );
  }

  onPressRemoveUser = () => {
    if (Platform.OS === "ios") {
      // https://github.com/facebook/react-native/issues/10471
      setTimeout(this.showRemoveUserConfirmation, 500);
    } else {
      this.showRemoveUserConfirmation();
    }
  }

  showRemoveUserConfirmation = () => {
    const userText = stringForUser(this.props.memberInfo);
    Alert.alert(
      "Confirm removal",
      `Are you sure you want to remove ${userText} from this thread?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: this.onConfirmRemoveUser },
      ],
    );
  }

  onConfirmRemoveUser = () => {
    const customKeyName = removeUsersFromThreadActionTypes.started +
      `:${this.props.memberInfo.id}`;
    this.props.dispatchActionPromise(
      removeUsersFromThreadActionTypes,
      this.removeUser(),
      { customKeyName },
    );
  }

  async removeUser() {
    return await this.props.removeUsersFromThread(
      this.props.threadInfo.id,
      [ this.props.memberInfo.id ],
    );
  }

  onPressMakeAdmin = () => {
    if (Platform.OS === "ios") {
      // https://github.com/facebook/react-native/issues/10471
      setTimeout(this.showMakeAdminConfirmation, 500);
    } else {
      this.showMakeAdminConfirmation();
    }
  }

  showMakeAdminConfirmation = () => {
    const userText = stringForUser(this.props.memberInfo);
    const actionClause = ThreadSettingsUser.memberIsAdmin(this.props)
      ? `remove ${userText} as an admin`
      : `make ${userText} an admin`;
    Alert.alert(
      "Confirm action",
      `Are you sure you want to ${actionClause} of this thread?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: this.onConfirmMakeAdmin },
      ],
    );
  }

  onConfirmMakeAdmin = () => {
    const isCurrentlyAdmin = ThreadSettingsUser.memberIsAdmin(this.props);
    let newRole = null;
    for (let roleID in this.props.threadInfo.roles) {
      const role = this.props.threadInfo.roles[roleID];
      if (isCurrentlyAdmin && role.isDefault) {
        newRole = role.id;
        break;
      } else if (!isCurrentlyAdmin && role.name === "Admins") {
        newRole = role.id;
        break;
      }
    }
    invariant(newRole !== null, "Could not find new role");
    const customKeyName = changeThreadMemberRolesActionTypes.started +
      `:${this.props.memberInfo.id}`;
    this.props.dispatchActionPromise(
      changeThreadMemberRolesActionTypes,
      this.makeAdmin(newRole),
      { customKeyName },
    );
  }

  async makeAdmin(newRole: string) {
    return await this.props.changeThreadMemberRoles(
      this.props.threadInfo.id,
      [ this.props.memberInfo.id ],
      newRole,
    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  username: {
    flex: 1,
    fontSize: 16,
    color: "#333333",
  },
  anonymous: {
    fontStyle: 'italic',
    color: "#888888",
  },
  editIcon: {
    lineHeight: 20,
    paddingLeft: 10,
    paddingTop: Platform.select({ android: 1, default: 0 }),
    textAlign: 'right',
  },
  popoverLabelStyle: {
    textAlign: 'center',
    color: '#444',
  },
  role: {
    flex: 1,
    fontSize: 14,
    color: "#888888",
    paddingTop: 4,
  },
});

const icon = (
  <Icon
    name="pencil"
    size={16}
    style={styles.editIcon}
    color="#036AFF"
  />
);

export default connect(
  (state: AppState) => ({ cookie: state.cookie }),
  includeDispatchActionProps,
  bindServerCalls({ removeUsersFromThread, changeThreadMemberRoles }),
)(ThreadSettingsUser);
