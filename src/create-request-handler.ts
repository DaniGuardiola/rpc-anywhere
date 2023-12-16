import { type RPCRequestHandlerObject } from "./types.js";

export function createRPCRequestHandler<
  const Handler extends RPCRequestHandlerObject,
>(handler: Handler) {
  return handler;
}
