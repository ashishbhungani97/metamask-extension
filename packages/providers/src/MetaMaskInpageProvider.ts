import { rpcErrors } from '@metamask/rpc-errors';
import type { Json, JsonRpcRequest, JsonRpcResponse } from '@metamask/utils';
import type { Duplex } from 'readable-stream';

import type { UnvalidatedJsonRpcRequest } from './BaseProvider';
import messages from './messages';
import { sendSiteMetadata } from './siteMetadata';
import type { StreamProviderOptions } from './StreamProvider';
import { AbstractStreamProvider } from './StreamProvider';
import {
  EMITTED_NOTIFICATIONS,
  getDefaultExternalMiddleware,
  getRpcPromiseCallback,
  NOOP,
} from './utils';

export type SendSyncJsonRpcRequest = {
  method:
    | 'eth_accounts'
    | 'eth_coinbase'
    | 'eth_uninstallFilter'
    | 'net_version';
} & JsonRpcRequest;

type WarningEventName = keyof SentWarningsState['events'];

export type MetaMaskInpageProviderOptions = {
  /**
   * Whether the provider should send page metadata.
   */
  shouldSendMetadata?: boolean;

  jsonRpcStreamName?: string | undefined;
} & Partial<Omit<StreamProviderOptions, 'rpcMiddleware' | 'jsonRpcStreamName'>>;

type SentWarningsState = {
  // methods
  enable: boolean;
  experimentalMethods: boolean;
  send: boolean;
  // events
  events: {
    close: boolean;
    data: boolean;
    networkChanged: boolean;
    notification: boolean;
  };
};

/**
 * The name of the stream consumed by {@link MetaMaskInpageProvider}.
 */
export const MetaMaskInpageProviderStreamName = 'metamask-provider';

export class MetaMaskInpageProvider extends AbstractStreamProvider {
  protected _sentWarnings: SentWarningsState = {
    // methods
    enable: false,
    experimentalMethods: false,
    send: false,
    // events
    events: {
      close: false,
      data: false,
      networkChanged: false,
      notification: false,
    },
  };

  /**
   * Experimental methods can be found here.
   */
  public readonly _metamask: ReturnType<
    MetaMaskInpageProvider['_getExperimentalApi']
  >;

  #networkVersion: string | null;

  /**
   * Indicating that this provider is a MetaMask provider.
   */
  public readonly isMetaMask: false;

  /**
   * Creates a new `MetaMaskInpageProvider`.
   *
   * @param connectionStream - A Node.js duplex stream.
   * @param options - An options bag.
   * @param options.jsonRpcStreamName - The name of the internal JSON-RPC stream.
   * Default: `metamask-provider`.
   * @param options.logger - The logging API to use. Default: `console`.
   * @param options.maxEventListeners - The maximum number of event
   * listeners. Default: 100.
   * @param options.shouldSendMetadata - Whether the provider should
   * send page metadata. Default: `true`.
   */
  constructor(
    connectionStream: Duplex,
    {
      jsonRpcStreamName = MetaMaskInpageProviderStreamName,
      logger = console,
      maxEventListeners = 100,
      shouldSendMetadata,
    }: MetaMaskInpageProviderOptions = {},
  ) {
    super(connectionStream, {
      jsonRpcStreamName,
      logger,
      maxEventListeners,
      rpcMiddleware: getDefaultExternalMiddleware(logger),
    });

    // We shouldn't perform asynchronous work in the constructor, but at one
    // point we started doing so, and changing this class isn't worth it at
    // the time of writing.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this._initializeStateAsync();

    this.#networkVersion = null;
    this.isMetaMask = false;

    this._sendSync = this._sendSync.bind(this);
    this.enable = this.enable.bind(this);
    this.send = this.send.bind(this);
    this.sendAsync = this.sendAsync.bind(this);
    this._warnOfDeprecation = this._warnOfDeprecation.bind(this);

    this._metamask = this._getExperimentalApi();

    // handle JSON-RPC notifications
    this._jsonRpcConnection.events.on('notification', (payload) => {
      const { method } = payload;
      if (EMITTED_NOTIFICATIONS.includes(method)) {
        // deprecated
        // emitted here because that was the original order
        this.emit('data', payload);
        // deprecated
        this.emit('notification', payload.params.result);
      }
    });

    // send website metadata
    if (shouldSendMetadata) {
      if (document.readyState === 'complete') {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        sendSiteMetadata(this._rpcEngine, this._log);
      } else {
        const domContentLoadedHandler = () => {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          sendSiteMetadata(this._rpcEngine, this._log);
          window.removeEventListener(
            'DOMContentLoaded',
            domContentLoadedHandler,
          );
        };
        window.addEventListener('DOMContentLoaded', domContentLoadedHandler);
      }
    }
  }

  //====================
  // Read-only Properties
  //====================

  get chainId(): string | null {
    return super.chainId;
  }

  get networkVersion(): string | null {
    return this.#networkVersion;
  }

  get selectedAddress(): string | null {
    return super.selectedAddress;
  }

  //====================
  // Public Methods
  //====================

  /**
   * Submits an RPC request per the given JSON-RPC request object.
   *
   * @param payload - The RPC request object.
   * @param callback - The callback function.
   */
  sendAsync(
    payload: JsonRpcRequest,
    callback: (error: Error | null, result?: JsonRpcResponse<Json>) => void,
  ): void {
    this._rpcRequest(payload, callback);
  }

  /**
   * We override the following event methods so that we can warn consumers
   * about deprecated events:
   * `addListener`, `on`, `once`, `prependListener`, `prependOnceListener`.
   */

  addListener(eventName: string, listener: (...args: unknown[]) => void) {
    this._warnOfDeprecation(eventName);
    return super.addListener(eventName, listener);
  }

  on(eventName: string, listener: (...args: unknown[]) => void) {
    this._warnOfDeprecation(eventName);
    return super.on(eventName, listener);
  }

  once(eventName: string, listener: (...args: unknown[]) => void) {
    this._warnOfDeprecation(eventName);
    return super.once(eventName, listener);
  }

  prependListener(eventName: string, listener: (...args: unknown[]) => void) {
    this._warnOfDeprecation(eventName);
    return super.prependListener(eventName, listener);
  }

  prependOnceListener(
    eventName: string,
    listener: (...args: unknown[]) => void,
  ) {
    this._warnOfDeprecation(eventName);
    return super.prependOnceListener(eventName, listener);
  }

  //====================
  // Private Methods
  //====================

  /**
   * When the provider becomes disconnected, updates internal state and emits
   * required events. Idempotent with respect to the isRecoverable parameter.
   *
   * Error codes per the CloseEvent status codes as required by EIP-1193:
   * https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent#Status_codes.
   *
   * @param isRecoverable - Whether the disconnection is recoverable.
   * @param errorMessage - A custom error message.
   * @fires BaseProvider#disconnect - If the disconnection is not recoverable.
   */
  protected _handleDisconnect(isRecoverable: boolean, errorMessage?: string) {
    super._handleDisconnect(isRecoverable, errorMessage);
    if (this.#networkVersion && !isRecoverable) {
      this.#networkVersion = null;
    }
  }

  /**
   * Warns of deprecation for the given event, if applicable.
   *
   * @param eventName - The name of the event.
   */
  protected _warnOfDeprecation(eventName: string): void {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-boolean-literal-compare
    if (this._sentWarnings?.events[eventName as WarningEventName] === false) {
      this._log.warn(messages.warnings.events[eventName as WarningEventName]);
      this._sentWarnings.events[eventName as WarningEventName] = true;
    }
  }

  //====================
  // Deprecated Methods
  //====================

  /**
   * Equivalent to: `ethereum.request('eth_requestAccounts')`.
   *
   * @deprecated Use request({ method: 'eth_requestAccounts' }) instead.
   * @returns A promise that resolves to an array of addresses.
   */
  async enable(): Promise<string[]> {
    if (!this._sentWarnings.enable) {
      this._log.warn(messages.warnings.enableDeprecation);
      this._sentWarnings.enable = true;
    }

    return new Promise<string[]>((resolve, reject) => {
      try {
        this._rpcRequest(
          { method: 'eth_requestAccounts', params: [] },
          getRpcPromiseCallback(resolve, reject),
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Submits an RPC request for the given method, with the given params.
   *
   * @deprecated Use "request" instead.
   * @param method - The method to request.
   * @param params - Any params for the method.
   * @returns A Promise that resolves with the JSON-RPC response object for the
   * request.
   */
  send<Type extends Json>(
    method: string,
    params?: Type[],
  ): Promise<JsonRpcResponse<Type>>;

  /**
   * Submits an RPC request per the given JSON-RPC request object.
   *
   * @deprecated Use "request" instead.
   * @param payload - A JSON-RPC request object.
   * @param callback - An error-first callback that will receive the JSON-RPC
   * response object.
   */
  send<Type extends Json>(
    payload: JsonRpcRequest,
    callback: (error: Error | null, result?: JsonRpcResponse<Type>) => void,
  ): void;

  /**
   * Accepts a JSON-RPC request object, and synchronously returns the cached result
   * for the given method. Only supports 4 specific RPC methods.
   *
   * @deprecated Use "request" instead.
   * @param payload - A JSON-RPC request object.
   * @returns A JSON-RPC response object.
   */
  send<Type extends Json>(
    payload: SendSyncJsonRpcRequest,
  ): JsonRpcResponse<Type>;

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  send(methodOrPayload: unknown, callbackOrArgs?: unknown): unknown {
    if (!this._sentWarnings.send) {
      this._log.warn(messages.warnings.sendDeprecation);
      this._sentWarnings.send = true;
    }

    if (
      typeof methodOrPayload === 'string' &&
      (!callbackOrArgs || Array.isArray(callbackOrArgs))
    ) {
      return new Promise((resolve, reject) => {
        try {
          this._rpcRequest(
            { method: methodOrPayload, params: callbackOrArgs },
            getRpcPromiseCallback(resolve, reject, false),
          );
        } catch (error) {
          reject(error);
        }
      });
    } else if (
      methodOrPayload &&
      typeof methodOrPayload === 'object' &&
      typeof callbackOrArgs === 'function'
    ) {
      return this._rpcRequest(
        methodOrPayload as JsonRpcRequest,
        callbackOrArgs as (...args: unknown[]) => void,
      );
    }
    return this._sendSync(methodOrPayload as SendSyncJsonRpcRequest);
  }

  /**
   * Internal backwards compatibility method, used in send.
   *
   * @param payload - A JSON-RPC request object.
   * @returns A JSON-RPC response object.
   * @deprecated
   */
  protected _sendSync(payload: SendSyncJsonRpcRequest) {
    let result;
    switch (payload.method) {
      case 'eth_accounts':
        result = this.selectedAddress ? [this.selectedAddress] : [];
        break;

      case 'eth_coinbase':
        result = this.selectedAddress ?? null;
        break;

      case 'eth_uninstallFilter':
        this._rpcRequest(payload, NOOP);
        result = true;
        break;

      case 'net_version':
        result = this.#networkVersion ?? null;
        break;

      default:
        throw new Error(messages.errors.unsupportedSync(payload.method));
    }

    return {
      id: payload.id,
      jsonrpc: payload.jsonrpc,
      result,
    };
  }

  /**
   * Constructor helper.
   *
   * Gets the experimental _metamask API as Proxy, so that we can warn consumers
   * about its experimental nature.
   *
   * @returns The experimental _metamask API.
   */
  protected _getExperimentalApi() {
    return new Proxy(
      {
        /**
         * Determines if MetaMask is unlocked by the user.
         *
         * @returns Promise resolving to true if MetaMask is currently unlocked.
         */
        isUnlocked: async () => {
          if (!this._state.initialized) {
            await new Promise<void>((resolve) => {
              this.on('_initialized', () => resolve());
            });
          }
          return this._state.isUnlocked;
        },

        /**
         * Make a batch RPC request.
         *
         * @param requests - The RPC requests to make.
         */
        requestBatch: async (requests: UnvalidatedJsonRpcRequest[]) => {
          if (!Array.isArray(requests)) {
            throw rpcErrors.invalidRequest({
              message:
                'Batch requests must be made with an array of request objects.',
              data: requests,
            });
          }

          return new Promise((resolve, reject) => {
            this._rpcRequest(requests, getRpcPromiseCallback(resolve, reject));
          });
        },
      },
      {
        get: (obj, prop, ...args) => {
          if (!this._sentWarnings.experimentalMethods) {
            this._log.warn(messages.warnings.experimentalMethods);
            this._sentWarnings.experimentalMethods = true;
          }
          return Reflect.get(obj, prop, ...args);
        },
      },
    );
  }

  /**
   * Upon receipt of a new chainId and networkVersion, emits corresponding
   * events and sets relevant public state. Does nothing if neither the chainId
   * nor the networkVersion are different from existing values.
   *
   * @fires MetamaskInpageProvider#networkChanged
   * @param networkInfo - An object with network info.
   * @param networkInfo.chainId - The latest chain ID.
   * @param networkInfo.networkVersion - The latest network ID.
   */
  protected _handleChainChanged({
    chainId,
    networkVersion,
  }: { chainId?: string; networkVersion?: string } = {}) {
    // This will validate the params and disconnect the provider if the
    // networkVersion is 'loading'.
    super._handleChainChanged({ chainId, networkVersion });

    if (this._state.isConnected && networkVersion !== this.#networkVersion) {
      this.#networkVersion = networkVersion as string;
      if (this._state.initialized) {
        this.emit('networkChanged', this.#networkVersion);
      }
    }
  }
}
