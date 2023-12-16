import { type Browser, type Chrome } from "browser-namespace";

import { type RPCTransport } from "../types.js";

/**
 * Creates a transport from a browser runtime port. Useful for RPCs
 * between content scripts and service workers in web extensions.
 */
export function createTransportFromBrowserRuntimePort(
  port: Browser.Runtime.Port | Chrome.runtime.Port,
): RPCTransport {
  return {
    send: port.postMessage.bind(port),
    registerHandler: port.onMessage.addListener.bind(port.onMessage),
  };
}
