import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import Button from '../../../components/ui/button';
import { Tag } from '../../../components/component-library';

import {
  SUPPORT_REQUEST_LINK,
  ///: BEGIN:ONLY_INCLUDE_IF(build-mmi)
  MMI_WEB_SITE,
  ///: END:ONLY_INCLUDE_IF
} from '../../../helpers/constants/common';
import { isBeta } from '../../../helpers/utils/build-types';
import {
  getNumberOfSettingRoutesInTab,
  handleSettingsRefs,
} from '../../../helpers/utils/settings-search';
import {
  MetaMetricsContextProp,
  MetaMetricsEventCategory,
  MetaMetricsEventName,
} from '../../../../shared/constants/metametrics';
import {
  ///: BEGIN:ONLY_INCLUDE_IF(build-mmi)
  CONSENSYS_PRIVACY_LINK,
  ///: END:ONLY_INCLUDE_IF
  SUPPORT_LINK,
} from '../../../../shared/lib/ui-utils';

export default class InfoTab extends PureComponent {
  state = {
    version: process.env.METAMASK_VERSION,
  };

  static contextTypes = {
    t: PropTypes.func,
    trackEvent: PropTypes.func,
  };

  settingsRefs = Array(
    getNumberOfSettingRoutesInTab(this.context.t, this.context.t('about')),
  )
    .fill(undefined)
    .map(() => {
      return React.createRef();
    });

  componentDidUpdate() {
    const { t } = this.context;
    handleSettingsRefs(t, t('about'), this.settingsRefs);
  }

  componentDidMount() {
    const { t } = this.context;
    handleSettingsRefs(t, t('about'), this.settingsRefs);
  }

  renderInfoLinks() {
    const { t } = this.context;
    let privacyUrl, siteUrl;

    ///: BEGIN:ONLY_INCLUDE_IF(build-mmi)
    privacyUrl = CONSENSYS_PRIVACY_LINK;
    siteUrl = MMI_WEB_SITE;
    ///: END:ONLY_INCLUDE_IF

    ///: BEGIN:ONLY_INCLUDE_IF(build-main,build-beta,build-flask)
    privacyUrl = '#sec';
    siteUrl = 'https://blockstars.blockstar.site/knowledge-base/';
    ///: END:ONLY_INCLUDE_IF

    return (
      <div className="settings-page__content-item settings-page__content-item--without-height">
        <div ref={this.settingsRefs[1]} className="info-tab__link-header">
          {t('links')}
        </div>
        <div ref={this.settingsRefs[2]} className="info-tab__link-item">
          <Button
            type="link"
            href={privacyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="info-tab__link-text"
          >
            {t('privacyMsg')}
          </Button>
        </div>
        <div ref={this.settingsRefs[3]} className="info-tab__link-item">
          <Button
            type="link"
            href="https://blockstars.blockstar.site/knowledge-base/"
            target="_blank"
            rel="noopener noreferrer"
            className="info-tab__link-text"
          >
            {t('terms')}
          </Button>
        </div>
        {isBeta() ? (
          <div ref={this.settingsRefs[8]} className="info-tab__link-item">
            <Button
              type="link"
              href="https://blockstars.blockstar.site/knowledge-base/"
              target="_blank"
              rel="noopener noreferrer"
              className="info-tab__link-text"
            >
              {t('betaTerms')}
              <Tag label={t('new')} className="info-tab__tag" />
            </Button>
          </div>
        ) : null}
        <div ref={this.settingsRefs[4]} className="info-tab__link-item">
          <Button
            type="link"
            href="#sec"
            target="_blank"
            rel="noopener noreferrer"
            className="info-tab__link-text"
          >
            {t('attributions')}
          </Button>
        </div>
        <hr className="info-tab__separator" />
        <div ref={this.settingsRefs[5]} className="info-tab__link-item">
          <Button
            type="link"
            href={SUPPORT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="info-tab__link-text"
            onClick={() => {
              this.context.trackEvent(
                {
                  category: MetaMetricsEventCategory.Settings,
                  event: MetaMetricsEventName.SupportLinkClicked,
                  properties: {
                    url: SUPPORT_LINK,
                  },
                },
                {
                  contextPropsIntoEventProperties: [
                    MetaMetricsContextProp.PageTitle,
                  ],
                },
              );
            }}
          >
            {t('supportCenter')}
          </Button>
        </div>
        <div ref={this.settingsRefs[6]} className="info-tab__link-item">
          <Button
            type="link"
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="info-tab__link-text"
          >
            {t('visitWebSite')}
          </Button>
        </div>
        <div ref={this.settingsRefs[7]} className="info-tab__link-item">
          <Button
            type="link"
            href={SUPPORT_REQUEST_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="info-tab__link-text"
            onClick={() => {
              this.context.trackEvent(
                {
                  category: MetaMetricsEventCategory.Settings,
                  event: MetaMetricsEventName.SupportLinkClicked,
                  properties: {
                    url: SUPPORT_REQUEST_LINK,
                  },
                },
                {
                  contextPropsIntoEventProperties: [
                    MetaMetricsContextProp.PageTitle,
                  ],
                },
              );
            }}
          >
            {t('contactUs')}
          </Button>
        </div>
      </div>
    );
  }

  render() {
    const { t } = this.context;

    return (
      <div className="settings-page__body">
        <div className="settings-page__content-row">
          <div className="settings-page__content-item settings-page__content-item--without-height">
            {
              ///: BEGIN:ONLY_INCLUDE_IF(build-mmi)
              <div className="info-tab__logo-wrapper">
                <img
                  src="images/info-logo.png"
                  className="info-tab__logo"
                  alt=""
                />
              </div>
              ///: END:ONLY_INCLUDE_IF
            }
            <div className="info-tab__item">
              <div
                ref={this.settingsRefs[0]}
                className="info-tab__version-header"
              >
                {
                  ///: BEGIN:ONLY_INCLUDE_IF(build-main,build-beta,build-flask)
                  isBeta() ? t('betaMetamaskVersion') : t('metamaskVersion')
                  ///: END:ONLY_INCLUDE_IF
                }
                {
                  ///: BEGIN:ONLY_INCLUDE_IF(build-mmi)
                  isBeta()
                    ? t('betaMetamaskInstitutionalVersion')
                    : t('metamaskInstitutionalVersion')
                  ///: END:ONLY_INCLUDE_IF
                }
              </div>
              <div className="info-tab__version-number">
                {this.state.version}
              </div>
            </div>
            <div className="info-tab__item">
              <div className="info-tab__about">
                {
                  ///: BEGIN:ONLY_INCLUDE_IF(build-main,build-beta,build-flask)
                  t('builtAroundTheWorld')
                  ///: END:ONLY_INCLUDE_IF
                }
                {
                  ///: BEGIN:ONLY_INCLUDE_IF(build-mmi)
                  t('mmiBuiltAroundTheWorld')
                  ///: END:ONLY_INCLUDE_IF
                }
              </div>
            </div>
          </div>
          {this.renderInfoLinks()}
        </div>
        {
          ///: BEGIN:ONLY_INCLUDE_IF(build-main,build-beta,build-flask)
          <div className="info-tab__logo-wrapper">
            <img
              src="./images/logo/metamask-fox.svg"
              className="info-tab__logo"
              alt="BlockStar Logo"
            />
          </div>
          ///: END:ONLY_INCLUDE_IF
        }
      </div>
    );
  }
}
