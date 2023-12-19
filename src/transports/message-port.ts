import { type RPCTransport } from "../types.js";

/**
 * Options for the message port transport.
 */
export type RPCMessagePortTransportHandlerOptions = {
  /**
   * An optional unique ID to use for the transport. Useful in cases where
   * messages could be sent to or received from multiple sources, which
   * causes issues.
   *
   * For example, messages could be sent to the same window from multiple
   * sources (other RPC transports or other code). The IDs can be used to
   * differentiate between them.
   */
  id?: string | number;

  /**
   * A way to filter messages based on the message event
   * ([`MessageEvent`](https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent)).
   * Like the `transportId` option, but more flexible to allow for more
   * complex use-cases.
   *
   * For example, messages can be filtered based on the `origin` or `source`
   * properties of the message event.
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
  options: RPCMessagePortTransportHandlerOptions = {},
): RPCTransport {
  const { id: transportId, filter } = options;
  if (transportId != null && filter)
    throw new Error(
      "Cannot use both `transportId` and `filter` options at the same time",
    );

  let transportHandler: ((event: MessageEvent) => void) | undefined;
  return {
    send(message) {
      if (transportId != null) {
        messageEventTarget.postMessage({ transportId, message });
        return;
      }
      messageEventTarget.postMessage;
    },
    registerHandler(handler) {
      transportHandler = (event: MessageEvent) => {
        if (transportId != null) {
          if (event.data.transportId !== transportId) return;
          const { message } = event.data;
          handler(message);
          return;
        }
        if (filter) {
          if (!filter(event)) return;
          handler(event.data);
          return;
        }
        handler(event.data);
      };
      messageEventTarget.addEventListener("message", transportHandler as any);
    },
    unregisterHandler() {
      if (transportHandler)
        messageEventTarget.removeEventListener(
          "message",
          transportHandler as any,
        );
    },
  };
}
