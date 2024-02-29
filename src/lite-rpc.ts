import {
  type _RPCMessagePacket,
  type _RPCMessagePacketFromSchema,
  type _RPCRequestPacket,
  type _RPCRequestPacketFromSchema,
  type _RPCResponsePacket,
  type _RPCResponsePacketFromSchema,
  type RPCMessageHandlerFn,
  type RPCMessagePayload,
  type RPCRequestHandlerObject,
  type RPCRequestResponse,
  type RPCSchema,
  type RPCTransport,
} from "./types.js";

// constants
// ---------

const MAX_ID = 1e10;
const DEFAULT_MAX_REQUEST_TIME = 1000;

const MISSING_TRANSPORT_METHOD_ERROR = new Error("Missing transport method");
const UNEXPECTED_MESSAGE_ERROR = new Error("Unexpected message");

// options
// -------

export type _LiteRPCOptions<Schema extends RPCSchema> = {
  /**
   * A transport object that will be used to send and receive
   * messages.
   */
  transport?: RPCTransport;

  /**
   * The functions that will be used to handle requests.
   */
  requestHandler?: Omit<RPCRequestHandlerObject<Schema["requests"]>, "_">;

  /**
   * The maximum time to wait for a response to a request, in
   * milliseconds. If exceeded, the promise will be rejected.
   * @default 1000
   */
  maxRequestTime?: number;
};

type BaseOption = "transport";
type RequestsInOption = "requestHandler";
type RequestsOutOption = "maxRequestTime";

type OptionsByLocalSchema<Schema extends RPCSchema> =
  NonNullable<unknown> extends Schema["requests"] ? never : RequestsInOption;

type OptionsByRemoteSchema<RemoteSchema extends RPCSchema> =
  NonNullable<unknown> extends RemoteSchema["requests"]
    ? never
    : RequestsOutOption;

/**
 * Options for creating a lite RPC instance, tailored to a specific
 * set of schemas. Options will be ommitted if they are not
 * supported according to the schemas.
 *
 * For example, if the remote schema doesn't have a `requests`
 * property, the `maxRequestTime` option will be omitted because
 * the instance won't be able to send requests.
 */
export type LiteRPCOptions<
  Schema extends RPCSchema,
  RemoteSchema extends RPCSchema,
> = Pick<
  _LiteRPCOptions<Schema>,
  | BaseOption
  | OptionsByLocalSchema<Schema>
  | OptionsByRemoteSchema<RemoteSchema>
>;

// lite rpc
// --------

export function _createLiteRPC<
  Schema extends RPCSchema = RPCSchema,
  RemoteSchema extends RPCSchema = Schema,
>(
  /**
   * The options that will be used to configure the lite RPC instance.
   */
  options?: LiteRPCOptions<Schema, RemoteSchema>,
) {
  // options
  // -------

  const {
    transport = {},
    requestHandler,
    maxRequestTime = DEFAULT_MAX_REQUEST_TIME,
    // hackish cast, nothing to see here, move along
  } = options as LiteRPCOptions<
    RPCSchema<{ requests: { hack: { params: unknown } } }>,
    RPCSchema<{ requests: { hack: { params: unknown } } }>
  >;
  transport.registerHandler?.(handler);
  function requestHandlerFn(method: any, params: any) {
    const handlerFn = requestHandler?.[method as "hack"];
    if (handlerFn) return handlerFn(params);
    throw new Error(`Missing request handler`);
  }

  // requests
  // --------

  let lastRequestId = 0;
  function getRequestId() {
    if (lastRequestId <= MAX_ID) return ++lastRequestId;
    return (lastRequestId = 0);
  }
  const requestListeners = new Map<
    number,
    { resolve: (result: unknown) => void; reject: (error: Error) => void }
  >();
  const requestTimeouts = new Map<number, ReturnType<typeof setTimeout>>();

  /**
   * Sends a request to the remote RPC endpoint and returns a promise
   * with the response.
   *
   * @example
   *
   * ```js
   * await rpc.request("methodName", { param: "value" });
   * ```
   */
  function request<Method extends keyof RemoteSchema["requests"]>(
    method: Method,
    ...args: "params" extends keyof RemoteSchema["requests"][Method]
      ? undefined extends RemoteSchema["requests"][Method]["params"]
        ? [params?: RemoteSchema["requests"][Method]["params"]]
        : [params: RemoteSchema["requests"][Method]["params"]]
      : []
  ): Promise<RPCRequestResponse<RemoteSchema["requests"], Method>> {
    const params = args[0];
    return new Promise((resolve, reject) => {
      if (!transport.send) throw MISSING_TRANSPORT_METHOD_ERROR;
      const requestId = getRequestId();
      const request: _RPCRequestPacket = {
        type: "request",
        id: requestId,
        method,
        params,
      };
      requestListeners.set(requestId, { resolve, reject });
      if (maxRequestTime !== Infinity)
        requestTimeouts.set(
          requestId,
          setTimeout(() => {
            requestTimeouts.delete(requestId);
            reject(new Error("RPC request timed out."));
          }, maxRequestTime),
        );
      transport.send(request);
    }) as Promise<any>;
  }

  // messages
  // --------

  /**
   * Sends a message to the remote RPC endpoint.
   *
   * @example
   *
   * ```js
   * rpc.send("messageName", { content: "value" });
   * ```
   */
  function send<Message extends keyof Schema["messages"]>(
    /**
     * The name of the message to send.
     */
    message: Message,
    ...args: void extends RPCMessagePayload<Schema["messages"], Message>
      ? []
      : undefined extends RPCMessagePayload<Schema["messages"], Message>
        ? [payload?: RPCMessagePayload<Schema["messages"], Message>]
        : [payload: RPCMessagePayload<Schema["messages"], Message>]
  ) {
    const payload = args[0];
    if (!transport.send) throw MISSING_TRANSPORT_METHOD_ERROR;
    const rpcMessage: _RPCMessagePacket = {
      type: "message",
      id: message as string,
      payload,
    };
    transport.send(rpcMessage);
  }

  const messageListeners = new Map<any, Set<(payload: any) => void>>();

  /**
   * Adds a listener for a message from the remote RPC endpoint.
   */
  function addMessageListener<Message extends keyof RemoteSchema["messages"]>(
    /**
     * The name of the message to listen to.
     */
    message: Message,
    /**
     * The function that will be called when a message is received.
     */
    listener: RPCMessageHandlerFn<RemoteSchema["messages"], Message>,
  ): void {
    if (!transport.registerHandler) throw MISSING_TRANSPORT_METHOD_ERROR;
    if (!messageListeners.has(message))
      messageListeners.set(message, new Set());
    messageListeners.get(message)?.add(listener as any);
  }

  /**
   * Removes a listener for a message from the remote RPC endpoint.
   */
  function removeMessageListener<
    Message extends keyof RemoteSchema["messages"],
  >(
    /**
     * The name of the message to remove the listener for.
     */
    message: Message,
    /**
     * The listener function that will be removed.
     */
    listener: RPCMessageHandlerFn<RemoteSchema["messages"], Message>,
  ): void {
    messageListeners.get(message)?.delete(listener as any);
    if (messageListeners.get(message)?.size === 0)
      messageListeners.delete(message);
  }

  // message handling
  // ----------------

  async function handler(
    message:
      | _RPCRequestPacketFromSchema<Schema["requests"]>
      | _RPCResponsePacketFromSchema<RemoteSchema["requests"]>
      | _RPCMessagePacketFromSchema<RemoteSchema["messages"]>,
  ) {
    if (!("type" in message)) throw UNEXPECTED_MESSAGE_ERROR;
    if (message.type === "request") {
      if (!transport.send || !requestHandler)
        throw MISSING_TRANSPORT_METHOD_ERROR;
      const { id, method, params } = message;
      let response: _RPCResponsePacket;
      try {
        response = {
          type: "response",
          id,
          success: true,
          payload: await requestHandlerFn(method, params),
        };
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        response = {
          type: "response",
          id,
          success: false,
          error: error.message,
        };
      }
      transport.send(response);
      return;
    }
    if (message.type === "response") {
      const timeout = requestTimeouts.get(message.id);
      if (timeout != null) clearTimeout(timeout);
      const { resolve, reject } = requestListeners.get(message.id) ?? {};
      if (!message.success) reject?.(new Error(message.error));
      else resolve?.(message.payload);
      return;
    }
    if (message.type === "message") {
      const listeners = messageListeners.get(message.id);
      if (!listeners) return;
      for (const listener of listeners) listener(message.payload);
      return;
    }
    throw UNEXPECTED_MESSAGE_ERROR;
  }

  return { request, send, addMessageListener, removeMessageListener };
}

export type LiteRPCInstance<
  Schema extends RPCSchema = RPCSchema,
  RemoteSchema extends RPCSchema = Schema,
> = ReturnType<typeof _createLiteRPC<Schema, RemoteSchema>>;
