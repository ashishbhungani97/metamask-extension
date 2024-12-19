import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Box } from '../../component-library';
import { BackgroundColor } from '../../../helpers/constants/design-system';
import MetaFoxHorizontalLogo from './horizontal-logo';

export default class MetaFoxLogo extends PureComponent {
  static propTypes = {
    onClick: PropTypes.func,
    unsetIconHeight: PropTypes.bool,
    isOnboarding: PropTypes.bool,
    ///: BEGIN:ONLY_INCLUDE_IF(build-flask)
    src: PropTypes.string,
    ///: END:ONLY_INCLUDE_IF
    theme: PropTypes.string,
    isicon: PropTypes.bool
  };

  static defaultProps = {
    onClick: undefined,
  };

  render() {
    const {
      onClick,
      unsetIconHeight,
      isOnboarding,
      ///: BEGIN:ONLY_INCLUDE_IF(build-flask)
      src,
      ///: END:ONLY_INCLUDE_IF
      theme = 'dark',
      isicon = false
    } = this.props;
    const iconProps = unsetIconHeight ? {} : { height: 42, width: 42 };

    iconProps.src =
      theme === 'dark'
        ? './images/logo/metamask-fox-dark.svg'
        : './images/logo/metamask-fox.svg';

    let renderHorizontalLogo = () => (
      <MetaFoxHorizontalLogo
        isicon={isicon}
        className={classnames({
          'app-header__metafox-logo--horizontal': !isOnboarding,
          'onboarding-app-header__metafox-logo--horizontal': isOnboarding,
        })}
      />
    );

    ///: BEGIN:ONLY_INCLUDE_IF(build-flask)
    if (src) {
      renderHorizontalLogo = () => (
        <img
          {...iconProps}
          src={src}
          className={classnames({
            'app-header__metafox-logo--horizontal': !isOnboarding,
            'onboarding-app-header__metafox-logo--horizontal': isOnboarding,
          })}
          alt=""
        />
      );
    }
    ///: END:ONLY_INCLUDE_IF

    return (
      <Box
        as="button"
        onClick={onClick}
        className={classnames({
          'app-header__logo-container': !isOnboarding,
          'onboarding-app-header__logo-container': isOnboarding,
          'app-header__logo-container--clickable': Boolean(onClick),
        })}
        backgroundColor={BackgroundColor.transparent}
        data-testid="app-header-logo"
      >
        {renderHorizontalLogo()}
      </Box>
    );
  }
}
