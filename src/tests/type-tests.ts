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
  };
  messages: {
    message1: { a: number; b: string };
    message2: { required: number; optional?: string };
    message3: void;
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

// TODO: add tests for messages.

// handling requests
// -----------------

// TODO: add tests for request handlers.

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

// - message parameters

// TODO: add tests for message parameters.

// schema-dependent features and options
// -------------------------------------

type NoMessagesSchema = RPCSchema<{
  requests: { method: void };
}>;

const rpc1 = createRPC<NoMessagesSchema>();

// - messages
// @ts-expect-error - Expected error.
rpc1.send("method");
// @ts-expect-error - Expected error.
rpc1.addMessageListener("method", console.log);
// @ts-expect-error - Expected error.
rpc1.removeMessageListener("method", console.log);

// - requests
rpc1.setRequestHandler({});
rpc1.request("method");
rpc1.request.method();
rpc1.requestProxy.method();

// - options
createRPC<NoMessagesSchema>({
  transport: {},
  maxRequestTime: 2000,
  requestHandler: {},
});

// -----------

type NoRequestsSchema = RPCSchema<{
  messages: { method: void };
}>;

const rpc2 = createRPC<NoRequestsSchema>();

// - messages
rpc2.send("method");
rpc2.addMessageListener("method", console.log);
rpc2.removeMessageListener("method", console.log);

// - requests
// @ts-expect-error - Expected error.
rpc2.setRequestHandler({});
// @ts-expect-error - Expected error.
rpc2.request("method");
// @ts-expect-error - Expected error.
rpc2.request.method();
// @ts-expect-error - Expected error.
rpc2.requestProxy.method();

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
