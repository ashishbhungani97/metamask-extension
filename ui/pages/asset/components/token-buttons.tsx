import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { I18nContext } from '../../../contexts/i18n';
import {
  SEND_ROUTE,
  ///: BEGIN:ONLY_INCLUDE_IF(build-main,build-beta,build-flask)
  // no-op
  ///: END:ONLY_INCLUDE_IF
} from '../../../helpers/constants/routes';
import { startNewDraftTransaction } from '../../../ducks/send';
///: BEGIN:ONLY_INCLUDE_IF(build-main,build-beta,build-flask)
// no-op
///: END:ONLY_INCLUDE_IF
///: BEGIN:ONLY_INCLUDE_IF(build-mmi)
import {
  getMmiPortfolioEnabled,
  getMmiPortfolioUrl,
} from '../../../selectors/institutional/selectors';
///: END:ONLY_INCLUDE_IF
import {
  getCurrentChainId,
  ///: BEGIN:ONLY_INCLUDE_IF(build-main,build-beta,build-flask)
  // no-op
  ///: END:ONLY_INCLUDE_IF
} from '../../../selectors';
///: BEGIN:ONLY_INCLUDE_IF(build-main,build-beta,build-flask)
// no-op
///: END:ONLY_INCLUDE_IF

import { INVALID_ASSET_TYPE } from '../../../helpers/constants/error-keys';
import { showModal } from '../../../store/actions';
import { MetaMetricsContext } from '../../../contexts/metametrics';
import {
  MetaMetricsEventCategory,
  MetaMetricsEventName,
  MetaMetricsSwapsEventSource,
} from '../../../../shared/constants/metametrics';
import { AssetType } from '../../../../shared/constants/transaction';
import {
  Display,
  IconColor,
  JustifyContent,
} from '../../../helpers/constants/design-system';
import IconButton from '../../../components/ui/icon-button/icon-button';
import {
  Box,
  Icon,
  IconName,
  IconSize,
} from '../../../components/component-library';
///: BEGIN:ONLY_INCLUDE_IF(build-main,build-beta,build-flask)
// no-op
///: END:ONLY_INCLUDE_IF
import { Asset } from './asset-page';

const TokenButtons = ({
  token,
}: {
  token: Asset & { type: AssetType.token };
}) => {
  const dispatch = useDispatch();
  const t = useContext(I18nContext);
  const trackEvent = useContext(MetaMetricsContext);
  const history = useHistory();

  ///: BEGIN:ONLY_INCLUDE_IF(build-main,build-beta,build-flask)
  // no-op
  ///: END:ONLY_INCLUDE_IF

  const chainId = useSelector(getCurrentChainId);
  ///: BEGIN:ONLY_INCLUDE_IF(build-main,build-beta,build-flask)
  // no-op
  ///: END:ONLY_INCLUDE_IF

  ///: BEGIN:ONLY_INCLUDE_IF(build-mmi)
  const mmiPortfolioEnabled = useSelector(getMmiPortfolioEnabled);
  const mmiPortfolioUrl = useSelector(getMmiPortfolioUrl);

  const portfolioEvent = () => {
    trackEvent({
      category: MetaMetricsEventCategory.Navigation,
      event: MetaMetricsEventName.MMIPortfolioButtonClicked,
    });
  };

  const stakingEvent = () => {
    trackEvent({
      category: MetaMetricsEventCategory.Navigation,
      event: MetaMetricsEventName.MMIPortfolioButtonClicked,
    });
  };
  ///: END:ONLY_INCLUDE_IF

  useEffect(() => {
    if (token.isERC721) {
      dispatch(
        showModal({
          name: 'CONVERT_TOKEN_TO_NFT',
          tokenAddress: token.address,
        }),
      );
    }
  }, [token.isERC721, token.address, dispatch]);

  const openBuyCryptoInPdapp = () =>{
    const url = 'https://dex.blockstars.blockstar.site/knowledge-base/';  // Replace with the desired URL
    window.open(url, '_blank', 'noopener,noreferrer');
  }


  return (
    <Box display={Display.Flex} justifyContent={JustifyContent.spaceEvenly}>
      {
        ///: BEGIN:ONLY_INCLUDE_IF(build-main,build-beta,build-flask)
        <IconButton
          className="token-overview__button"
          Icon={
            <Icon
              name={IconName.PlusMinus}
              color={IconColor.primaryInverse}
              size={IconSize.Sm}
            />
          }
          label={t('buyAndSell')}
          data-testid="token-overview-buy"
          onClick={() => {
            openBuyCryptoInPdapp();
          }}
          tooltipRender={null}
        />
        ///: END:ONLY_INCLUDE_IF
      }

      {
        ///: BEGIN:ONLY_INCLUDE_IF(build-mmi)
        <>
          <IconButton
            className="eth-overview__button"
            Icon={
              <Icon
                name={IconName.Stake}
                color={IconColor.primaryInverse}
                size={IconSize.Sm}
              />
            }
            label={t('stake')}
            data-testid="token-overview-mmi-stake"
            tooltipRender={null}
            onClick={() => {
              stakingEvent();
              global.platform.openTab({
                url: `${mmiPortfolioUrl}/stake`,
              });
            }}
          />
          {mmiPortfolioEnabled && (
            <IconButton
              className="eth-overview__button"
              Icon={
                <Icon
                  name={IconName.Diagram}
                  color={IconColor.primaryInverse}
                  size={IconSize.Sm}
                />
              }
              label={t('portfolio')}
              data-testid="token-overview-mmi-portfolio"
              tooltipRender={null}
              onClick={() => {
                portfolioEvent();
                global.platform.openTab({
                  url: mmiPortfolioUrl,
                });
              }}
            />
          )}
        </>
        ///: END:ONLY_INCLUDE_IF
      }

      <IconButton
        className="token-overview__button"
        onClick={async () => {
          trackEvent(
            {
              event: MetaMetricsEventName.NavSendButtonClicked,
              category: MetaMetricsEventCategory.Navigation,
              properties: {
                token_symbol: token.symbol,
                location: MetaMetricsSwapsEventSource.TokenView,
                text: 'Send',
                chain_id: chainId,
              },
            },
            { excludeMetaMetricsId: false },
          );
          try {
            await dispatch(
              startNewDraftTransaction({
                type: AssetType.token,
                details: token,
              }),
            );
            history.push(SEND_ROUTE);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (err: any) {
            if (!err.message.includes(INVALID_ASSET_TYPE)) {
              throw err;
            }
          }
        }}
        Icon={
          <Icon
            name={IconName.Arrow2UpRight}
            color={IconColor.primaryInverse}
            size={IconSize.Sm}
          />
        }
        label={t('send')}
        data-testid="eth-overview-send"
        disabled={token.isERC721}
        tooltipRender={null}
      />

        <IconButton
          className="token-overview__button"
          Icon={
            <Icon
              name={IconName.SwapHorizontal}
              color={IconColor.primaryInverse}
              size={IconSize.Sm}
            />
          }
          onClick={() => {
            ///: BEGIN:ONLY_INCLUDE_IF(build-mmi)
            openBuyCryptoInPdapp()
            ///: END:ONLY_INCLUDE_IF

            ///: BEGIN:ONLY_INCLUDE_IF(build-main,build-beta,build-flask)
            // no-op
            ///: END:ONLY_INCLUDE_IF
          }}
          label={t('swap')}
          tooltipRender={null}
        />
    </Box>
  );
};

export default TokenButtons;
