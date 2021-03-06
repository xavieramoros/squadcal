// @flow

import { Dimensions, Platform } from 'react-native';

let { height, width } = Dimensions.get('window');
if (Platform.OS === "android") {
  // Android's Dimensions.get doesn't include the status bar
  height -= 24;
}
const windowHeight = height;
const windowWidth = width;

const contentVerticalOffset = Platform.OS === "ios" ? 20 : 0;

export {
  windowHeight,
  windowWidth,
  contentVerticalOffset,
};
