import { type RPCTransport } from "../types.js";
import {
  createTransportFromMessagePort,
  type RPCMessagePortTransportOptions,
} from "./message-port.js";

/**
 * Options for the broadcast channel transport.
 */
export type RPCBroadcastChannelTransportOptions = Omit<
  RPCMessagePortTransportOptions,
  "remotePort"
>;

/**
 * Creates a transport from a
 * [`BroadcastChannel`](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel).
 */
export function createTransportFromBroadcastChannel(
  /**
   * The broadcast channel instance to create a transport from.
   */
  channel: BroadcastChannel,
  /**
   * Options for the broadcast channel transport.
   */
  options?: RPCBroadcastChannelTransportOptions,
): RPCTransport {
  return createTransportFromMessagePort(channel, options);
}
