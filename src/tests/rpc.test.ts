import { expect, test } from "bun:test";

import {
  type RPCMessageHandlerFn,
  type WildcardRPCMessageHandlerFn,
} from "../types.js";
import {
  createTestRPCs,
  DEFAULT_MAX_TIME,
  delay,
  type Schema2,
  TIMEOUT_ACCEPTABLE_MARGIN,
} from "./utils.js";

test("request() returns the right values", async () => {
  const { rpc1, rpc2 } = createTestRPCs();
  const response1 = await rpc1.request("method2", { b: "hello" });
  expect(response1).toBe("hello");
  const response2 = await rpc2.request("method1", { a: 1234 });
  expect(response2).toBe(1234);
});

test("request as proxy returns the right values", async () => {
  const { rpc1, rpc2 } = createTestRPCs();
  const response1 = await rpc1.request.method2({ b: "hello" });
  expect(response1).toBe("hello");
  const response2 = await rpc2.request.method1({ a: 1234 });
  expect(response2).toBe(1234);
});

test("requestProxy returns the right values", async () => {
  const { rpc1, rpc2 } = createTestRPCs();
  const response1 = await rpc1.requestProxy.method2({ b: "hello" });
  expect(response1).toBe("hello");
  const response2 = await rpc2.requestProxy.method1({ a: 1234 });
  expect(response2).toBe(1234);
});

test("request() times out for methods that take too long", async () => {
  const { rpc1 } = createTestRPCs();
  const initialTime = Date.now();
  let errorMessage = "<no error>";
  try {
    await rpc1.request("timesOut");
  } catch (error) {
    if (!(error instanceof Error)) return expect().fail("unknown error type");
    errorMessage = error.message;
  }
  const totalTime = Date.now() - initialTime;
  expect(errorMessage).toContain("timed out");
  expect(totalTime).toBeGreaterThanOrEqual(
    DEFAULT_MAX_TIME - TIMEOUT_ACCEPTABLE_MARGIN,
  );
  expect(totalTime).toBeLessThanOrEqual(
    DEFAULT_MAX_TIME + TIMEOUT_ACCEPTABLE_MARGIN,
  );
});

test("requestProxy times out for methods that take too long", async () => {
  const { rpc1 } = createTestRPCs();
  const initialTime = Date.now();
  let errorMessage = "<no error>";
  try {
    await rpc1.requestProxy.timesOut();
  } catch (error) {
    if (!(error instanceof Error)) return expect().fail("unknown error type");
    errorMessage = error.message;
  }
  const totalTime = Date.now() - initialTime;
  expect(errorMessage).toContain("timed out");
  expect(totalTime).toBeGreaterThanOrEqual(
    DEFAULT_MAX_TIME - TIMEOUT_ACCEPTABLE_MARGIN,
  );
  expect(totalTime).toBeLessThanOrEqual(
    DEFAULT_MAX_TIME + TIMEOUT_ACCEPTABLE_MARGIN,
  );
});

test("messages are sent and received correctly", async () => {
  const { rpc1, rpc2 } = createTestRPCs();
  let received1 = 0;
  let received2 = 0;
  const listener: RPCMessageHandlerFn<Schema2["messages"], "message2"> = (
    payload,
  ) => {
    expect(payload).toBe("second");
    received2++;
  };
  rpc1.addMessageListener("message2", listener);
  rpc2.addMessageListener("message1", (payload) => {
    expect(payload).toBe("first");
    received1++;
  });

  rpc1.send("message1", "first");
  rpc2.send("message2", "second");
  rpc2.send("ignored", "forever-alone");
  await delay(100);
  expect(received1).toBe(1);
  expect(received2).toBe(1);

  rpc1.removeMessageListener("message2", listener);
  rpc1.send("message1", "first");
  rpc2.send("message2", "second");
  rpc2.send("ignored", "forever-alone");
  await delay(100);
  expect(received1).toBe(2);
  expect(received2).toBe(1);

  rpc1.addMessageListener("message2", listener);
  rpc1.send("message1", "first");
  rpc2.send("message2", "second");
  rpc2.send("ignored", "forever-alone");
  await delay(100);
  expect(received1).toBe(3);
  expect(received2).toBe(2);
});

test("send as proxy sends messages correctly", async () => {
  const { rpc1, rpc2 } = createTestRPCs();
  let received1 = 0;
  let received2 = 0;
  const listener: RPCMessageHandlerFn<Schema2["messages"], "message2"> = (
    payload,
  ) => {
    expect(payload).toBe("second");
    received2++;
  };
  rpc1.addMessageListener("message2", listener);
  rpc2.addMessageListener("message1", (payload) => {
    expect(payload).toBe("first");
    received1++;
  });

  rpc1.send.message1("first");
  rpc2.send.message2("second");
  rpc2.send.ignored("forever-alone");
  await delay(100);
  expect(received1).toBe(1);
  expect(received2).toBe(1);

  rpc1.removeMessageListener("message2", listener);
  rpc1.send.message1("first");
  rpc2.send.message2("second");
  rpc2.send.ignored("forever-alone");
  await delay(100);
  expect(received1).toBe(2);
  expect(received2).toBe(1);

  rpc1.addMessageListener("message2", listener);
  rpc1.send.message1("first");
  rpc2.send.message2("second");
  rpc2.send.ignored("forever-alone");
  await delay(100);
  expect(received1).toBe(3);
  expect(received2).toBe(2);
});

test("sendProxy sends messages correctly", async () => {
  const { rpc1, rpc2 } = createTestRPCs();
  let received1 = 0;
  let received2 = 0;
  const listener: RPCMessageHandlerFn<Schema2["messages"], "message2"> = (
    payload,
  ) => {
    expect(payload).toBe("second");
    received2++;
  };
  rpc1.addMessageListener("message2", listener);
  rpc2.addMessageListener("message1", (payload) => {
    expect(payload).toBe("first");
    received1++;
  });

  rpc1.sendProxy.message1("first");
  rpc2.sendProxy.message2("second");
  rpc2.sendProxy.ignored("forever-alone");
  await delay(100);
  expect(received1).toBe(1);
  expect(received2).toBe(1);

  rpc1.removeMessageListener("message2", listener);
  rpc1.sendProxy.message1("first");
  rpc2.sendProxy.message2("second");
  rpc2.sendProxy.ignored("forever-alone");
  await delay(100);
  expect(received1).toBe(2);
  expect(received2).toBe(1);

  rpc1.addMessageListener("message2", listener);
  rpc1.sendProxy.message1("first");
  rpc2.sendProxy.message2("second");
  rpc2.sendProxy.ignored("forever-alone");
  await delay(100);
  expect(received1).toBe(3);
  expect(received2).toBe(2);
});

test("wildcard message handler works", async () => {
  const { rpc1, rpc2 } = createTestRPCs();
  let receivedCount = 0;
  let lastNameReceived = "<no name>";
  let lastPayloadReceived = "<no payload>";
  const listener: WildcardRPCMessageHandlerFn<Schema2["messages"]> = (
    messageName,
    payload,
  ) => {
    receivedCount++;
    lastNameReceived = messageName;
    lastPayloadReceived = payload;
  };

  rpc1.addMessageListener("*", listener);
  rpc2.send("message2", "second");
  await delay(100);
  expect(receivedCount).toBe(1);
  expect(lastNameReceived).toBe("message2");
  expect(lastPayloadReceived).toBe("second");

  rpc1.removeMessageListener("*", listener);
  rpc2.send("message3", "third");
  await delay(100);
  expect(receivedCount).toBe(1);
  expect(lastNameReceived).toBe("message2");
  expect(lastPayloadReceived).toBe("second");

  rpc1.addMessageListener("*", listener);
  rpc2.send("message3", "third");
  await delay(100);
  expect(receivedCount).toBe(2);
  expect(lastNameReceived).toBe("message3");
  expect(lastPayloadReceived).toBe("third");
});

test("proxy object works for requests and messages", async () => {
  const { rpc1, rpc2 } = createTestRPCs();

  const response1 = await rpc1.proxy.request.method2({ b: "hello" });
  expect(response1).toBe("hello");
  const response2 = await rpc2.proxy.request.method1({ a: 1234 });
  expect(response2).toBe(1234);

  let received1 = 0;
  let received2 = 0;
  const listener: RPCMessageHandlerFn<Schema2["messages"], "message2"> = (
    payload,
  ) => {
    expect(payload).toBe("second");
    received2++;
  };
  rpc1.addMessageListener("message2", listener);
  rpc2.addMessageListener("message1", (payload) => {
    expect(payload).toBe("first");
    received1++;
  });

  rpc1.proxy.send.message1("first");
  rpc2.proxy.send.message2("second");
  rpc2.proxy.send.ignored("forever-alone");
  await delay(100);
  expect(received1).toBe(1);
  expect(received2).toBe(1);

  rpc1.removeMessageListener("message2", listener);
  rpc1.proxy.send.message1("first");
  rpc2.proxy.send.message2("second");
  rpc2.proxy.send.ignored("forever-alone");
  await delay(100);
  expect(received1).toBe(2);
  expect(received2).toBe(1);

  rpc1.addMessageListener("message2", listener);
  rpc1.proxy.send.message1("first");
  rpc2.proxy.send.message2("second");
  rpc2.proxy.send.ignored("forever-alone");
  await delay(100);
  expect(received1).toBe(3);
  expect(received2).toBe(2);
});

// TODO: find a way to run these tests with all actual transports too.
