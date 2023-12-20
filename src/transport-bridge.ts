import { type RPCTransport } from "./types.js";

/**
 * A transport bridge is a pair of transports that are connected to each other.
 * Messages sent to one transport will be forwarded to the other, and vice versa.
 */
export type RPCTransportBridge = {
  start(): void;
  stop(): void;
};

function unidirectionalBridge(
  transportIn: RPCTransport,
  transportOut: RPCTransport,
) {
  if (!transportIn.registerHandler || !transportOut.send) return;
  const handler = (message: any) => transportOut.send?.(message);
  transportIn.registerHandler(handler);
  return function cleanUp() {
    transportIn.unregisterHandler?.();
  };
}

/**
 * Creates a transport bridge between two transports.
 */
export function createTransportBridge(
  transportA: RPCTransport,
  transportB: RPCTransport,
): RPCTransportBridge {
  let cleanUpAToB: (() => void) | undefined;
  let cleanUpBToA: (() => void) | undefined;

  return {
    start() {
      cleanUpAToB = unidirectionalBridge(transportA, transportB);
      cleanUpBToA = unidirectionalBridge(transportB, transportA);
    },
    stop() {
      cleanUpAToB?.();
      cleanUpAToB = undefined;
      cleanUpBToA?.();
      cleanUpBToA = undefined;
    },
  };
}
