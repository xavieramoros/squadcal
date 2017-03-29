// @flow

import type { AppState } from '../redux-setup';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { LogInResult } from 'lib/actions/user-actions';

import React from 'react';
import {
  Alert,
  StyleSheet,
  Animated,
  Keyboard,
  View,
  ActivityIndicator,
  Platform,
  TouchableNativeFeedback,
  Text,
  TouchableHighlight,
  Image,
  TouchableWithoutFeedback,
} from 'react-native';
import { connect } from 'react-redux';
import invariant from 'invariant';
import OnePassword from 'react-native-onepassword';
import Icon from 'react-native-vector-icons/FontAwesome';

import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  resetPasswordActionType,
  resetPassword,
} from 'lib/actions/user-actions';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';

import { TextInput } from '../modal-components.react';

class ResetPasswordPanel extends React.PureComponent {

  props: {
    verifyCode: string,
    username: string,
    onePasswordSupported: bool,
    onSuccess: () => void,
    setActiveAlert: (activeAlert: bool) => void,
    opacityValue: Animated.Value,
    // Redux state
    loadingStatus: LoadingStatus,
    // Redux dispatch functions
    dispatchActionPromise: DispatchActionPromise,
    // async functions that hit server APIs
    resetPassword: (code: string, password: string) => Promise<LogInResult>,
  };
  static propTypes = {
    verifyCode: React.PropTypes.string.isRequired,
    username: React.PropTypes.string.isRequired,
    onePasswordSupported: React.PropTypes.bool.isRequired,
    onSuccess: React.PropTypes.func.isRequired,
    setActiveAlert: React.PropTypes.func.isRequired,
    opacityValue: React.PropTypes.object.isRequired,
    loadingStatus: React.PropTypes.string.isRequired,
    dispatchActionPromise: React.PropTypes.func.isRequired,
    resetPassword: React.PropTypes.func.isRequired,
  };
  state: {
    passwordInputText: string,
    confirmPasswordInputText: string,
  } = {
    passwordInputText: "",
    confirmPasswordInputText: "",
  };
  passwordInput: ?TextInput;
  confirmPasswordInput: ?TextInput;

  render() {
    let buttonIcon;
    if (this.props.loadingStatus === "loading") {
      buttonIcon = (
        <View style={styles.loadingIndicatorContainer}>
          <ActivityIndicator color="#555" />
        </View>
      );
    } else {
      buttonIcon = (
        <View style={styles.submitContentIconContainer}>
          <Icon name="arrow-right" size={16} color="#555" />
        </View>
      );
    }
    let submitButton;
    if (Platform.OS === "android") {
      submitButton = (
        <TouchableNativeFeedback
          onPress={this.onSubmit}
          disabled={this.props.loadingStatus === "loading"}
        >
          <View style={[styles.submitContentContainer, styles.submitButton]}>
            <Text style={styles.submitContentText}>RESET PASSWORD</Text>
            {buttonIcon}
          </View>
        </TouchableNativeFeedback>
      );
    } else {
      submitButton = (
        <TouchableHighlight
          onPress={this.onSubmit}
          style={styles.submitButton}
          underlayColor="#A0A0A0DD"
          disabled={this.props.loadingStatus === "loading"}
        >
          <View style={styles.submitContentContainer}>
            <Text style={styles.submitContentText}>RESET PASSWORD</Text>
            {buttonIcon}
          </View>
        </TouchableHighlight>
      );
    }
    let onePassword = null;
    let passwordStyle = { paddingRight: 0 };
    if (this.props.onePasswordSupported) {
      onePassword = (
        <TouchableWithoutFeedback onPress={this.onPressOnePassword}>
          <Image
            source={require("../img/onepassword.png")}
            style={styles.onePasswordImage}
          />
        </TouchableWithoutFeedback>
      );
      passwordStyle = { paddingRight: 30 };
    }
    const opacityStyle = { opacity: this.props.opacityValue };
    return (
      <Animated.View style={[styles.container, opacityStyle]}>
        <View>
          <Icon name="user" size={22} color="#777" style={styles.icon} />
          <View style={styles.usernameContainer}>
            <Text style={styles.usernameText}>{this.props.username}</Text>
          </View>
        </View>
        <View>
          <Icon name="lock" size={22} color="#777" style={styles.icon} />
          <TextInput
            style={[styles.input, passwordStyle]}
            value={this.state.passwordInputText}
            onChangeText={this.onChangePasswordInputText}
            placeholder="New password"
            autoFocus={true}
            secureTextEntry={true}
            returnKeyType='next'
            blurOnSubmit={false}
            onSubmitEditing={this.focusConfirmPasswordInput}
            editable={this.props.loadingStatus !== "loading"}
            ref={this.passwordInputRef}
          />
          {onePassword}
        </View>
        <View>
          <TextInput
            style={styles.input}
            value={this.state.confirmPasswordInputText}
            onChangeText={this.onChangeConfirmPasswordInputText}
            placeholder="Confirm password"
            secureTextEntry={true}
            returnKeyType='go'
            blurOnSubmit={false}
            onSubmitEditing={this.onSubmit}
            editable={this.props.loadingStatus !== "loading"}
            ref={this.confirmPasswordInputRef}
          />
        </View>
        {submitButton}
      </Animated.View>
    );
  }

  passwordInputRef = (passwordInput: ?TextInput) => {
    this.passwordInput = passwordInput;
  }

  confirmPasswordInputRef = (confirmPasswordInput: ?TextInput) => {
    this.confirmPasswordInput = confirmPasswordInput;
  }

  focusConfirmPasswordInput = () => {
    invariant(this.confirmPasswordInput, "ref should be set");
    this.confirmPasswordInput.focus();
  }

  onChangePasswordInputText = (text: string) => {
    this.setState({ passwordInputText: text });
  }

  onChangeConfirmPasswordInputText = (text: string) => {
    this.setState({ confirmPasswordInputText: text });
  }

  onSubmit = () => {
    this.props.setActiveAlert(true);
    if (this.state.passwordInputText === '') {
      Alert.alert(
        "Empty password",
        "Password cannot be empty",
        [
          { text: 'OK', onPress: this.onPasswordAlertAcknowledged },
        ],
        { cancelable: false },
      );
      return;
    } else if (
      this.state.passwordInputText !== this.state.confirmPasswordInputText
    ) {
      Alert.alert(
        "Passwords don't match",
        "Password fields must contain the same password",
        [
          { text: 'OK', onPress: this.onPasswordAlertAcknowledged },
        ],
        { cancelable: false },
      );
      return;
    }
    Keyboard.dismiss();
    this.props.dispatchActionPromise(
      resetPasswordActionType,
      this.resetPasswordAction(),
    );
  }

  onPasswordAlertAcknowledged = () => {
    this.props.setActiveAlert(false);
    this.setState(
      {
        passwordInputText: "",
        confirmPasswordInputText: "",
      },
      () => {
        invariant(this.passwordInput, "ref should exist");
        this.passwordInput.focus();
      },
    );
  }

  async resetPasswordAction() {
    try {
      const result = await this.props.resetPassword(
        this.props.verifyCode,
        this.state.passwordInputText,
      );
      this.props.setActiveAlert(false);
      this.props.onSuccess();
      return result;
    } catch (e) {
      Alert.alert(
        "Unknown error",
        "Uhh... try again?",
        [
          { text: 'OK', onPress: this.onPasswordAlertAcknowledged },
        ],
        { cancelable: false },
      );
      throw e;
    }
  }

  onPressOnePassword = async () => {
    try {
      const credentials = await OnePassword.findLogin("https://squadcal.org");
      this.setState({
        passwordInputText: credentials.password,
        confirmPasswordInputText: credentials.password,
      });
      this.onSubmit();
    } catch (e) { }
  }

}

const styles = StyleSheet.create({
  submitContentIconContainer: {
    width: 14,
    paddingBottom: 5,
  },
  loadingIndicatorContainer: {
    width: 14,
    paddingBottom: 2,
  },
  submitButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderBottomRightRadius: 6,
  },
  submitContentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 18,
    paddingTop: 6,
    paddingRight: 18,
    paddingBottom: 6,
  },
  submitContentText: {
    fontSize: 18,
    fontFamily: 'OpenSans-Semibold',
    color: "#555",
    paddingRight: 7,
  },
  onePasswordImage: {
    position: 'absolute',
    top: 8,
    right: 5,
    width: 24,
    height: 24,
    opacity: 0.6,
  },
  container: {
    paddingBottom: 37,
    paddingTop: 6,
    paddingLeft: 18,
    paddingRight: 18,
    marginLeft: 20,
    marginRight: 20,
    borderRadius: 6,
    backgroundColor: '#FFFFFFAA',
  },
  input: {
    paddingLeft: 35,
  },
  icon: {
    position: 'absolute',
    bottom: 8,
    left: 4,
  },
  usernameContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#BBBBBB',
    paddingLeft: 35,
  },
  usernameText: {
    paddingTop: 8,
    height: 40,
    fontSize: 20,
    color: '#444',
  },
});

const loadingStatusSelector
  = createLoadingStatusSelector(resetPasswordActionType);

export default connect(
  (state: AppState) => ({
    cookie: state.cookie,
    loadingStatus: loadingStatusSelector(state),
  }),
  includeDispatchActionProps({ dispatchActionPromise: true }),
  bindServerCalls({ resetPassword }),
)(ResetPasswordPanel);