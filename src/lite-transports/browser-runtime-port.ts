import { type Browser, type Chrome } from "browser-namespace";

import {
  rpcTransportMessageInLite,
  rpcTransportMessageOut,
} from "../transport-utils.js";
import { type RPCTransport } from "../types.js";

type Port = Browser.Runtime.Port | Chrome.runtime.Port;

/**
 * Options for the message port transport.
 */
export type RPCBrowserRuntimePortLiteTransportOptions = {
  /**
   * An optional unique ID to use for the transport. Useful in cases where
   * messages are sent to or received from multiple sources, which causes
   * issues.
   */
  transportId?: string | number;
};

/**
 * Creates a transport from a browser runtime port. Useful for RPCs
 * between content scripts and service workers in browser extensions.
 */
export function createLiteTransportFromBrowserRuntimePort(
  /**
   * The browser runtime port.
   */
  port: Port,
  /**
   * Options for the browser runtime port transport.
   */
  { transportId }: RPCBrowserRuntimePortLiteTransportOptions = {},
): RPCTransport {
  return {
    send(data) {
      port.postMessage(rpcTransportMessageOut(data, { transportId }));
    },
    registerHandler(handler) {
      port.onMessage.addListener((message) => {
        const [ignore, data] = rpcTransportMessageInLite(message, transportId);
        if (ignore) return;
        handler(data);
      });
    },
  };
}

// TODO: browser runtime port transport tests.
