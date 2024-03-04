import {
  rpcTransportMessageIn,
  rpcTransportMessageOut,
  type RPCTransportOptions,
} from "../transport-utils.js";
import { type RPCTransport } from "../types.js";

/**
 * Options for the browser runtime port transport.
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

  /**
   * The remote port to send messages to through `postMessage(message)`.
   */
  remotePort?: MessagePort | Window | Worker | BroadcastChannel;
};

/**
 * Creates a transport from objects that support `postMessage(message)`
 * and `addEventListener("message", listener)`. This includes `Window`,
 * `Worker`, `MessagePort`, and `BroadcastChannel`.
 *
 * This is useful for RPCs between, among other things, iframes or workers.
 */
export function createTransportFromMessagePort(
  /**
   * The local port that will receive and handled "message" events
   * through `addEventListener("message", listener)`. If the `remotePort`
   * option is omitted, it will also be used to send messages through
   * `postMessage(message)`.
   */
  port: MessagePort | Window | Worker | BroadcastChannel,

  /**
   * Options for the message port transport.
   */
  options: RPCMessagePortTransportOptions = {},
): RPCTransport {
  const { transportId, filter, remotePort } = options;

  // little white TypeScript lies
  const local = port as Window;
  const remote = (remotePort ?? port) as Window;

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
