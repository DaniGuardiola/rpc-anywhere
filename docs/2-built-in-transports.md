<div align="left">

[**Previous: RPC**](./1-rpc.md)

</div>
<div align="right">

[**Next: Bridging transports**](./3-bridging-transports.md)

</div>

<h1>Built-in transports</h1>

RPC Anywhere ships with a few built-in ways to create transports for common use cases.

For example, a transport for browser extensions (content script ↔ service worker) can be created with `createTransportFromBrowserRuntimePort(port)`. The transport can then be passed to `createRPC` or lazily set on an existing RPC instance with `setTransport(transport)`.

```ts
import { createTransportFromBrowserRuntimePort } from "rpc-anywhere";

const port = browser.runtime.connect({ name: "my-rpc-port" });

const rpc = createRPC<ScriptSchema, WorkerSchema>({
  transport: createTransportFromBrowserRuntimePort(port),
  // ...
});

// or

const rpc = createRPC<ScriptSchema, WorkerSchema>({
  // ...
});
rpc.setTransport(createTransportFromBrowserRuntimePort(port));
```

A full list of built-in transports can be found below.

<h3>Table of contents</h3>

<!-- vscode-markdown-toc -->

- [Iframes](#iframes)
  - [API](#api)
  - [Description](#description)
  - [Example](#example)
- [Browser extensions](#browser-extensions)
  - [API](#api-1)
  - [Description](#description-1)
  - [Example](#example-1)
- [Workers](#workers)
  - [API](#api-2)
  - [Description](#description-2)
  - [Example](#example-2)
- [Broadcast channels](#broadcast-channels)
  - [API](#api-3)
  - [Description](#description-3)
  - [Example](#example-3)
- [Message ports: windows, workers, broadcast channels](#message-ports-windows-workers-broadcast-channels)
  - [API](#api-4)
  - [Description](#description-4)

<!-- vscode-markdown-toc-config
	numbering=false
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->

## <a name='Iframes'></a>Iframes

### <a name='API'></a>API

```ts
export async function createIframeTransport(
  iframe: HTMLIFrameElement,
  options?: {
    transportId?: string | number;
    filter?: (event: MessageEvent) => boolean;
    targetOrigin?: string; // default: "*"
  },
): Promise<RPCTransport>;
```

```ts
export async function createIframeParentTransport(options?: {
  transportId?: string | number;
  filter?: (event: MessageEvent) => boolean;
}): Promise<RPCTransport>;
```

### <a name='Description'></a>Description

Create transports that enable communication between an iframe and its parent window. The connection itself is fully created and managed by using [`MessageChannel`](<(https://developer.mozilla.org/en-US/docs/Web/API/Channel_Messaging_API/Using_channel_messaging)>) under the hood, you only need to provide the target iframe element in the parent window.

- `createIframeTransport` is used from the _parent window_, and it creates a transport that exchanges messages with the _child iframe_.
- `createIframeParentTransport` is used from the _child iframe_, and it creates a transport that exchanges messages with the _parent window_.

These functions are asynchronous because the following steps need to be followed to establish the connection:

1. The parent window waits for the iframe element and content to load, and then sends an "initialization" message to the iframe along with a message port.
2. The child iframe waits for the "initialization" message, stores the port for future use by the transport, and sends a "ready" message back to the parent window.
3. The parent window waits for the "ready" message.

This process ensures that the connection is established and ready to use before creating the transports at both ends. Once completed, the transport can be immediately used.

Using the `transportId` option is recommended to avoid potential conflicts with other messages. It must be unique and match on both ends. If security is a concern, the [`targetOrigin`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#targetorigin) option should be set to the expected origin of the iframe.

### <a name='Example'></a>Example

In the parent window:

```ts
import { createIframeTransport } from "rpc-anywhere";

const iframeElement = document.getElementById("my-iframe") as HTMLIFrameElement;

createIframeTransport(iframeElement, { transportId: "my-transport" }).then(
  (transport) => {
    const rpc = createRPC<Schema>({
      transport,
      // ...
    });
    // ...
  },
);
```

In the child iframe:

```ts
import { createIframeParentTransport } from "rpc-anywhere";

createIframeParentTransport({ transportId: "my-transport" }).then(
  (transport) => {
    const rpc = createRPC<Schema>({
      transport,
      // ...
    });
    // ...
  },
);
```

## <a name='Browserextensions'></a>Browser extensions

### <a name='API-1'></a>API

```ts
function createTransportFromBrowserRuntimePort(
  port: Browser.Runtime.Port | Chrome.runtime.Port,
  options?: {
    transportId?: string | number;
    filter?: (message: any, port: Browser.Runtime.Port) => boolean;
  },
): RPCTransport;
```

### <a name='Description-1'></a>Description

Create transports between different contexts in a web extension using browser runtime ports. A common example is between a content script and a service worker. [Learn more on MDN.](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/Port)

Note that you'll need to understand and manage the creation and lifecycle of the ports yourself on both ends of the connection.

It is recommended to use a port that has a unique name and is used exclusively for the RPC connection. If the port is also used for other purposes, the RPC instance might receive messages that are not intended for it.

If you need to share a port, you can use the `transportId` option to ensure that only messages that match that specific ID are handled. For advanced use cases, you can use the `filter` option to filter messages dynamically. The filter function will be called with the (low-level) message object and the port, and should return `true` if the message should be handled, and `false` otherwise.

### <a name='Example-1'></a>Example

This example involves a connection that is established from a content script to a service worker.

Other sorts of connections are possible like in the opposite direction (from a service worker to a content script), to a different extension, or to a native application. The MDN page linked above provides more information on the different types of connection APIs.

In a content script:

```ts
import { createTransportFromBrowserRuntimePort } from "rpc-anywhere";

const port = browser.runtime.connect({ name: "my-rpc-port" });

const rpc = createRPC<ScriptSchema, WorkerSchema>({
  transport: createTransportFromBrowserRuntimePort(port),
  // ...
});
// ...
```

In a service worker:

```ts
import { createTransportFromBrowserRuntimePort } from "rpc-anywhere";

browser.runtime.onConnect.addListener((port) => {
  if (port.name === "my-rpc-port") {
    const rpc = createRPC<WorkerSchema, ScriptSchema>({
      transport: createTransportFromBrowserRuntimePort(port),
      // ...
    });
    // ...
  }
});
```

## <a name='Workers'></a>Workers

### <a name='API-1'></a>API

```ts
export function createWorkerTransport(
  worker: Worker,
  options?: {
    transportId?: string | number;
    filter?: (event: MessageEvent) => boolean;
  },
): RPCTransport;
```

```ts
export function createWorkerParentTransport(
  worker: Worker,
  options?: {
    transportId?: string | number;
    filter?: (event: MessageEvent) => boolean;
  },
): RPCTransport;
```

### <a name='Description-1'></a>Description

Create transports between a worker and its parent context.

- `createWorkerTransport` is used from the _parent context_, and it creates a transport that exchanges messages with the _worker_.
- `createWorkerParentTransport` is used from the _worker_, and it creates a transport that exchanges messages with the _parent context_.

The `transportId` option can be used to avoid potential conflicts with other messages and transports. It must be unique and match on both ends.

### <a name='Example-1'></a>Example

In the parent context:

```ts
import { createWorkerTransport } from "rpc-anywhere";

const worker = new Worker("worker.js");

const rpc = createRPC<Schema>({
  transport: createWorkerTransport(worker),
  // ...
});
// ...
```

In the worker:

```ts
import { createWorkerParentTransport } from "rpc-anywhere";

const rpc = createRPC<Schema>({
  transport: createWorkerParentTransport(),
  // ...
});
// ...
```

## <a name='Broadcastchannels'></a>Broadcast channels

### <a name='API-1'></a>API

```ts
export function createTransportFromBroadcastChannel(
  channel: BroadcastChannel,
  options?: {
    transportId?: string | number;
    filter?: (event: MessageEvent) => boolean;
  },
): RPCTransport;
```

### <a name='Description-1'></a>Description

Create transports from broadcast channels.

A [`BroadcastChannel`](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel) can be used to communicate between different windows, tabs, iframes, workers... It can be used to send and receive messages to/from all other `BroadcastChannel` objects with the same name.

Broadcast channels can be tricky because there can be more than two instances of the same channel, and messages are received by all of them. While RPC Anywhere is not necessarily limited to a connection between _only_ two endpoints, this is an advanced pattern that requires careful consideration.

To avoid issues, it is recommended to avoid using requests since they are designed for one-to-one communication (unless you know what you're doing). Sending messages is perfectly fine, and will be received by all other instances of the channel.

### <a name='Example-1'></a>Example

```ts
import { createTransportFromBroadcastChannel } from "rpc-anywhere";

const channel = new BroadcastChannel("my-channel");

const rpc = createRPC<Schema>({
  transport: createTransportFromBroadcastChannel(channel),
  // ...
});
// ...
```

## <a name='Messageports:windowsworkersbroadcastchannels'></a>Message ports: windows, workers, broadcast channels

> **Warning:** this API is low-level and requires a good understanding of the target environment and its APIs. It is recommended to use the higher-level APIs whenever possible:
>
> - For iframes, you can use `createIframeTransport` and `createIframeParentTransport`.
> - For workers, you can use `createWorkerTransport` and `createWorkerParentTransport`.
> - For broadcast channels, you can use `createTransportFromBroadcastChannel`.

### <a name='API-1'></a>API

```ts
export function createTransportFromMessagePort(
  port:
    | MessagePort
    | Window
    | Worker
    | ServiceWorkerContainer
    | BroadcastChannel,
  options?: {
    transportId?: string | number;
    filter?: (event: MessageEvent) => boolean;
    remotePort?:
      | MessagePort
      | Window
      | Worker
      | ServiceWorker
      | Client
      | BroadcastChannel;
  },
): RPCTransport;
```

### <a name='Description-1'></a>Description

Create transports from message ports.

Works with [`MessagePort`](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort) instances and any objects that implement a similar interface: `addEventListener("message", listener)` and `postMessage(message)`. This is the case for window objects (including iframes), different types of workers, and broadcast channels. Here's a quick breakdown:

- **[Window](https://developer.mozilla.org/en-US/docs/Web/API/Window)**: the global `window` or the `contentWindow` of an iframe.
- **[Worker](https://developer.mozilla.org/en-US/docs/Web/API/Worker)**: a web worker. Other kinds of workers (like [service workers](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorker) and [worklets](https://developer.mozilla.org/en-US/docs/Web/API/Worklet)) are also supported through their respective interfaces.
- **[BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)**: a special kind of message port that can send messages to all other `BroadcastChannel` objects with the same name. It can be used to communicate between different windows, tabs, iframes, workers...

In most cases, all inbound and outbound messages are handled by the same port. However, in some cases, inbound messages are handled by one port, and outbound messages are sent to another. For example, this is the case for parent and iframe windows, where messages are received by the parent's window (`window.addEventListener("message", listener)`) but sent through the iframe's window (`iframe.contentWindow.postMessage(message)`).

In those cases, you can use the `remotePort` option to specify the port that outgoing messages will be sent to.

When creating an RPC connection through message ports, you have to consider the following:

- Each type of target is different and has a specific way to establish connections, handle lifecycles, and send/receive messages.
- You may need to wait for one or both of the endpoints to load.
- A single target port can potentially receive connections and messages from multiple sources. For example, a `window` object can receive messages from multiple iframes (some might even be out of your control). To make sure that your RPC messages are not mixed with other messages, you can use the `transportId` option to ensure that only messages that match that specific ID are handled.
- For advanced use cases, you can use the `filter` option to filter messages dynamically. The filter function will be called with the raw `MessageEvent` object, and should return `true` if the message should be handled, and `false` otherwise.

---

<div align="left">

[**Previous: RPC**](./1-rpc.md)

</div>
<div align="right">

[**Next: Bridging transports**](./3-bridging-transports.md)

</div>
