// @flow

import type { AppState } from '../redux-setup';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { ChatThreadItem } from '../selectors/chat-selectors';
import { chatThreadItemPropType } from '../selectors/chat-selectors';
import type {
  NavigationScreenProp,
  NavigationRoute,
} from 'react-navigation/src/TypeDefinition';

import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import _sum from 'lodash/fp/sum';

import { chatListData } from '../selectors/chat-selectors';
import ChatThreadListItem from './chat-thread-list-item.react';
import { MessageListRouteName } from './message-list.react';
import AddThreadButton from './add-thread-button.react';
import { registerChatScreen } from './chat-screen-registry';

type Props = {
  navigation: NavigationScreenProp<NavigationRoute>,
  // Redux state
  chatListData: $ReadOnlyArray<ChatThreadItem>,
  viewerID: ?string,
};
class InnerChatThreadList extends React.PureComponent<Props> {

  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        key: PropTypes.string.isRequired,
      }).isRequired,
      navigate: PropTypes.func.isRequired,
    }).isRequired,
    chatListData: PropTypes.arrayOf(chatThreadItemPropType).isRequired,
    viewerID: PropTypes.string,
  };
  static navigationOptions = ({ navigation }) => ({
    title: 'Threads',
    headerRight: <AddThreadButton navigate={navigation.navigate} />,
  });

  componentDidMount() {
    registerChatScreen(this.props.navigation.state.key, this);
  }

  componentWillUnmount() {
    registerChatScreen(this.props.navigation.state.key, null);
  }

  canReset = () => false;

  renderItem = (row: { item: ChatThreadItem }) => {
    return (
      <ChatThreadListItem data={row.item} onPressItem={this.onPressItem} />
    );
  }

  static keyExtractor(item: ChatThreadItem) {
    return item.threadInfo.id;
  }

  static getItemLayout(
    data: ?$ReadOnlyArray<ChatThreadItem>,
    index: number,
  ) {
    if (!data) {
      return { length: 0, offset: 0, index };
    }
    const offset =
      InnerChatThreadList.heightOfItems(data.filter((_, i) => i < index));
    const item = data[index];
    const length = item ? InnerChatThreadList.itemHeight(item) : 0;
    return { length, offset, index };
  }

  static itemHeight(item: ChatThreadItem): number {
    return 60;
  }

  static heightOfItems(data: $ReadOnlyArray<ChatThreadItem>): number {
    return _sum(data.map(InnerChatThreadList.itemHeight));
  }

  static ListHeaderComponent(props: {}) {
    return <View style={styles.header} />;
  }

  render() {
    // this.props.viewerID is in extraData since it's used by MessagePreview
    // within ChatThreadListItem
    return (
      <View style={styles.container}>
        <FlatList
          data={this.props.chatListData}
          renderItem={this.renderItem}
          keyExtractor={InnerChatThreadList.keyExtractor}
          getItemLayout={InnerChatThreadList.getItemLayout}
          ListHeaderComponent={InnerChatThreadList.ListHeaderComponent}
          extraData={this.props.viewerID}
          style={styles.flatList}
        />
      </View>
    );
  }

  onPressItem = (threadInfo: ThreadInfo) => {
    this.props.navigation.navigate(
      MessageListRouteName,
      { threadInfo },
    );
  }

}

const styles = StyleSheet.create({
  icon: {
    fontSize: 28,
  },
  container: {
    flex: 1,
  },
  header: {
    height: 5,
  },
  flatList: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

const ChatThreadListRouteName = 'ChatThreadList';
const ChatThreadList = connect((state: AppState): * => ({
  chatListData: chatListData(state),
  viewerID: state.currentUserInfo && state.currentUserInfo.id,
}))(InnerChatThreadList);

export {
  ChatThreadList,
  ChatThreadListRouteName,
};
