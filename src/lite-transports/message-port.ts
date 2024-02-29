import {
  rpcTransportMessageInLite,
  rpcTransportMessageOut,
} from "../transport-utils.js";
import { type RPCTransport } from "../types.js";

/**
 * Options for the lite message port transport.
 */
export type RPCMessagePortLiteTransportOptions = {
  /**
   * An optional unique ID to use for the transport. Useful in cases where
   * messages are sent to or received from multiple sources, which causes
   * issues.
   */
  transportId?: string | number;
};

/**
 * Creates a transport from objects that support `postMessage(message)`
 * and `addEventListener("message", listener)`. This includes `Window`,
 * `Worker`, `MessagePort`, and `BroadcastChannel`.
 *
 * This is useful for RPCs between, among other things, iframes or workers.
 */
export function createLiteTransportFromMessagePort(
  /**
   * The local port that will receive and handled "message" events
   * through `addEventListener("message", listener)`.
   */
  localPort: MessagePort | Window | Worker | BroadcastChannel,
  /**
   * The remote port to send messages to through `postMessage(message)`.
   */
  remotePort: MessagePort | Window | Worker | BroadcastChannel,
  /**
   * Options for the message port transport.
   */
  { transportId }: RPCMessagePortLiteTransportOptions = {},
): RPCTransport {
  return {
    send(data) {
      (remotePort as Window).postMessage(
        rpcTransportMessageOut(data, { transportId }),
      );
    },
    registerHandler(handler) {
      (localPort as Window).addEventListener(
        "message",
        (event: MessageEvent) => {
          const message = event.data;
          const [ignore, data] = rpcTransportMessageInLite(
            message,
            transportId,
          );
          if (!ignore) handler(data);
        },
      );
    },
  };
}

// TODO: message port transport tests.
