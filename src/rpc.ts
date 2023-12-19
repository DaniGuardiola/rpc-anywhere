import {
  type RPCMessage,
  type RPCMessageFromSchema,
  type RPCMessageHandlerFn,
  type RPCMessagePayload,
  type RPCOptions,
  type RPCRequest,
  type RPCRequestFromSchema,
  type RPCRequestHandler,
  type RPCRequestHandlerFn,
  type RPCRequestResponse,
  type RPCRequestsProxy,
  type RPCResponse,
  type RPCResponseFromSchema,
  type RPCSchema,
  type RPCTransport,
  type WildcardRPCMessageHandlerFn,
} from "./types.js";

const MAX_ID = 1e10;
const DEFAULT_MAX_REQUEST_TIME = 1000;

function missingTransportMethodError(methods: string[], action: string) {
  const methodsString = methods.map((method) => `"${method}"`).join(", ");
  return new Error(
    `This RPC instance cannot ${action} because the transport did not provide one or more of these methods: ${methodsString}`,
  );
}

export function _createRPC<
  Schema extends RPCSchema = RPCSchema,
  RemoteSchema extends RPCSchema = Schema,
>(
  /**
   * The options that will be used to configure the RPC instance.
   */
  options: RPCOptions<Schema> = {},
) {
  // setters
  // -------

  let transport: RPCTransport = {};
  function setTransport(newTransport: RPCTransport) {
    if (transport.unregisterHandler) transport.unregisterHandler();
    transport = newTransport;
    transport.registerHandler?.(handler);
  }

  let requestHandler: RPCRequestHandlerFn<Schema["requests"]> | undefined =
    undefined;

  /**
   * Sets the function that will be used to handle requests from the
   * remote RPC instance.
   */
  function setRequestHandler(
    /**
     * The function that will be set as the "request handler" function.
     */
    handler: RPCRequestHandler<Schema["requests"]>,
  ) {
    if (typeof handler === "function") {
      requestHandler = handler;
      return;
    }
    requestHandler = (method: keyof Schema["requests"], params: any) => {
      const handlerFn = handler[method];
      if (handlerFn) return handlerFn(params);
      const fallbackHandler = handler._;
      if (!fallbackHandler)
        throw new Error(
          `The requested method has no handler: ${method as string}`,
        );
      return fallbackHandler(method, params);
    };
  }

  // options
  // -------

  const { maxRequestTime = DEFAULT_MAX_REQUEST_TIME } = options;
  if (options.transport) setTransport(options.transport);
  if (options.requestHandler) setRequestHandler(options.requestHandler);

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
      if (!transport.send)
        throw missingTransportMethodError(["send"], "make requests");
      const requestId = getRequestId();
      const request: RPCRequest = {
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

  /**
   * A proxy that allows calling requests as if they were functions.
   */
  const requestProxy = new Proxy(
    {},
    {
      get: (_, prop) => {
        // @ts-expect-error Not very important.
        return (params: unknown) => request(prop, params);
      },
    },
  ) as RPCRequestsProxy<RemoteSchema["requests"]>;

  // messages
  // --------

  /**
   * Sends a message to the remote RPC endpoint.
   */
  function send<Message extends keyof Schema["messages"]>(
    /**
     * The name of the message to send.
     */
    message: Message,
    ...args: void extends RPCMessagePayload<Schema["messages"], Message>
      ? []
      : [payload: RPCMessagePayload<Schema["messages"], Message>]
  ) {
    const payload = args[0];
    if (!transport.send)
      throw missingTransportMethodError(["send"], "send messages");
    const rpcMessage: RPCMessage = {
      type: "message",
      id: message as string,
      payload,
    };
    transport.send(rpcMessage);
  }

  const messageListeners = new Map<any, Set<(payload: any) => void>>();
  const wildcardMessageListeners = new Set<
    (messageName: any, payload: any) => void
  >();

  /**
   * Adds a listener for a message (or all if "*" is used) from the
   * remote RPC endpoint.
   */
  function addMessageListener(
    /**
     * The name of the message to listen to. Use "*" to listen to all
     * messages.
     */
    message: "*",
    /**
     * The function that will be called when a message is received.
     */
    listener: WildcardRPCMessageHandlerFn<RemoteSchema["messages"]>,
  ): void;
  /**
   * Adds a listener for a message (or all if "*" is used) from the
   * remote RPC endpoint.
   */
  function addMessageListener<Message extends keyof RemoteSchema["messages"]>(
    /**
     * The name of the message to listen to. Use "*" to listen to all
     * messages.
     */
    message: Message,
    /**
     * The function that will be called when a message is received.
     */
    listener: RPCMessageHandlerFn<RemoteSchema["messages"], Message>,
  ): void;
  /**
   * Adds a listener for a message (or all if "*" is used) from the
   * remote RPC endpoint.
   */
  function addMessageListener<Message extends keyof RemoteSchema["messages"]>(
    /**
     * The name of the message to listen to. Use "*" to listen to all
     * messages.
     */
    message: "*" | Message,
    /**
     * The function that will be called when a message is received.
     */
    listener:
      | WildcardRPCMessageHandlerFn<RemoteSchema["messages"]>
      | RPCMessageHandlerFn<RemoteSchema["messages"], Message>,
  ): void {
    if (!transport.registerHandler)
      throw missingTransportMethodError(
        ["registerHandler"],
        "register message listeners",
      );
    if (message === "*") {
      wildcardMessageListeners.add(listener as any);
      return;
    }
    if (!messageListeners.has(message))
      messageListeners.set(message, new Set());
    messageListeners.get(message)?.add(listener as any);
  }

  /**
   * Removes a listener for a message (or all if "*" is used) from the
   * remote RPC endpoint.
   */
  function removeMessageListener(
    /**
     * The name of the message to remove the listener for. Use "*" to
     * remove a listener for all messages.
     */
    message: "*",
    /**
     * The listener function that will be removed.
     */
    listener: WildcardRPCMessageHandlerFn<RemoteSchema["messages"]>,
  ): void;
  /**
   * Removes a listener for a message (or all if "*" is used) from the
   * remote RPC endpoint.
   */
  function removeMessageListener<
    Message extends keyof RemoteSchema["messages"],
  >(
    /**
     * The name of the message to remove the listener for. Use "*" to
     * remove a listener for all messages.
     */
    message: Message,
    /**
     * The listener function that will be removed.
     */
    listener: RPCMessageHandlerFn<RemoteSchema["messages"], Message>,
  ): void;
  /**
   * Removes a listener for a message (or all if "*" is used) from the
   * remote RPC endpoint.
   */
  function removeMessageListener<
    Message extends keyof RemoteSchema["messages"],
  >(
    /**
     * The name of the message to remove the listener for. Use "*" to
     * remove a listener for all messages.
     */
    message: "*" | Message,
    /**
     * The listener function that will be removed.
     */
    listener:
      | WildcardRPCMessageHandlerFn<RemoteSchema["messages"]>
      | RPCMessageHandlerFn<RemoteSchema["messages"], Message>,
  ): void {
    if (message === "*") {
      wildcardMessageListeners.delete(listener as any);
      return;
    }
    messageListeners.get(message)?.delete(listener as any);
    if (messageListeners.get(message)?.size === 0)
      messageListeners.delete(message);
  }

  // message handling
  // ----------------

  async function handler(
    message:
      | RPCRequestFromSchema<Schema["requests"]>
      | RPCResponseFromSchema<RemoteSchema["requests"]>
      | RPCMessageFromSchema<RemoteSchema["messages"]>,
  ) {
    if (!("type" in message))
      throw new Error("Message does not contain a type.");
    if (message.type === "request") {
      if (!transport.send || !requestHandler)
        throw missingTransportMethodError(
          ["send", "requestHandler"],
          "handle requests",
        );
      const { id, method, params } = message;
      let response: RPCResponse;
      try {
        response = {
          type: "response",
          id,
          success: true,
          payload: await requestHandler(method, params),
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
      for (const listener of wildcardMessageListeners)
        listener(message.id, message.payload);
      const listeners = messageListeners.get(message.id);
      if (!listeners) return;
      for (const listener of listeners) listener(message.payload);
      return;
    }
    throw new Error(`Unexpected RPC message type: ${(message as any).type}`);
  }

  return {
    setTransport,
    setRequestHandler,
    request,
    requestProxy,
    send,
    addMessageListener,
    removeMessageListener,
  };
}

export type RPCInstance<
  Schema extends RPCSchema = RPCSchema,
  RemoteSchema extends RPCSchema = Schema,
> = ReturnType<typeof _createRPC<Schema, RemoteSchema>>;
