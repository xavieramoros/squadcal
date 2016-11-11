// @flow

import React from 'react';
import classNames from 'classnames';

import fetchJSON from '../fetch-json';
import NewSquadModal from '../modals/new-squad-modal.react';
import LogInToCreateSquadModal
  from '../modals/account/log-in-to-create-squad-modal.react';

export type NavID = "home" | "new";
type Props = {
  navID: NavID,
  name: string,
  thisURL: string,
  monthURL: string,
  loggedIn: bool,
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
  freezeTypeahead: (navID: string) => void,
  unfreezeTypeahead: () => void,
  hideTypeahead: () => void,
  frozen?: bool,
};

class TypeaheadActionOption extends React.Component {

  static defaultProps: { frozen: bool };
  static homeText;
  static newText;
  props: Props;

  render() {
    return (
      <div
        className={classNames(
          "squad-nav-option",
          {'squad-nav-frozen-option': this.props.frozen},
        )}
        id={"nav_" + this.props.navID}
        onClick={this.onClick.bind(this)}
      >
        <div>
          <div className="squad-nav-option-name">
            {this.props.name}
          </div>
          <div className="clear" />
        </div>
      </div>
    );
  }

  onClick(event: SyntheticEvent) {
    if (this.props.navID === 'new') {
      this.props.freezeTypeahead(this.props.navID);
      const onClose = () => {
        this.props.unfreezeTypeahead();
        this.props.clearModal();
      }
      if (this.props.loggedIn) {
        this.props.setModal(
          <NewSquadModal
            monthURL={this.props.monthURL}
            onClose={onClose}
          />
        );
      } else {
        this.props.setModal(
          <LogInToCreateSquadModal 
            thisURL={this.props.thisURL}
            onClose={onClose}
            setModal={this.props.setModal}
          />
        );
      }
    } else if (this.props.navID == 'home') {
      window.location.href = this.props.monthURL + "&home";
    } 
  }

}

TypeaheadActionOption.homeText = "Home";
TypeaheadActionOption.newText = "New squad...";

TypeaheadActionOption.propTypes = {
  navID: React.PropTypes.string.isRequired,
  name: React.PropTypes.string.isRequired,
  thisURL: React.PropTypes.string.isRequired,
  monthURL: React.PropTypes.string.isRequired,
  loggedIn: React.PropTypes.bool.isRequired,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
  freezeTypeahead: React.PropTypes.func.isRequired,
  unfreezeTypeahead: React.PropTypes.func.isRequired,
  hideTypeahead: React.PropTypes.func.isRequired,
  frozen: React.PropTypes.bool,
};

TypeaheadActionOption.defaultProps = {
  frozen: false,
};

export default TypeaheadActionOption;