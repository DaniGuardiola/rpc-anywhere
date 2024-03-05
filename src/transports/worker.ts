/// <reference lib="webworker" />

import {
  createTransportFromMessagePort,
  type RPCMessagePortTransportOptions,
} from "./message-port.js";

/**
 * Options for the worker transport.
 */
export type RPCWorkerTransportOptions = Omit<
  RPCMessagePortTransportOptions,
  "remotePort"
>;

/**
 * Creates a transport to communicate with a
 * [`Worker`](https://developer.mozilla.org/en-US/docs/Web/API/Worker)
 * from the parent context.
 *
 * The target worker must must use `createWorkerParentTransport` with a matching
 * `transportId` or `filter` option (if set).
 *
 * @example
 *
 * ```ts
 * const rpc = createRPC<ParentSchema, WorkerSchema>({
 *   transport: createWorkerTransport(worker),
 *   // ...
 * });
 */
export function createWorkerTransport(
  /**
   * The worker instance to create a transport from.
   */
  worker: Worker,

  /**
   * Options for the worker transport.
   */
  options?: RPCWorkerTransportOptions,
) {
  return createTransportFromMessagePort(worker, options);
}

/**
 * Options for the worker parent transport.
 */
export type RPCWorkerParentTransportOptions = Omit<
  RPCMessagePortTransportOptions,
  "remotePort"
>;

/**
 * Creates a transport to communicate with the parent context from a
 * [`Worker`](https://developer.mozilla.org/en-US/docs/Web/API/Worker).
 *
 * The parent context must use `createWorkerTransport` with a matching
 * `transportId` or `filter` option (if set).
 *
 * @example
 *
 * ```ts
 * const rpc = createRPC<WorkerSchema, ParentSchema>({
 *   transport: createWorkerParentTransport(),
 *   // ...
 * });
 */
export function createWorkerParentTransport(
  /**
   * Options for the worker parent transport.
   */
  options?: RPCWorkerParentTransportOptions,
) {
  return createTransportFromMessagePort(self, options);
}
