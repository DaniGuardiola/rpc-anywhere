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

- [Iframes, workers, broadcast channels... (message ports)](#iframes-workers-broadcast-channels-message-ports)
- [Browser extensions](#browser-extensions)

<!-- vscode-markdown-toc-config
	numbering=false
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->

## <a name='Iframesworkersbroadcastchannels...messageports'></a>Iframes, workers, broadcast channels... (message ports)

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

- **[Window](https://developer.mozilla.org/en-US/docs/Web/API/Window)**: the global `window` object of a top-level page or the `contentWindow` of an iframe.
- **[Worker](https://developer.mozilla.org/en-US/docs/Web/API/Worker)**: a web worker. Other kinds of workers (like [service workers](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorker) and [worklets](https://developer.mozilla.org/en-US/docs/Web/API/Worklet)) are also supported through their respective interfaces.
-
- **[BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)**: a special kind of message port that can send messages to all other `BroadcastChannel` objects with the same name. It can be used to communicate between different windows, tabs, or iframes.

To create a transport, you need to specify two different ports:

- `localPort`: the port that will receive and handle "message" events through `addEventListener("message", listener)`.
- `remotePort`: the port that messages will be sent to through `postMessage(message)`.

Note that they don't need to be of the same type. For example, you can create a transport between a window and a worker, or between a worker and a broadcast channel. In some cases, you might want to use the same port for both, like when using a broadcast channel (messages are sent and received through the same instance).

When creating an RPC connection through message ports, you have to consider the following:

- Each type of target is different, and has a specific implementation and API. For example, window objects act as message ports directly, while service workers require extra steps. There are also some peculiarities that you'll need to account for.
- You may need to wait for one or both of the endpoints to load. In some cases, you might want to wait for a "load" or "ready" event (e.g. waiting for a parent window, iframe, or worker to load), or even send a "ready" message to the other endpoint after creating the RPC instance to signal that it's ready to receive messages.
- A single target port can receive messages from multiple sources. For example, a `window` object can receive messages from multiple iframes. To make sure that your RPC messages are not mixed with other messages, you can use the `transportId` option to ensure that only messages with the same `transportId` are handled.
- For advanced use cases, you can use the `filter` option to filter messages dynamically.

<!-- TODO: add a few examples: iframes, workers, BroadcastChannel -->

## <a name='Browserextensions'></a>Browser extensions

```ts
function createTransportFromBrowserRuntimePort(
  port: Browser.Runtime.Port | Chrome.runtime.Port,
): RPCTransport;
```

Create RPCs between a content script and a service worker, using browser runtime ports. TODO: add links.

**Example**

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

---

<div align="left">

[**Previous: RPC**](./1-rpc.md)

</div>
<div align="right">

[**Next: Bridging transports**](./3-bridging-transports.md)

</div>
