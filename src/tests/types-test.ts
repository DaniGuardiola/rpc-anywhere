import { createRPCRequestHandler } from "../create-request-handler.js";
import { createRPC } from "../create-rpc.js";
import { type EmptyRPCSchema, type RPCSchema } from "../types.js";

type ExampleSchema = RPCSchema<{
  requests: {
    method1: {
      params: { a: number; b: string };
      response: number;
    };
    method2: {
      params: { required: number; optional?: string };
      response: string;
    };
    method3: {
      params?: string;
    };
    method4: void;
  };
  messages: {
    message1: { a: number; b: string };
    message2: { required: number; optional?: string };
    message3?: { required: number; optional?: string };
    message4: void;
  };
}>;

const rpc = createRPC<ExampleSchema>();

// sending requests and messages
// -----------------------------

// - requests

rpc.request("method1", { a: 1, b: "2" });
rpc.request.method1({ a: 1, b: "2" });
// @ts-expect-error - Expected error.
rpc.request("undefinedMethod");
// @ts-expect-error - Expected error.
rpc.request.undefinedMethod();
// @ts-expect-error - Expected error.
rpc.request("undefinedMethod", { a: 1, b: "2" });
// @ts-expect-error - Expected error.
rpc.request.undefinedMethod({ a: 1, b: "2" });

// - messages

rpc.send("message1", { a: 1, b: "2" });
rpc.send.message1({ a: 1, b: "2" });
// @ts-expect-error - Expected error.
rpc.send("undefinedMessage");
// @ts-expect-error - Expected error.
rpc.send.undefinedMessage();
// @ts-expect-error - Expected error.
rpc.send("undefinedMessage", { a: 1, b: "2" });
// @ts-expect-error - Expected error.
rpc.send.undefinedMessage({ a: 1, b: "2" });

// handling requests
// -----------------

createRPC<ExampleSchema>({
  requestHandler: {
    method1: (params: { a: number; b: string }) => {
      params.a;
      params.b;
      return 1;
    },
    method2: (params: { required: number; optional?: string }) => {
      params.required;
      params.optional;
      return "hello";
    },
    method3: (params?: string) => {
      params;
    },
    method4: () => {},
  },
});
createRPC<ExampleSchema>({
  requestHandler: {
    method1: async (params: { a: number; b: string }) => {
      params.a;
      params.b;
      return 1;
    },
    method2: async (params: { required: number; optional?: string }) => {
      params.required;
      params.optional;
      return "hello";
    },
    method3: async (params?: string) => {
      params;
    },
    method4: async () => {},
  },
});
createRPC<ExampleSchema>({
  // @ts-expect-error - Expected error.
  unknownMethod: (params: { a: number; b: string }) => {
    params.a;
    params.b;
    return 1;
  },
});
createRPC<ExampleSchema>({
  requestHandler: {
    // @ts-expect-error - Expected error (wrong parameter type).
    method1: (params: { a: number; b: number }) => {
      params.a;
      params.b;
      return 1;
    },
    // @ts-expect-error - Expected error (extra property in parameter).
    method2: (params: { required: number; optional?: string; extra: any }) => {
      params.required;
      params.optional;
      return "hello";
    },
    // @ts-expect-error - Expected error (wrong required paramters).
    method3: (params: string) => {
      params;
    },
    // @ts-expect-error - Expected error (parameters in function with no parameters).
    method4: (params: { a: number; b: string }) => {
      params;
    },
  },
});
createRPC<ExampleSchema>({
  requestHandler: {
    // @ts-expect-error - Expected error (wrong return type).
    method1: (params: { a: number; b: string }) => {
      params.a;
      params.b;
      return "hello";
    },
    // @ts-expect-error - Expected error (missing return type).
    method2: (params: { required: number; optional?: string }) => {
      params.required;
      params.optional;
    },
  },
});
createRPC<ExampleSchema>({
  requestHandler: {
    // @ts-expect-error - Expected error (wrong optional return type).
    method1: (params: { a: number; b: string }) => {
      params.a;
      params.b;
      const condition: boolean = false;
      if (condition) return 1;
    },
  },
});

// handling messages
// -----------------

rpc.addMessageListener("message1", (params: { a: number; b: string }) => {
  params.a;
  params.b;
});
rpc.removeMessageListener("message1", (params: { a: number; b: string }) => {
  params.a;
  params.b;
});
rpc.addMessageListener(
  // @ts-expect-error - Expected error.
  "undefinedMessage",
  (params: { a: number; b: string }) => {
    params.a;
    params.b;
  },
);
rpc.removeMessageListener(
  // @ts-expect-error - Expected error.
  "undefinedMessage",
  (params: { a: number; b: string }) => {
    params.a;
    params.b;
  },
);
// @ts-expect-error - Expected error.
rpc.addMessageListener("message1", (params: { a: number; b: number }) => {
  params.a;
  params.b;
});
// @ts-expect-error - Expected error.
rpc.removeMessageListener("message1", (params: { a: number; b: number }) => {
  params.a;
  params.b;
});
// @ts-expect-error - Expected error.
rpc.addMessageListener(
  "message1",
  (params: { a: number; b: string; extra: any }) => {
    params.a;
    params.b;
  },
);
// @ts-expect-error - Expected error.
rpc.removeMessageListener(
  "message1",
  (params: { a: number; b: string; extra: any }) => {
    params.a;
    params.b;
  },
);

// request and message parameters and response
// -------------------------------------------

// - request parameters

rpc.request("method1", { a: 1, b: "2" });
rpc.request.method1({ a: 1, b: "2" });
// @ts-expect-error - Expected error.
rpc.request("method1", { a: 1 });
// @ts-expect-error - Expected error.
rpc.request.method1({ a: 1 });
// @ts-expect-error - Expected error.
rpc.request("method1", { a: 1, b: 2 });
// @ts-expect-error - Expected error.
rpc.request.method1({ a: 1, b: 2 });
// @ts-expect-error - Expected error.
rpc.request("method1", { a: 1, b: "2", c: 3 });
// @ts-expect-error - Expected error.
rpc.request.method1({ a: 1, b: "2", c: 3 });

rpc.request("method2", { required: 1 });
rpc.request.method2({ required: 1 });
rpc.request("method2", { required: 1, optional: "2" });
rpc.request.method2({ required: 1, optional: "2" });
// @ts-expect-error - Expected error.
rpc.request("method2", { required: 1, optional: 2 });
// @ts-expect-error - Expected error.
rpc.request.method2({ required: 1, optional: 2 });
// @ts-expect-error - Expected error.
rpc.request("method2", { required: 1, optional: "2", extra: 3 });
// @ts-expect-error - Expected error.
rpc.request.method2({ required: 1, optional: "2", extra: 3 });
// @ts-expect-error - Expected error.
rpc.request("method2", { optional: "2" });
// @ts-expect-error - Expected error.
rpc.request.method2({ optional: "2" });

rpc.request("method3");
rpc.request.method3();
rpc.request("method3", "hello");
rpc.request.method3("hello");
// @ts-expect-error - Expected error.
rpc.request("method3", 1);
// @ts-expect-error - Expected error.
rpc.request.method3(1);

rpc.request("method4");
rpc.request.method4();
// @ts-expect-error - Expected error.
rpc.request("method4", "hello");
// @ts-expect-error - Expected error.
rpc.request.method4("hello");

// - request return types

(await rpc.request("method1", { a: 1, b: "2" })) satisfies number;
(await rpc.request.method1({ a: 1, b: "2" })) satisfies number;
// @ts-expect-error - Expected error.
(await rpc.request("method1", { a: 1, b: "2" })) satisfies string;
// @ts-expect-error - Expected error.
(await rpc.request.method1({ a: 1, b: "2" })) satisfies string;

(await rpc.request("method2", { required: 1 })) satisfies string;
(await rpc.request.method2({ required: 1 })) satisfies string;
(await rpc.request("method2", { required: 1, optional: "2" })) satisfies string;
(await rpc.request.method2({ required: 1, optional: "2" })) satisfies string;
// @ts-expect-error - Expected error.
(await rpc.request("method2", { required: 1 })) satisfies number;
// @ts-expect-error - Expected error.
(await rpc.request.method2({ required: 1 })) satisfies number;
// @ts-expect-error - Expected error.
(await rpc.request("method2", { required: 1, optional: "2" })) satisfies number;
// @ts-expect-error - Expected error.
(await rpc.request.method2({ required: 1, optional: "2" })) satisfies number;

(await rpc.request("method3")) satisfies void;
(await rpc.request.method3()) satisfies void;
(await rpc.request("method3", "hello")) satisfies void;
(await rpc.request.method3("hello")) satisfies void;
// @ts-expect-error - Expected error.
(await rpc.request("method3")) satisfies number;
// @ts-expect-error - Expected error.
(await rpc.request.method3()) satisfies number;
// @ts-expect-error - Expected error.
(await rpc.request("method3", "hello")) satisfies number;
// @ts-expect-error - Expected error.
(await rpc.request.method3("hello")) satisfies number;

(await rpc.request("method4")) satisfies void;
(await rpc.request.method4()) satisfies void;
// @ts-expect-error - Expected error.
(await rpc.request("method4")) satisfies number;
// @ts-expect-error - Expected error.
(await rpc.request.method4()) satisfies number;

// - message parameters

rpc.send("message1", { a: 1, b: "2" });
rpc.send.message1({ a: 1, b: "2" });
// @ts-expect-error - Expected error.
rpc.send("message1", { a: 1 });
// @ts-expect-error - Expected error.
rpc.send.message1({ a: 1 });
// @ts-expect-error - Expected error.
rpc.send("message1", { a: 1, b: 2 });
// @ts-expect-error - Expected error.
rpc.send.message1({ a: 1, b: 2 });
// @ts-expect-error - Expected error.
rpc.send("message1", { a: 1, b: "2", c: 3 });
// @ts-expect-error - Expected error.
rpc.send.message1({ a: 1, b: "2", c: 3 });

rpc.send("message2", { required: 1 });
rpc.send.message2({ required: 1 });
rpc.send("message2", { required: 1, optional: "2" });
rpc.send.message2({ required: 1, optional: "2" });
// @ts-expect-error - Expected error.
rpc.send("message2", { required: 1, optional: 2 });
// @ts-expect-error - Expected error.
rpc.send.message2({ required: 1, optional: 2 });
// @ts-expect-error - Expected error.
rpc.send("message2", { required: 1, optional: "2", extra: 3 });
// @ts-expect-error - Expected error.
rpc.send.message2({ required: 1, optional: "2", extra: 3 });
// @ts-expect-error - Expected error.
rpc.send("message2", { optional: "2" });
// @ts-expect-error - Expected error.
rpc.send.message2({ optional: "2" });

rpc.send("message3");
rpc.send.message3();
rpc.send("message3", { required: 1 });
rpc.send.message3({ required: 1 });
rpc.send("message3", { required: 1, optional: "2" });
rpc.send.message3({ required: 1, optional: "2" });
// @ts-expect-error - Expected error.
rpc.send("message3", { required: 1, optional: 2 });
// @ts-expect-error - Expected error.
rpc.send.message3({ required: 1, optional: 2 });
// @ts-expect-error - Expected error.
rpc.send("message3", { required: 1, optional: "2", extra: 3 });
// @ts-expect-error - Expected error.
rpc.send.message3({ required: 1, optional: "2", extra: 3 });
// @ts-expect-error - Expected error.
rpc.send("message3", { optional: "2" });
// @ts-expect-error - Expected error.
rpc.send.message3({ optional: "2" });

rpc.send("message4");
rpc.send.message4();
// @ts-expect-error - Expected error.
rpc.send("message4", { a: 1, b: "2" });
// @ts-expect-error - Expected error.
rpc.send.message4({ a: 1, b: "2" });

// schema-dependent features and options
// -------------------------------------

type NoMessagesSchema = RPCSchema<{
  requests: { method: void };
}>;

const rpc1 = createRPC<NoMessagesSchema>();

// - messages
// @ts-expect-error - Expected error.
rpc1.send("message");
// @ts-expect-error - Expected error.
rpc1.send.message();
// @ts-expect-error - Expected error.
rpc1.addMessageListener("message", console.log);
// @ts-expect-error - Expected error.
rpc1.removeMessageListener("message", console.log);

// - requests
rpc1.setRequestHandler({});
rpc1.request("method");
rpc1.request.method();
rpc1.requestProxy.method();

// - proxy
// @ts-expect-error - Expected error.
rpc1.proxy.request.method();
// @ts-expect-error - Expected error.
rpc1.proxy.send.message();

// - options
createRPC<NoMessagesSchema>({
  transport: {},
  maxRequestTime: 2000,
  requestHandler: {},
});

// -----------

type NoRequestsSchema = RPCSchema<{
  messages: { message: void };
}>;

const rpc2 = createRPC<NoRequestsSchema>();

// - messages
rpc2.send("message");
rpc2.send.message();
rpc2.addMessageListener("message", console.log);
rpc2.removeMessageListener("message", console.log);

// - requests
// @ts-expect-error - Expected error.
rpc2.setRequestHandler({});
// @ts-expect-error - Expected error.
rpc2.request("method");
// @ts-expect-error - Expected error.
rpc2.request.method();
// @ts-expect-error - Expected error.
rpc2.requestProxy.method();

// - proxy
// @ts-expect-error - Expected error.
rpc2.proxy.request.method();
// @ts-expect-error - Expected error.
rpc2.proxy.send.message();

// - options
createRPC<NoRequestsSchema>({
  transport: {},
  // @ts-expect-error - Expected error.
  maxRequestTime: 2000,
});

createRPC<NoRequestsSchema>({
  transport: {},
  // @ts-expect-error - Expected error.
  requestHandler: {},
});

// -----------

type NoRequestsOrMessagesSchema = EmptyRPCSchema;

const rpc3 = createRPC<NoRequestsOrMessagesSchema>();

// - messages
// @ts-expect-error - Expected error.
rpc3.send("method");
// @ts-expect-error - Expected error.
rpc3.send.method();
// @ts-expect-error - Expected error.
rpc3.addMessageListener("method", console.log);
// @ts-expect-error - Expected error.
rpc3.removeMessageListener("method", console.log);

// - requests
// @ts-expect-error - Expected error.
rpc3.setRequestHandler({});
// @ts-expect-error - Expected error.
rpc3.request("method");
// @ts-expect-error - Expected error.
rpc3.request.method();
// @ts-expect-error - Expected error.
rpc3.requestProxy.method();

// - proxy
// @ts-expect-error - Expected error.
rpc3.proxy.request.method();
// @ts-expect-error - Expected error.
rpc3.proxy.send.message();

// - options
createRPC<NoRequestsOrMessagesSchema>({
  transport: {},
  // @ts-expect-error - Expected error.
  maxRequestTime: 2000,
});

createRPC<NoRequestsOrMessagesSchema>({
  transport: {},
  // @ts-expect-error - Expected error.
  requestHandler: {},
});

// -----------

type RequestsAndMessagesSchema = RPCSchema<{
  requests: { method: void };
  messages: { message: void };
}>;

const rpc4 = createRPC<RequestsAndMessagesSchema>();

// - messages
rpc4.send("message");
rpc4.send.message();
rpc4.addMessageListener("message", console.log);
rpc4.removeMessageListener("message", console.log);

// - requests
rpc4.setRequestHandler({});
rpc4.request("method");
rpc4.request.method();
rpc4.requestProxy.method();

// - proxy
rpc4.proxy.request.method();
rpc4.proxy.send.message();

// - options
createRPC<NoMessagesSchema>({
  transport: {},
  maxRequestTime: 2000,
  requestHandler: {},
});

// createRPCRequestHandler and schema inference
// --------------------------------------------

const requestHandler = createRPCRequestHandler({
  method1: (params: { a: number; b: string }) => {
    params.a;
    params.b;
    return 1;
  },
  method2: (params: { required: number; optional?: string }) => {
    params.required;
    params.optional;
    return "hello";
  },
  method3: (params?: string) => {
    params;
  },
  method4: () => {},
});

type InferredSchema = RPCSchema<void, typeof requestHandler>;

const rpc5 = createRPC<InferredSchema>();

rpc5.request("method1", { a: 1, b: "2" });
rpc5.request.method1({ a: 1, b: "2" });
rpc5.request("method2", { required: 1 });
rpc5.request.method2({ required: 1 });
rpc5.request("method3");
rpc5.request.method3();
rpc5.request("method3", "hello");
rpc5.request.method3("hello");
rpc5.request("method4");
rpc5.request.method4();
// @ts-expect-error - Expected error.
rpc5.request("method1", { a: 1 });
// @ts-expect-error - Expected error.
rpc5.request.method1({ a: 1 });
// @ts-expect-error - Expected error.
rpc5.request("method1", { a: 1, b: 2 });
// @ts-expect-error - Expected error.
rpc5.request.method1({ a: 1, b: 2 });
// @ts-expect-error - Expected error.
rpc5.request("method1", { a: 1, b: "2", c: 3 });
// @ts-expect-error - Expected error.
rpc5.request.method1({ a: 1, b: "2", c: 3 });
// @ts-expect-error - Expected error.
rpc5.request("method2", { required: 1, optional: 2 });
// @ts-expect-error - Expected error.
rpc5.request.method2({ required: 1, optional: 2 });
// @ts-expect-error - Expected error.
rpc5.request("method2", { required: 1, optional: "2", extra: 3 });
// @ts-expect-error - Expected error.
rpc5.request.method2({ required: 1, optional: "2", extra: 3 });
// @ts-expect-error - Expected error.
rpc5.request("method3", 1);
// @ts-expect-error - Expected error.
rpc5.request.method3(1);
// @ts-expect-error - Expected error.
rpc5.request("method4", "hello");
// @ts-expect-error - Expected error.
rpc5.request.method4("hello");

(await rpc5.request("method1", { a: 1, b: "2" })) satisfies number;
(await rpc5.request.method1({ a: 1, b: "2" })) satisfies number;
(await rpc5.request("method2", { required: 1 })) satisfies string;
(await rpc5.request.method2({ required: 1 })) satisfies string;
(await rpc5.request("method3")) satisfies void;
(await rpc5.request.method3()) satisfies void;
(await rpc5.request("method3", "hello")) satisfies void;
(await rpc5.request.method3("hello")) satisfies void;
(await rpc5.request("method4")) satisfies void;
(await rpc5.request.method4()) satisfies void;
// @ts-expect-error - Expected error.
(await rpc5.request("method1", { a: 1, b: "2" })) satisfies string;
// @ts-expect-error - Expected error.
(await rpc5.request.method1({ a: 1, b: "2" })) satisfies string;
// @ts-expect-error - Expected error.
(await rpc5.request("method2", { required: 1 })) satisfies number;
// @ts-expect-error - Expected error.
(await rpc5.request.method2({ required: 1 })) satisfies number;
// @ts-expect-error - Expected error.
(await rpc5.request("method3")) satisfies number;
// @ts-expect-error - Expected error.
(await rpc5.request.method3()) satisfies number;
// @ts-expect-error - Expected error.
(await rpc5.request("method3", "hello")) satisfies number;
// @ts-expect-error - Expected error.
(await rpc5.request.method3("hello")) satisfies number;
// @ts-expect-error - Expected error.
(await rpc5.request("method4")) satisfies number;
// @ts-expect-error - Expected error.
(await rpc5.request.method4()) satisfies number;
