import { createRPCRequestHandler } from "../create-request-handler.js";
import { RPC } from "../rpc.js";
import { type RPCSchema } from "../types.js";

export const DEFAULT_MAX_TIME = 1000;
export const TIMEOUT_ACCEPTABLE_MARGIN = 100;

export async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

const requestHandler1 = createRPCRequestHandler({
  method1: ({ a }: { a: number }) => a,
});

export type Schema1 = RPCSchema<
  {
    messages: {
      message1: "first";
    };
  },
  typeof requestHandler1
>;

const requestHandler2 = createRPCRequestHandler({
  method2: ({ b }: { b: string }) => b,
  async timesOut() {
    // shorter than what IE6 takes to load a page (remember when these jokes were funny?)
    await delay(DEFAULT_MAX_TIME * 999);
  },
});

export type Schema2 = RPCSchema<
  {
    messages: {
      message2: "second";
      message3: "third";
      ignored: "forever-alone";
    };
  },
  typeof requestHandler2
>;

function createMockEndpoint() {
  return {
    listener: undefined as ((message: any) => void) | undefined,
    postMessage(message: any) {
      this.listener?.(message);
    },
    onMessage(listener: (message: any) => void) {
      this.listener = listener;
    },
  };
}

export function createTestRPCs() {
  const rpc1 = new RPC<Schema1, Schema2>({
    requestHandler: requestHandler1,
  });
  const rpc2 = new RPC<Schema2, Schema1>({
    requestHandler: requestHandler2,
  });
  const mockEndpoint1 = createMockEndpoint();
  const mockEndpoint2 = createMockEndpoint();
  rpc1.setTransport({
    send: mockEndpoint2.postMessage.bind(mockEndpoint2),
    registerHandler: mockEndpoint1.onMessage.bind(mockEndpoint1),
  });
  rpc2.setTransport({
    send: mockEndpoint1.postMessage.bind(mockEndpoint1),
    registerHandler: mockEndpoint2.onMessage.bind(mockEndpoint2),
  });
  return { rpc1, rpc2 };
}
