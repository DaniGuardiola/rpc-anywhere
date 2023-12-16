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

export class RPC<
  Schema extends RPCSchema = RPCSchema,
  RemoteSchema extends RPCSchema = Schema,
> {
  // lazy setters
  // ------------

  #send?: (message: any) => void;
  setSend(send: (message: any) => void) {
    this.#send = send;
  }

  #requestHandler?: RPCRequestHandler<Schema["requests"]>;
  setRequestHandler(handler: RPCRequestHandler<Schema["requests"]>) {
    this.#requestHandler = handler;
  }
  getRequestHandler(errorMessageOnUnset: string) {
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

  setTransport({ send, registerHandler }: RPCTransport) {
    this.setSend(send);
    registerHandler(this.handle.bind(this));
  }

  // constructors
  // ------------

  #maxRequestTime: number;
  constructor({
    transport,
    send,
    requestHandler,
    maxRequestTime = DEFAULT_MAX_REQUEST_TIME,
  }: RPCOptions<Schema> = {}) {
    this.#lastRequestId = 0;

    const resolvedSend = transport?.send ?? send;
    if (resolvedSend) this.setSend(resolvedSend);
    transport?.registerHandler(this.handle.bind(this));
    if (requestHandler) this.setRequestHandler(requestHandler);
    this.#maxRequestTime = maxRequestTime;
  }

  static asClient<RemoteSchema extends RPCSchema = RPCSchema>(
    options: RPCOptions<EmptyRPCSchema>,
  ) {
    return new RPC<EmptyRPCSchema, RemoteSchema>(options);
  }

  static asServer<Schema extends RPCSchema = RPCSchema>(
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

  send<Message extends keyof Schema["messages"]>(
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
  addMessageListener(
    message: "*",
    listener: WildcardRPCMessageHandlerFn<RemoteSchema["messages"]>,
  ): void;
  addMessageListener<Message extends keyof RemoteSchema["messages"]>(
    message: Message,
    listener: RPCMessageHandlerFn<RemoteSchema["messages"], Message>,
  ): void;
  addMessageListener<Message extends keyof RemoteSchema["messages"]>(
    message: "*" | Message,
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

  removeMessageListener(
    message: "*",
    listener: WildcardRPCMessageHandlerFn<RemoteSchema["messages"]>,
  ): void;
  removeMessageListener<Message extends keyof RemoteSchema["messages"]>(
    message: Message,
    listener: RPCMessageHandlerFn<RemoteSchema["messages"], Message>,
  ): void;
  removeMessageListener<Message extends keyof RemoteSchema["messages"]>(
    message: "*" | Message,
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
          payload: await this.getRequestHandler(
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
