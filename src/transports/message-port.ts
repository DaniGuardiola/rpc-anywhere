import {
  rpcTransportMessageIn,
  rpcTransportMessageOut,
  type RPCTransportOptions,
} from "../transport-utils.js";
import { type RPCTransport } from "../types.js";

/**
 * Options for the message port transport.
 */
export type RPCMessagePortTransportOptions = Pick<
  RPCTransportOptions,
  "transportId"
> & {
  /**
   * A filter function that determines if a message should be processed or
   * ignored. Like the `transportId` option, but more flexible to allow for
   * more complex use-cases.
   *
   * It receives the
   * [`MessageEvent`](https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent)
   * object as its only argument. For example, messages can be filtered
   * based on `event.origin` or `event.source`.
   */
  filter?: (event: MessageEvent) => boolean;
};

/**
 * Creates a transport from an object that supports `postMessage(message)`
 * and `addEventListener("message", listener)`. This includes `Window`,
 * `Worker`, `MessagePort`, and `BroadcastChannel`.
 *
 * This is useful for RPCs between, among other things, iframes or workers.
 */
export function createTransportFromMessagePort(
  /**
   * The local port that will receive and handled "message" events
   * through `addEventListener("message", listener)`.
   */
  localPort: Window | Worker | MessagePort | BroadcastChannel,
  /**
   * The remote port to send messages to through `postMessage(message)`.
   */
  remotePort: Window | Worker | MessagePort | BroadcastChannel,
  /**
   * Options for the message port transport.
   */
  options: RPCMessagePortTransportOptions = {},
): RPCTransport {
  const { transportId, filter } = options;

  // little white TypeScript lies
  const local = localPort as Window;
  const remote = remotePort as Window;

  let transportHandler: ((event: MessageEvent) => any) | undefined;
  return {
    send(data) {
      remote.postMessage(rpcTransportMessageOut(data, { transportId }));
    },
    registerHandler(handler) {
      transportHandler = (event: MessageEvent) => {
        const message = event.data;
        const [ignore, data] = rpcTransportMessageIn(message, {
          transportId,
          filter: () => filter?.(event),
        });
        if (ignore) return;
        handler(data);
      };
      local.addEventListener("message", transportHandler);
    },
    unregisterHandler() {
      if (transportHandler)
        local.removeEventListener("message", transportHandler);
    },
  };
}

// TODO: message port transport tests.
