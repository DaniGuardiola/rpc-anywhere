import { type RPCRequestHandlerObject } from "./types.js";

/**
 * Creates a typed RPC request handler in "object" form.
 */
export function createRPCRequestHandler<
  const Handler extends RPCRequestHandlerObject,
>(
  /**
   * The RPC request handler object.
   */
  handler: Handler,
) {
  return handler;
}
