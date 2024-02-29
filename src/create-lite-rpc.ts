import { _createLiteRPC, type LiteRPCOptions } from "./lite-rpc.js";
import { type LiteRPC, type RPCSchema } from "./types.js";

/**
 * Creates a lite RPC instance that can send and receive requests, responses
 * and messages.
 */
export function createLiteRPC<
  Schema extends RPCSchema = RPCSchema,
  RemoteSchema extends RPCSchema = Schema,
>(
  /**
   * The options that will be used to configure the RPC instance.
   */
  options?: LiteRPCOptions<Schema, RemoteSchema>,
): LiteRPC<Schema, RemoteSchema> {
  return _createLiteRPC<Schema, RemoteSchema>(options);
}
