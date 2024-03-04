<div align="left">

[**Previous: RPC**](./1-rpc.md)

</div>
<div align="right">

[**Next: Bridging transports**](./3-bridging-transports.md)

</div>

<h1>Built-in transports</h1>

RPC Anywhere ships with a few built-in ways to create transports for common use cases.

For example, a transport for browser extensions (content scripts ↔ service worker) can be created with `createTransportFromBrowserRuntimePort(port)`. The transport can then be passed to `createRPC` or lazily set on an existing RPC instance with `setTransport(transport)`. For example:

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
  - [Example](#example)
- [Browser extensions](#browser-extensions)
  - [Example](#example-1)
- [Message ports: windows, workers, broadcast channels](#message-ports-windows-workers-broadcast-channels)

<!-- vscode-markdown-toc-config
	numbering=false
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->

## <a name='Iframes'></a>Iframes

```ts
export async function createIframeTransport(
  iframe: HTMLIFrameElement,
  options?: {
    id?: string | number;
    targetOrigin?: string; // default: "*"
  },
): Promise<RPCTransport>;
```

```ts
export async function createIframeParentTransport(options?: {
  id?: string | number;
}): Promise<RPCTransport>;
```

Create transports that enable communication between iframes and their parent windows. Uses [`MessageChannel`](<(https://developer.mozilla.org/en-US/docs/Web/API/Channel_Messaging_API/Using_channel_messaging)>) under the hood.

- `createIframeTransport` is used from the _parent window_, and it creates a transport that sends messages to the _child iframe_.
- `createIframeParentTransport` is used from the _child iframe_, and it creates a transport that sends messages to the _parent window_.

These functions are asynchronous because the following steps need to be followed to establish the connection:

1. The parent window waits for the iframe to load, and then sends a "init" message to the iframe along with a message port.
2. The child iframe waits for the "init" message, stores the port for future use by the transport, and sends a "ready" message back to the parent window.
3. The parent window waits for the "ready" message.

This process ensures that the connection is established and ready to use before creating the transports at both ends, while keeping things simple.

Using the `id` option is recommended to avoid potential conflicts with other transports. It must be unique and match on both ends. If security is a concern, the [`targetOrigin`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#targetorigin) option should be set to the expected origin of the iframe.

### <a name='Example'></a>Example

In the parent window:

```ts
import { createIframeTransport } from "rpc-anywhere";

createIframeTransport(iframeElement, { id: "my-iframe" }).then((transport) => {
  const rpc = createRPC<Schema>({
    transport,
    // ...
  });
  // ...
});
```

In the child iframe:

```ts
import { createIframeParentTransport } from "rpc-anywhere";

createIframeParentTransport({ id: "my-iframe" }).then((transport) => {
  const rpc = createRPC<Schema>({
    transport,
    // ...
  });
  // ...
});
```

## <a name='Browserextensions'></a>Browser extensions

```ts
function createTransportFromBrowserRuntimePort(
  port: Browser.Runtime.Port | Chrome.runtime.Port,
  options?: {
    transportId?: string | number;
    filter?: (message: any, port: Browser.Runtime.Port) => boolean;
  },
): RPCTransport;
```

Create RPCs between a content script and a service worker, using browser runtime ports.

### <a name='Example-1'></a>Example

Here's how it looks in a content script:

```ts
import { createTransportFromBrowserRuntimePort } from "rpc-anywhere";

const port = browser.runtime.connect({ name: "my-rpc-port" });

const rpc = createRPC<ScriptSchema, WorkerSchema>({
  transport: createTransportFromBrowserRuntimePort(port),
  // ...
});
// ...
```

And in a service worker:

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

It is recommended to use a port that has a unique name and is used exclusively for the RPC connection. If the port is also used for other purposes, the RPC instance might receive messages that are not intended for it.

If you do need to share a port, you can use the `transportId` option to ensure that only messages that match that specific ID are handled. For advanced use cases, you can use the `filter` option to filter messages dynamically. The filter function will be called with the (low-level) message object and the port, and should return `true` if the message should be handled, and `false` otherwise.

## <a name='Messageports:windowsworkersbroadcastchannels'></a>Message ports: windows, workers, broadcast channels

> **Warning:** this API is low-level and requires a good understanding of the target environment and its APIs. It is recommended to use the higher-level APIs whenever possible:
>
> - For iframes, you can use `createIframeTransport` and `createIframeParentTransport`.

```ts
export function createTransportFromMessagePort(
  localPort: MessagePort | Window | Worker | BroadcastChannel,
  remotePort: MessagePort | Window | Worker | BroadcastChannel,
  options?: {
    transportId?: string | number;
    filter?: (event: MessageEvent) => boolean;
  },
): RPCTransport;
```

Create transports for message ports, which can be used with window objects, iframes, workers, broadcast channels, and more.

Works with any objects that implement a [`MessagePort`](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort)-like interface: `addEventListener("message", listener)` and `postMessage(message)`. This is the case for window objects (including iframes), different types of workers, and broadcast channels. Here's a quick breakdown:

- **[Window](https://developer.mozilla.org/en-US/docs/Web/API/Window)**: the global `window` or the `contentWindow` of an iframe.
- **[Worker](https://developer.mozilla.org/en-US/docs/Web/API/Worker)**: a web worker. Other kinds of workers (like [service workers](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorker) and [worklets](https://developer.mozilla.org/en-US/docs/Web/API/Worklet)) are also supported through their respective interfaces.
- **[BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)**: a special kind of message port that can send messages to all other `BroadcastChannel` objects with the same name. It can be used to communicate between different windows, tabs, or iframes.

To create a transport, you need to specify two different ports:

- `localPort`: the port that will receive and handle incoming "message" events through `addEventListener("message", listener)`.
- `remotePort`: the port that outgoing messages will be sent to through `postMessage(message)`.

Note that they don't need to be of the same type. For example, you can create a transport between a window and a worker, or between a worker and a broadcast channel. In some cases, you might want to use the same port for both, like when using a broadcast channel (messages are sent and received through the same instance).

When creating an RPC connection through message ports, you have to consider the following:

- Each type of target is different, and has a specific implementation and API. For example, window objects act as message ports directly, while service workers require extra steps. Each has some peculiarities that you'll need to account for.
- You may need to wait for one or both of the endpoints to load. In some cases, you might want to wait for a "load" or "ready" event (e.g. waiting for a parent window, iframe, or worker to load), or even manually send a "ready" message to the other endpoint after creating the RPC instance to signal that it's ready to receive messages and requests.
- A single target port can receive messages from multiple sources. For example, a `window` object can receive messages from multiple iframes (some might even be out of your control). To make sure that your RPC messages are not mixed with other messages, you can use the `transportId` option to ensure that only messages that match that specific ID are handled.
- For advanced use cases, you can use the `filter` option to filter messages dynamically. The filter function will be called with the raw `MessageEvent` object, and should return `true` if the message should be handled, and `false` otherwise.

<!-- TODO: add a few examples: iframes, workers, BroadcastChannel -->

---

<div align="left">

[**Previous: RPC**](./1-rpc.md)

</div>
<div align="right">

[**Next: Bridging transports**](./3-bridging-transports.md)

</div>
