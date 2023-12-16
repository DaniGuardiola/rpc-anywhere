import {
  type EmptyRPCSchema,
  type RPCMessage,
  type RPCMessageFromSchema,
  type RPCMessageHandlerFn,
  type RPCMessagePayload,
  type RPCOptions,
  type RPCRequest,
  type RPCRequestFromSchema,
  type RPCRequestHandler,
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

/**
 * Creates an RPC instance that can send and receive requests, responses
 * and messages.
 */
export class RPC<
  Schema extends RPCSchema = RPCSchema,
  RemoteSchema extends RPCSchema = Schema,
> {
  // lazy setters
  // ------------

  #send?: (message: any) => void;

  /**
   * Sets the function that will be used to send requests, responses and
   * messages to the remote RPC instance.
   */
  setSend(
    /**
     * The function that will be set as the "send" function.
     */
    send: (message: any) => void,
  ) {
    this.#send = send;
  }

  #requestHandler?: RPCRequestHandler<Schema["requests"]>;

  /**
   * Sets the function that will be used to handle requests from the
   * remote RPC instance.
   */
  setRequestHandler(
    /**
     * The function that will be set as the "request handler" function.
     */
    handler: RPCRequestHandler<Schema["requests"]>,
  ) {
    this.#requestHandler = handler;
  }
  #getRequestHandler(errorMessageOnUnset: string) {
    if (typeof this.#requestHandler === "function") return this.#requestHandler;
    return (method: any, params: any) => {
      if (typeof this.#requestHandler === "function")
        throw new Error("Unexpected function");
      if (!this.#requestHandler) throw new Error(errorMessageOnUnset);
      // @ts-expect-error Type safety not very important here.
      const handler = this.#requestHandler[method] ?? this.#requestHandler._;
      if (typeof handler !== "function")
        throw new Error(`Unknown method: ${method}`);
      return handler(params);
    };
  }

  /**
   * Sets the transport that will be used to send and receive requests,
   * responses and messages.
   */
  setTransport({ send, registerHandler }: RPCTransport) {
    this.setSend(send);
    registerHandler(this.handle.bind(this));
  }

  // constructors
  // ------------

  #maxRequestTime: number;
  constructor(
    /**
     * The options that will be used to configure the RPC instance.
     */
    {
      transport,
      send,
      requestHandler,
      maxRequestTime = DEFAULT_MAX_REQUEST_TIME,
    }: RPCOptions<Schema> = {},
  ) {
    this.#lastRequestId = 0;

    const resolvedSend = transport?.send ?? send;
    if (resolvedSend) this.setSend(resolvedSend);
    transport?.registerHandler(this.handle.bind(this));
    if (requestHandler) this.setRequestHandler(requestHandler);
    this.#maxRequestTime = maxRequestTime;
  }

  /**
   * Creates an RPC instance as a client. The passed schema represents
   * the remote RPC's (server) schema.
   */
  static asClient<RemoteSchema extends RPCSchema = RPCSchema>(
    /**
     * The options that will be used to configure the RPC instance.
     */
    options: RPCOptions<EmptyRPCSchema>,
  ) {
    return new RPC<EmptyRPCSchema, RemoteSchema>(options);
  }

  /**
   * Creates an RPC instance as a server. The passed schema represents
   * this RPC's (server) schema.
   */
  static asServer<Schema extends RPCSchema = RPCSchema>(
    /**
     * The options that will be used to configure the RPC instance.
     */
    options: RPCOptions<Schema>,
  ) {
    return new RPC<Schema, EmptyRPCSchema>(options);
  }

  // requests
  // --------

  #lastRequestId = 0;
  #getRequestId() {
    if (this.#lastRequestId <= MAX_ID) return ++this.#lastRequestId;
    return (this.#lastRequestId = 0);
  }
  #requestListeners = new Map<
    number,
    { resolve: (result: unknown) => void; reject: (error: Error) => void }
  >();
  #requestTimeouts = new Map<number, ReturnType<typeof setTimeout>>();

  /**
   * Sends a request to the remote RPC endpoint and returns a promise
   * with the response.
   */
  request<Method extends keyof RemoteSchema["requests"]>(
    method: Method,
    ...args: "params" extends keyof RemoteSchema["requests"][Method]
      ? undefined extends RemoteSchema["requests"][Method]["params"]
        ? [params?: RemoteSchema["requests"][Method]["params"]]
        : [params: RemoteSchema["requests"][Method]["params"]]
      : []
  ): Promise<RPCRequestResponse<RemoteSchema["requests"], Method>> {
    const params = args[0];
    return new Promise((resolve, reject) => {
      if (!this.#send)
        throw new Error(
          'This RPC instance cannot send requests because the "send" function is not set. Pass it to the constructor or use "setSend" to enable sending requests.',
        );
      const requestId = this.#getRequestId();
      const request: RPCRequest = {
        type: "request",
        id: requestId,
        method,
        params,
      };
      this.#requestListeners.set(requestId, { resolve, reject });
      if (this.#maxRequestTime !== Infinity)
        this.#requestTimeouts.set(
          requestId,
          setTimeout(() => {
            this.#requestTimeouts.delete(requestId);
            reject(new Error("RPC request timed out."));
          }, this.#maxRequestTime),
        );
      this.#send(request);
    }) as Promise<any>;
  }

  /**
   * A proxy that allows calling requests as if they were functions.
   */
  requestProxy = new Proxy(
    {},
    {
      get: (_, prop) => {
        // @ts-expect-error Not very important.
        return (params: unknown) => this.request(prop, params);
      },
    },
  ) as RPCRequestsProxy<RemoteSchema["requests"]>;

  // messages
  // --------

  /**
   * Sends a message to the remote RPC endpoint.
   */
  send<Message extends keyof Schema["messages"]>(
    /**
     * The name of the message to send.
     */
    message: Message,
    ...args: void extends RPCMessagePayload<Schema["messages"], Message>
      ? []
      : [payload: RPCMessagePayload<Schema["messages"], Message>]
  ) {
    const payload = args[0];
    if (!this.#send)
      throw new Error(
        'This RPC instance cannot send messages because the "send" function is not set. Pass it to the constructor or use "setSend" to enable sending messages.',
      );
    const rpcMessage: RPCMessage = {
      type: "message",
      id: message as string,
      payload,
    };
    this.#send(rpcMessage);
  }

  #messageListeners = new Map<any, Set<(payload: any) => void>>();
  #wildcardMessageListeners = new Set<
    (messageName: any, payload: any) => void
  >();

  /**
   * Adds a listener for a message (or all if "*" is used) from the
   * remote RPC endpoint.
   */
  addMessageListener(
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
  addMessageListener<Message extends keyof RemoteSchema["messages"]>(
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
  addMessageListener<Message extends keyof RemoteSchema["messages"]>(
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
    if (message === "*") {
      this.#wildcardMessageListeners.add(listener as any);
      return;
    }
    if (!this.#messageListeners.has(message))
      this.#messageListeners.set(message, new Set());
    this.#messageListeners.get(message)?.add(listener as any);
  }

  /**
   * Removes a listener for a message (or all if "*" is used) from the
   * remote RPC endpoint.
   */
  removeMessageListener(
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
  removeMessageListener<Message extends keyof RemoteSchema["messages"]>(
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
  removeMessageListener<Message extends keyof RemoteSchema["messages"]>(
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
      this.#wildcardMessageListeners.delete(listener as any);
      return;
    }
    this.#messageListeners.get(message)?.delete(listener as any);
    if (this.#messageListeners.get(message)?.size === 0)
      this.#messageListeners.delete(message);
  }

  // message handling
  // ----------------

  /**
   * Handles a request, response or message from the remote RPC endpoint.
   */
  async handle(
    message:
      | RPCRequestFromSchema<Schema["requests"]>
      | RPCResponseFromSchema<RemoteSchema["requests"]>
      | RPCMessageFromSchema<RemoteSchema["messages"]>,
  ) {
    if (!("type" in message))
      throw new Error("Message does not contain a type.");
    if (message.type === "request") {
      if (!this.#send)
        throw new Error(
          'This RPC instance cannot handle requests because the "send" function is not set. Pass it to the constructor or use "setSend" to enable handling requests.',
        );
      const { id, method, params } = message;
      let response: RPCResponse;
      try {
        response = {
          type: "response",
          id,
          success: true,
          payload: await this.#getRequestHandler(
            'This RPC instance cannot send requests because the "requestHandler" function is not set. Pass it to the constructor or use "setSend" to enable handling requests.',
          )(method, params),
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
      this.#send(response);
      return;
    }
    if (message.type === "response") {
      const timeout = this.#requestTimeouts.get(message.id);
      if (timeout != null) clearTimeout(timeout);
      const { resolve, reject } = this.#requestListeners.get(message.id) ?? {};
      if (!message.success) reject?.(new Error(message.error));
      else resolve?.(message.payload);
      return;
    }
    if (message.type === "message") {
      for (const listener of this.#wildcardMessageListeners)
        listener(message.id, message.payload);
      const listeners = this.#messageListeners.get(message.id);
      if (!listeners) return;
      for (const listener of listeners) listener(message.payload);
      return;
    }
    throw new Error(`Unexpected RPC message type: ${(message as any).type}`);
  }
}
