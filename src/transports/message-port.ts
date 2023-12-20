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
   * The object that supports `postMessage(message)` and
   * `addEventListener("message", listener)`. This includes `Window`,
   * `Worker`, `MessagePort`, and `BroadcastChannel`.
   */
  messageEventTarget: Window | Worker | MessagePort | BroadcastChannel,
  /**
   * Options for the message port transport.
   */
  options: RPCMessagePortTransportOptions = {},
): RPCTransport {
  const { transportId, filter } = options;
  const target = messageEventTarget as Window; // little white TypeScript lie

  let transportHandler: ((event: MessageEvent) => any) | undefined;
  return {
    send(data) {
      target.postMessage(rpcTransportMessageOut(data, { transportId }));
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
      target.addEventListener("message", transportHandler);
    },
    unregisterHandler() {
      if (transportHandler)
        target.removeEventListener("message", transportHandler);
    },
  };
}

// TODO: message port transport tests.
