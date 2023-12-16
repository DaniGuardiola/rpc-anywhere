// data
// ----

export type RPCRequest<Method = any, Params = any> = {
  type: "request";
  id: number;
  method: Method;
  params: Params;
};

export type RPCResponse<Payload = any> =
  | {
      type: "response";
      id: number;
      success: true;
      payload: Payload;
    }
  | {
      type: "response";
      id: number;
      success: false;
      error?: string;
    };

export type RPCMessage<Payload = any> = {
  type: "message";
  id: string;
  payload: Payload;
};

// requests
// --------

type BaseRPCRequestsSchema = Record<
  never,
  { params?: unknown; response?: unknown }
>;
export type RPCRequestsSchema<
  RequestsSchema extends BaseRPCRequestsSchema = BaseRPCRequestsSchema,
> = RequestsSchema;

export type RPCRequestParams<
  RequestsSchema extends RPCRequestsSchema,
  Method extends keyof RequestsSchema = keyof RequestsSchema,
> = "params" extends keyof RequestsSchema[Method]
  ? RequestsSchema[Method]["params"]
  : never;
export type RPCRequestResponse<
  RequestsSchema extends RPCRequestsSchema,
  Method extends keyof RequestsSchema = keyof RequestsSchema,
> = "response" extends keyof RequestsSchema[Method]
  ? RequestsSchema[Method]["response"]
  : never;

export type RPCRequestFromSchema<
  RequestsSchema extends RPCRequestsSchema,
  Method extends keyof RequestsSchema = keyof RequestsSchema,
> = RPCRequest<Method, RPCRequestParams<RequestsSchema, Method>>;
export type RPCResponseFromSchema<
  RequestsSchema extends RPCRequestsSchema,
  Method extends keyof RequestsSchema = keyof RequestsSchema,
> = RPCResponse<RPCRequestResponse<RequestsSchema, Method>>;

export type RPCRequestHandlerFn<
  RequestsSchema extends RPCRequestsSchema = RPCRequestsSchema,
> = <Method extends keyof RequestsSchema>(
  method: Method,
  params: RPCRequestParams<RequestsSchema, Method>,
) => Promise<any>;
export type RPCRequestHandlerObject<
  RequestsSchema extends RPCRequestsSchema = RPCRequestsSchema,
> = {
  [Method in keyof RequestsSchema]?: (
    params: RPCRequestParams<RequestsSchema, Method>,
  ) =>
    | RPCRequestResponse<RequestsSchema, Method>
    | Promise<RPCRequestResponse<RequestsSchema, Method>>;
} & {
  _?: (
    method: keyof RequestsSchema,
    params: RPCRequestParams<RequestsSchema>,
  ) => any;
  // | RPCRequestResponse<RequestsSchema>
  // | Promise<RPCRequestResponse<RequestsSchema>>;
};
export type RPCRequestHandler<
  RequestsSchema extends RPCRequestsSchema = RPCRequestsSchema,
> =
  | RPCRequestHandlerFn<RequestsSchema>
  | RPCRequestHandlerObject<RequestsSchema>;

type ParamsFromFunction<T extends (...args: any) => any> =
  Parameters<T> extends []
    ? unknown
    : undefined extends Parameters<T>[0]
    ? { params?: Parameters<T>[0] }
    : { params: Parameters<T>[0] };
type ReturnFromFunction<T extends (...args: any) => any> =
  void extends ReturnType<T> ? unknown : { response: ReturnType<T> };
type Flatten<T> = { [K in keyof T]: T[K] };
type VoidIfEmpty<T> = T extends NonNullable<unknown> ? Flatten<T> : void;
type RequestDefinitionFromFunction<T extends (...args: any) => any> =
  VoidIfEmpty<ParamsFromFunction<T> & ReturnFromFunction<T>>;
export type RPCRequestSchemaFromHandler<
  Handler extends RPCRequestHandlerObject,
> = {
  -readonly [Method in keyof Omit<Handler, "_"> as Handler[Method] extends (
    ...args: any
  ) => any
    ? // is function
      Method
    : // is not function
      never]: Handler[Method] extends (...args: any) => any
    ? // is function
      RequestDefinitionFromFunction<Handler[Method]>
    : // is not function
      never;
};

export type RPCRequestsProxy<RequestsSchema extends RPCRequestsSchema> = {
  [K in keyof RequestsSchema]: (
    ...args: "params" extends keyof RequestsSchema[K]
      ? undefined extends RequestsSchema[K]["params"]
        ? [params?: RequestsSchema[K]["params"]]
        : [params: RequestsSchema[K]["params"]]
      : []
  ) => Promise<RPCRequestResponse<RequestsSchema, K>>;
};

// messages
// --------

type BaseRPCMessagesSchema = Record<never, unknown>;
export type RPCMessagesSchema<
  MessagesSchema extends BaseRPCMessagesSchema = BaseRPCMessagesSchema,
> = MessagesSchema;

export type RPCMessagePayload<
  MessagesSchema extends RPCMessagesSchema,
  MessageId extends keyof MessagesSchema = keyof MessagesSchema,
> = MessagesSchema[MessageId];

export type RPCMessageFromSchema<
  MessagesSchema extends RPCMessagesSchema,
  MessageId extends keyof MessagesSchema = keyof MessagesSchema,
> = RPCMessage<RPCMessagePayload<MessagesSchema, MessageId>>;

export type RPCMessageHandlerFn<
  MessagesSchema extends RPCMessagesSchema,
  Message extends keyof MessagesSchema,
> = (payload: RPCMessagePayload<MessagesSchema, Message>) => void;
export type WildcardRPCMessageHandlerFn<
  MessagesSchema extends RPCMessagesSchema,
> = (
  messageName: keyof MessagesSchema,
  payload: RPCMessagePayload<MessagesSchema>,
) => void;

// schema
// ------

type InputRPCSchema = {
  requests?: RPCRequestsSchema;
  messages?: RPCMessagesSchema;
};
type ResolvedRPCSchema<InputSchema extends InputRPCSchema> = {
  requests: undefined extends InputSchema["requests"]
    ? BaseRPCRequestsSchema
    : NonNullable<InputSchema["requests"]>;
  messages: undefined extends InputSchema["messages"]
    ? BaseRPCMessagesSchema
    : NonNullable<InputSchema["messages"]>;
};
export type RPCSchema<InputSchema extends InputRPCSchema = InputRPCSchema> =
  ResolvedRPCSchema<InputSchema>;

export type EmptyRPCSchema = RPCSchema;

// transports
// ----------

export type RPCTransport = {
  send: (message: unknown) => void;
  registerHandler: (handler: (message: any) => void) => void;
};

// options
// -------

export type RPCOptions<Schema extends RPCSchema> = {
  /**
   * A transport object that will be used to send and receive
   * messages. Setting the `send` function manually will override
   * the transport's `send` function.
   */
  transport?: RPCTransport;

  /**
   * The function that will be used to send messages.
   */
  send?: (message: unknown) => void;

  /**
   * The function that will be used to handle requests.
   */
  requestHandler?: RPCRequestHandler<Schema["requests"]>;

  /**
   * The maximum time to wait for a response to a request, in
   * milliseconds. If exceeded, the promise will be rejected.
   * @default 1000
   */
  maxRequestTime?: number;
};
