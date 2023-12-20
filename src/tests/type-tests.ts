import { createRPC } from "../create-rpc.js";
import { type RPCSchema } from "../types.js";

type NoMessagesSchema = RPCSchema<{
  requests: { method: void };
}>;

const rpc1 = createRPC<NoMessagesSchema>();
rpc1.setRequestHandler({});
// @ts-expect-error - Expected error.
rpc1.send("method");
rpc1.request("method");
rpc1.request.method();
rpc1.requestProxy.method();
// @ts-expect-error - Expected error.
rpc1.addMessageListener("method", console.log);

type NoRequestsSchema = RPCSchema<{
  messages: { method: void };
}>;

const rpc2 = createRPC<NoRequestsSchema>();
// @ts-expect-error - Expected error.
rpc2.setRequestHandler({});
rpc2.send("method");
// @ts-expect-error - Expected error.
rpc2.request.method();
// @ts-expect-error - Expected error.
rpc2.requestProxy.method();
rpc2.addMessageListener("method", console.log);

createRPC<NoMessagesSchema>({
  transport: {},
  maxRequestTime: 2000,
  requestHandler: {},
});

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
