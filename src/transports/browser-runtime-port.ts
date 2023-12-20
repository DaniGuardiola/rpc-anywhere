import { type Browser, type Chrome } from "browser-namespace";

import {
  rpcTransportMessageIn,
  rpcTransportMessageOut,
  type RPCTransportOptions,
} from "../transport-utils.js";
import { type RPCTransport } from "../types.js";

type Port = Browser.Runtime.Port | Chrome.runtime.Port;

/**
 * Options for the message port transport.
 */
export type RPCBrowserRuntimePortTransportOptions = Pick<
  RPCTransportOptions,
  "transportId"
> & {
  /**
   * A filter function that determines if a message should be processed or
   * ignored. Like the `transportId` option, but more flexible to allow for
   * more complex use-cases.
   *
   * It receives the message and the
   * [`runtime.Port`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/Port)
   * as arguments. For example, messages can be filtered
   * based on `port.name` or `port.sender`.
   */
  filter?: (message: any, port: Browser.Runtime.Port) => boolean;
};

/**
 * Creates a transport from a browser runtime port. Useful for RPCs
 * between content scripts and service workers in web extensions.
 */
export function createTransportFromBrowserRuntimePort(
  port: Port,
  options: RPCBrowserRuntimePortTransportOptions = {},
): RPCTransport {
  const { transportId, filter } = options;
  let transportHandler: ((message: any, port: Port) => void) | undefined;
  return {
    send(data) {
      port.postMessage(rpcTransportMessageOut(data, { transportId }));
    },
    registerHandler(handler) {
      transportHandler = (message, port) => {
        const [ignore, data] = rpcTransportMessageIn(message, {
          transportId,
          filter: () => filter?.(message, port as Browser.Runtime.Port),
        });
        if (ignore) return;
        handler(data);
      };
      port.onMessage.addListener(transportHandler);
    },
    unregisterHandler() {
      if (transportHandler) port.onMessage.removeListener(transportHandler);
    },
  };
}

// TODO: browser runtime port transport tests.
