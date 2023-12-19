import { createRPC } from "../create-rpc.js";
import { type RPCSchema } from "../types.js";

type NoMessagesSchema = RPCSchema<{
  requests: {
    a: void;
  };
}>;

const rpc1 = createRPC<NoMessagesSchema>();
rpc1.setRequestHandler({});
// @ts-expect-error - Expected error.
rpc1.send("a");
rpc1.request("a");
// @ts-expect-error - Expected error.
rpc1.addMessageListener("a", console.log);

type NoRequestsSchema = RPCSchema<{
  messages: {
    a: void;
  };
}>;

const rpc2 = createRPC<NoRequestsSchema>();
// @ts-expect-error - Expected error.
rpc2.setRequestHandler({});
rpc2.send("a");
// @ts-expect-error - Expected error.
rpc2.request("a");
rpc2.addMessageListener("a", console.log);
