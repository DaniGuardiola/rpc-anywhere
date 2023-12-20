import { _createRPC } from "./rpc.js";
import {
  type EmptyRPCSchema,
  type RPC,
  type RPCOptions,
  type RPCSchema,
} from "./types.js";

/**
 * Creates an RPC instance that can send and receive requests, responses
 * and messages.
 */
export function createRPC<
  Schema extends RPCSchema = RPCSchema,
  RemoteSchema extends RPCSchema = Schema,
>(
  /**
   * The options that will be used to configure the RPC instance.
   */
  options?: RPCOptions<Schema, RemoteSchema>,
): RPC<Schema, RemoteSchema> {
  return _createRPC<Schema, RemoteSchema>(options);
}

/**
 * Creates an RPC instance as a client. The passed schema represents
 * the remote RPC's (server) schema.
 */
export function createClientRPC<RemoteSchema extends RPCSchema = RPCSchema>(
  /**
   * The options that will be used to configure the RPC instance.
   */
  options: RPCOptions<EmptyRPCSchema, RemoteSchema>,
): RPC<EmptyRPCSchema, RemoteSchema> {
  return _createRPC<EmptyRPCSchema, RemoteSchema>(options);
}

/**
 * Creates an RPC instance as a server. The passed schema represents
 * this RPC's (server) schema.
 */
export function createServerRPC<Schema extends RPCSchema = RPCSchema>(
  /**
   * The options that will be used to configure the RPC instance.
   */
  options: RPCOptions<Schema, EmptyRPCSchema>,
) {
  return _createRPC<Schema, EmptyRPCSchema>(options);
}
