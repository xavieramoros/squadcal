// @flow

import type { EntryInfoWithHeight } from './calendar.react';
import { entryInfoPropType } from 'lib/types/entry-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../redux-setup';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from 'lib/utils/action-utils';
import type { SaveResult } from 'lib/actions/entry-actions';
import type { LoadingStatus } from 'lib/types/loading-types';
import type {
  NavigationParams,
  NavigationAction,
} from 'react-navigation/src/TypeDefinition';

import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  TouchableWithoutFeedback,
  Alert,
  LayoutAnimation,
  Keyboard,
} from 'react-native';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import shallowequal from 'shallowequal';
import _omit from 'lodash/fp/omit';
import _isEqual from 'lodash/fp/isEqual';
import Icon from 'react-native-vector-icons/FontAwesome';
import { NavigationActions } from 'react-navigation';

import { colorIsDark } from 'lib/shared/thread-utils';
import {
  currentSessionID,
  nextSessionID,
  sessionStartingPayload,
} from 'lib/selectors/session-selectors';
import {
  saveEntryActionTypes,
  saveEntry,
  deleteEntryActionTypes,
  deleteEntry,
  concurrentModificationResetActionType,
} from 'lib/actions/entry-actions';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import { ServerError } from 'lib/utils/fetch-utils';
import { entryKey } from 'lib/shared/entry-utils';
import { registerFetchKey } from 'lib/reducers/loading-reducer';

import Button from '../components/button.react';
import { ChatRouteName } from '../chat/chat.react';
import { MessageListRouteName } from '../chat/message-list.react';
import { assertNavigationRouteNotLeafNode } from '../utils/navigation-utils';

type Props = {
  entryInfo: EntryInfoWithHeight,
  visible: bool,
  focused: bool,
  onFocus: (entryKey: string, focused: bool) => void,
  navigate: (
    routeName: string,
    params?: NavigationParams,
    action?: NavigationAction,
  ) => bool,
  // Redux state
  threadInfo: ThreadInfo,
  sessionStartingPayload: () => { newSessionID?: string },
  sessionID: () => string,
  nextSessionID: () => ?string,
  currentChatThreadID: ?string,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  saveEntry: (
    serverID: ?string,
    newText: string,
    prevText: string,
    sessionID: string,
    year: number,
    month: number,
    day: number,
    threadID: string,
    creationTime: number,
  ) => Promise<SaveResult>,
  deleteEntry: (
    serverID: string,
    prevText: string,
    sessionID: string,
  ) => Promise<void>,
};
type State = {
  text: string,
  loadingStatus: LoadingStatus,
  height: number,
  threadInfo: ThreadInfo,
};
class Entry extends React.Component<Props, State> {
  
  static propTypes = {
    entryInfo: entryInfoPropType.isRequired,
    visible: PropTypes.bool.isRequired,
    focused: PropTypes.bool.isRequired,
    onFocus: PropTypes.func.isRequired,
    navigate: PropTypes.func.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    sessionStartingPayload: PropTypes.func.isRequired,
    sessionID: PropTypes.func.isRequired,
    nextSessionID: PropTypes.func.isRequired,
    currentChatThreadID: PropTypes.string,
    dispatchActionPayload: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    saveEntry: PropTypes.func.isRequired,
    deleteEntry: PropTypes.func.isRequired,
  };
  textInput: ?TextInput;
  creating = false;
  needsUpdateAfterCreation = false;
  needsDeleteAfterCreation = false;
  nextSaveAttemptIndex = 0;
  mounted = false;
  deleted = false;
  currentlySaving: ?string;

  constructor(props: Props) {
    super(props);
    invariant(props.threadInfo, "should be set");
    this.state = {
      text: props.entryInfo.text,
      loadingStatus: "inactive",
      height: props.entryInfo.textHeight + 10,
      // On log out, it's possible for the thread to be deauthorized before
      // the log out animation completes. To avoid having rendering issues in
      // that case, we cache the threadInfo in state and don't reset it when the
      // threadInfo is undefined.
      threadInfo: props.threadInfo,
    };
  }

  guardedSetState(input) {
    if (this.mounted) {
      this.setState(input);
    }
  }

  componentWillReceiveProps(nextProps: Props) {
    if (
      !Entry.isFocused(nextProps) &&
      (nextProps.entryInfo.text !== this.props.entryInfo.text &&
        nextProps.entryInfo.text !== this.state.text) ||
      (nextProps.entryInfo.textHeight !== this.props.entryInfo.textHeight &&
        nextProps.entryInfo.textHeight !== (this.state.height - 10))
    ) {
      this.setState({
        text: nextProps.entryInfo.text,
        height: nextProps.entryInfo.textHeight + 10,
      });
    }
    if (
      nextProps.threadInfo &&
      !_isEqual(nextProps.threadInfo)(this.state.threadInfo)
    ) {
      this.setState({ threadInfo: nextProps.threadInfo });
    }
    if (!nextProps.focused && this.props.focused) {
      if (this.textInput) {
        this.textInput.blur();
      }
      this.onBlur();
    }
  }

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    const omitEntryInfo = _omit(["entryInfo"]);
    return !shallowequal(nextState, this.state) ||
      !shallowequal(omitEntryInfo(nextProps), omitEntryInfo(this.props)) ||
      !_isEqual(nextProps.entryInfo)(this.props.entryInfo);
  }

  componentWillUpdate(nextProps: Props, nextState: State) {
    if (
      nextState.height !== this.state.height ||
        Entry.isFocused(nextProps) !== Entry.isFocused(this.props)
    ) {
      LayoutAnimation.easeInEaseOut();
    }
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  static isFocused(props: Props) {
    return props.focused || !props.entryInfo.id;
  }

  render() {
    const focused = Entry.isFocused(this.props);

    const darkColor = colorIsDark(this.state.threadInfo.color);
    let actionLinks = null;
    if (focused) {
      const actionLinksColor = darkColor ? '#D3D3D3' : '#808080';
      const actionLinksTextStyle = { color: actionLinksColor };
      const actionLinksUnderlayColor = darkColor ? "#AAAAAA88" : "#CCCCCCDD";
      actionLinks = (
        <View style={styles.actionLinks}>
          <View style={styles.leftLinks}>
            <Button
              onPress={this.onPressDelete}
              iosFormat="highlight"
              iosHighlightUnderlayColor={actionLinksUnderlayColor}
              iosActiveOpacity={0.85}
              style={styles.button}
            >
              <View style={styles.deleteButtonContents}>
                <Icon
                  name="close"
                  size={14}
                  color={actionLinksColor}
                />
                <Text style={[styles.leftLinksText, actionLinksTextStyle]}>
                  DELETE
                </Text>
              </View>
            </Button>
          </View>
          <View style={styles.rightLinks}>
            <Button
              onPress={this.onPressThreadName}
              iosFormat="highlight"
              iosHighlightUnderlayColor={actionLinksUnderlayColor}
              iosActiveOpacity={0.85}
              style={styles.button}
            >
              <Text
                style={[styles.rightLinksText, actionLinksTextStyle]}
                numberOfLines={1}
              >
                {this.state.threadInfo.name}
              </Text>
            </Button>
          </View>
        </View>
      );
    }
    const entryStyle = { backgroundColor: `#${this.state.threadInfo.color}` };
    const textStyle = {
      color: darkColor ? 'white' : 'black',
      height: this.state.height,
    };
    let text;
    if (this.props.visible || focused) {
      text = (
        <TextInput
          style={[styles.text, textStyle]}
          underlineColorAndroid="transparent"
          value={this.state.text}
          onChangeText={this.onChangeText}
          multiline={true}
          onBlur={this.onBlur}
          onFocus={this.onFocus}
          onContentSizeChange={this.onContentSizeChange}
          ref={this.textInputRef}
        />
      );
    } else {
      text = (
        <Text style={[styles.text, textStyle]}>
          {this.state.text}
        </Text>
      );
    }
    let entry;
    if (Platform.OS === "ios") {
      // On iOS, we can take the capture away from our child TextInput and
      // everything still works properly - the keyboard pops open and cursor
      // appears where the TextInput was pressed. Hooking in here allows us to
      // speed up our response times to TextInput presses (as onFocus is
      // painfully slow). On Android, the response time to TextInput onFocus is
      // faster anyways, and plus stealing the capture here causes problems.
      entry = (
        <View
          style={[styles.entry, entryStyle]}
          onStartShouldSetResponderCapture={this.onStartShouldSetResponderCapture}
          onResponderGrant={this.onFocus}
          onResponderTerminationRequest={this.onResponderTerminationRequest}
          onResponderTerminate={this.onResponderTerminate}
        >
          {text}
          {actionLinks}
        </View>
      );
    } else {
      entry = (
        <View style={[styles.entry, entryStyle]}>
          {text}
          {actionLinks}
        </View>
      );
    }
    return <View style={styles.container}>{entry}</View>;
  }

  textInputRef = (textInput: ?TextInput) => {
    this.textInput = textInput;
    if (textInput && Entry.isFocused(this.props)) {
      setTimeout(textInput.focus, 400);
    }
  }

  onFocus = () => this.props.onFocus(entryKey(this.props.entryInfo), true);

  onStartShouldSetResponderCapture = (
    event: { nativeEvent: { pageY: number } },
  ) => event.nativeEvent.pageY < this.state.height + 5;

  onResponderTerminationRequest = () => true;

  onResponderTerminate =
    () => this.props.onFocus(entryKey(this.props.entryInfo), false);

  onBlur = () => {
    if (this.state.text.trim() === "") {
      this.delete(this.props.entryInfo.id);
    } else if (this.props.entryInfo.text !== this.state.text) {
      this.save(this.props.entryInfo.id, this.state.text);
    }
    this.props.onFocus(entryKey(this.props.entryInfo), false);
  }

  onContentSizeChange = (event) => {
    if (!Entry.isFocused(this.props)) {
      return;
    }
    let height = event.nativeEvent.contentSize.height;
    // iOS doesn't include the margin on this callback
    height = Platform.OS === "ios" ? height + 10 : height + 5;
    this.guardedSetState({ height });
  }

  onChangeText = (newText: string) => {
    this.guardedSetState({ text: newText });
  }

  save(serverID: ?string, newText: string) {
    if (this.currentlySaving === newText) {
      return;
    }
    this.currentlySaving = newText;

    if (newText.trim() === "") {
      // We don't save the empty string, since as soon as the element loses
      // focus it'll get deleted
      return;
    }

    if (!serverID) {
      if (this.creating) {
        // We need the first save call to return so we know the ID of the entry
        // we're updating, so we'll need to handle this save later
        this.needsUpdateAfterCreation = true;
        return;
      } else {
        this.creating = true;
      }
    }

    const startingPayload = this.props.sessionStartingPayload();
    this.props.dispatchActionPromise(
      saveEntryActionTypes,
      this.saveAction(serverID, newText),
      undefined,
      startingPayload,
    );
  }

  async saveAction(serverID: ?string, newText: string) {
    const curSaveAttempt = this.nextSaveAttemptIndex++;
    this.guardedSetState({ loadingStatus: "loading" });
    try {
      const response = await this.props.saveEntry(
        serverID,
        newText,
        this.props.entryInfo.text,
        this.props.sessionID(),
        this.props.entryInfo.year,
        this.props.entryInfo.month,
        this.props.entryInfo.day,
        this.props.entryInfo.threadID,
        this.props.entryInfo.creationTime,
      );
      if (curSaveAttempt + 1 === this.nextSaveAttemptIndex) {
        this.guardedSetState({ loadingStatus: "inactive" });
      }
      const payload = {
        localID: (null: ?string),
        serverID: serverID,
        text: newText,
        newMessageInfos: response.newMessageInfos,
        threadID: this.props.threadInfo.id,
      };
      if (!serverID && response.entryID) {
        const newServerID = response.entryID;
        payload.serverID = newServerID;
        const localID = this.props.entryInfo.localID;
        invariant(localID, "if there's no serverID, there should be a localID");
        payload.localID = localID;
        this.creating = false;
        if (this.needsUpdateAfterCreation) {
          this.needsUpdateAfterCreation = false;
          this.save(newServerID, this.state.text);
        }
        if (this.needsDeleteAfterCreation) {
          this.needsDeleteAfterCreation = false;
          this.delete(newServerID);
        }
      }
      return payload;
    } catch(e) {
      if (curSaveAttempt + 1 === this.nextSaveAttemptIndex) {
        this.guardedSetState({ loadingStatus: "error" });
      }
      if (e instanceof ServerError && e.message === 'concurrent_modification') {
        const onRefresh = () => {
          this.guardedSetState({ loadingStatus: "inactive" });
          this.props.dispatchActionPayload(
            concurrentModificationResetActionType,
            { id: serverID, dbText: e.result.db },
          );
        };
        Alert.alert(
          "Concurrent modification",
          "It looks like somebody is attempting to modify that field at the " +
            "same time as you! Please refresh the entry and try again.",
          [
            { text: 'OK', onPress: onRefresh },
          ],
          { cancelable: false },
        );
      }
      throw e;
    }
  }

  onPressDelete = () => {
    this.delete(this.props.entryInfo.id);
  }

  delete(serverID: ?string) {
    if (this.deleted) {
      return;
    }
    this.deleted = true;
    LayoutAnimation.easeInEaseOut();
    const startingPayload: {[key: string]: ?string} = {
      localID: this.props.entryInfo.localID,
      serverID: serverID,
    };
    const nextSessionID = this.props.nextSessionID();
    if (nextSessionID) {
      startingPayload.newSessionID = nextSessionID;
    }
    this.props.dispatchActionPromise(
      deleteEntryActionTypes,
      this.deleteAction(serverID),
      undefined,
      startingPayload,
    );
  }

  async deleteAction(serverID: ?string) {
    if (serverID) {
      await this.props.deleteEntry(
        serverID,
        this.props.entryInfo.text,
        this.props.sessionID(),
      );
    } else if (this.creating) {
      this.needsDeleteAfterCreation = true;
    }
  }

  onPressThreadName = () => {
    Keyboard.dismiss();
    if (this.props.currentChatThreadID === this.props.threadInfo.id) {
      this.props.navigate(ChatRouteName);
      return;
    }
    this.props.navigate(
      ChatRouteName,
      {},
      NavigationActions.navigate({
        routeName: MessageListRouteName,
        params: {
          threadInfo: this.props.threadInfo,
        },
      })
    );
  }

}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  entry: {
    borderRadius: 8,
    margin: 5,
    overflow: 'hidden',
  },
  text: {
    fontSize: 16,
    paddingTop: 5,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 10,
    marginBottom: 1,
    color: '#333333',
    fontFamily: 'Arial',
  },
  actionLinks: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -5,
  },
  deleteButtonContents: {
    flex: 1,
    flexDirection: 'row',
  },
  leftLinks: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  leftLinksText: {
    paddingLeft: 5,
    fontWeight: 'bold',
    fontSize: 12,
  },
  rightLinks: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  rightLinksText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});

registerFetchKey(saveEntryActionTypes);
registerFetchKey(deleteEntryActionTypes);

export default connect(
  (state: AppState, ownProps: { entryInfo: EntryInfoWithHeight }) => {
    const appRoute =
      assertNavigationRouteNotLeafNode(state.navInfo.navigationState.routes[0]);
    const chatRoute = assertNavigationRouteNotLeafNode(appRoute.routes[1]);
    const currentChatSubroute = chatRoute.routes[chatRoute.index];
    let currentChatThreadID = null;
    if (currentChatSubroute.routeName === MessageListRouteName) {
      invariant(
        currentChatSubroute.params &&
          currentChatSubroute.params.threadInfo &&
          typeof currentChatSubroute.params.threadInfo === "object" &&
          currentChatSubroute.params.threadInfo.id &&
          typeof currentChatSubroute.params.threadInfo.id === "string",
        "all MessageList routes should have a threadInfo param",
      );
      currentChatThreadID = currentChatSubroute.params.threadInfo.id;
    }
    return {
      threadInfo: state.threadInfos[ownProps.entryInfo.threadID],
      sessionStartingPayload: sessionStartingPayload(state),
      sessionID: currentSessionID(state),
      nextSessionID: nextSessionID(state),
      currentChatThreadID,
      cookie: state.cookie,
    };
  },
  includeDispatchActionProps,
  bindServerCalls({ saveEntry, deleteEntry }),
)(Entry);
