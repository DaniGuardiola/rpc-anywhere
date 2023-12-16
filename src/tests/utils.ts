import { createRPCRequestHandler } from "../create-request-handler.js";
import { RPC } from "../rpc.js";
import { type RPCRequestSchemaFromHandler, type RPCSchema } from "../types.js";

export const DEFAULT_MAX_TIME = 1000;
export const TIMEOUT_ACCEPTABLE_MARGIN = 100;

export async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

const requestHandler1 = createRPCRequestHandler({
  method1: ({ a }: { a: number }) => a,
});

export type Schema1 = RPCSchema<{
  requests: RPCRequestSchemaFromHandler<typeof requestHandler1>;
  messages: {
    message1: "first";
  };
}>;

const requestHandler2 = createRPCRequestHandler({
  method2: ({ b }: { b: string }) => b,
  timesOut: () =>
    // shorter than what IE6 takes to load a page (remember when these jokes were funny?)
    delay(DEFAULT_MAX_TIME * 999),
});

export type Schema2 = RPCSchema<{
  requests: RPCRequestSchemaFromHandler<typeof requestHandler2>;
  messages: {
    message2: "second";
    message3: "third";
    ignored: "forever-alone";
  };
}>;

export function createTestRPCs() {
  const rpc1 = new RPC<Schema1, Schema2>({
    requestHandler: requestHandler1,
  });
  const rpc2 = new RPC<Schema2, Schema1>({
    requestHandler: requestHandler2,
  });
  rpc1.setSend(rpc2.handle.bind(rpc2));
  rpc2.setSend(rpc1.handle.bind(rpc1));
  return { rpc1, rpc2 };
}
