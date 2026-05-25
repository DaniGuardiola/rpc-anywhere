import {
  rpcTransportMessageIn,
  rpcTransportMessageOut,
  type RPCTransportOptions,
} from "../transport-utils.js";
import { type RPCTransport } from "../types.js";

export type RPCBrowserRuntimePort = {
  postMessage(message: any): void;
  onMessage: {
    addListener(callback: (message: any) => void): void;
    removeListener(callback: (message: any) => void): void;
  };
};

/**
 * Options for the browser runtime port transport.
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
  filter?: (message: any, port: RPCBrowserRuntimePort) => boolean;
};

/**
 * Creates a transport from a browser runtime port. Useful for RPCs
 * in browser extensions, like between content scripts and service workers
 * (background scripts). [Learn more on MDN.](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/Port)
 */
export function createTransportFromBrowserRuntimePort(
  /**
   * The browser runtime port.
   */
  port: RPCBrowserRuntimePort,
  /**
   * Options for the browser runtime port transport.
   */
  options: RPCBrowserRuntimePortTransportOptions = {},
): RPCTransport {
  const { transportId, filter } = options;
  let transportHandler: ((message: any) => void) | undefined;
  return {
    send(data) {
      port.postMessage(rpcTransportMessageOut(data, { transportId }));
    },
    registerHandler(handler) {
      transportHandler = (message) => {
        const [ignore, data] = rpcTransportMessageIn(message, {
          transportId,
          filter: () => filter?.(message, port),
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
