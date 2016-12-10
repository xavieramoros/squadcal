// @flow

import React from 'react';

export type CalendarInfo = {
  id: string,
  name: string,
  description: string,
  authorized: bool,
  subscribed: bool,
  editable: bool,
  closed: bool,
  color: string, // hex, without "#" or "0x"
}

export const calendarInfoPropType = React.PropTypes.shape({
  id: React.PropTypes.string.isRequired,
  name: React.PropTypes.string.isRequired,
  description: React.PropTypes.string.isRequired,
  authorized: React.PropTypes.bool.isRequired,
  subscribed: React.PropTypes.bool.isRequired,
  editable: React.PropTypes.bool.isRequired,
  closed: React.PropTypes.bool.isRequired,
  color: React.PropTypes.string.isRequired,
});