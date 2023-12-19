import { type Browser, type Chrome } from "browser-namespace";

import { type RPCTransport, type RPCTransportHandler } from "../types.js";

/**
 * Creates a transport from a browser runtime port. Useful for RPCs
 * between content scripts and service workers in web extensions.
 */
export function createTransportFromBrowserRuntimePort(
  port: Browser.Runtime.Port | Chrome.runtime.Port,
): RPCTransport {
  let transportHandler: RPCTransportHandler | undefined;
  return {
    send: port.postMessage.bind(port),
    registerHandler(handler) {
      transportHandler = handler;
      port.onMessage.addListener(handler);
    },
    unregisterHandler() {
      if (transportHandler) port.onMessage.removeListener(transportHandler);
    },
  };
}
