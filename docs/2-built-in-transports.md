<div align="left">

[**Previous: RPC**](./1-rpc.md)

</div>
<div align="right">

[**Next: Bridging transports**](./3-bridging-transports.md)

</div>

<h1>Built-in transports</h1>

RPC Anywhere ships with a few built-in ways to create transports for common use cases.

For example, a transport for web extensions (content scripts <-> service worker) can be created with `createTransportFromBrowserRuntimePort(port)`. As the name implies, it uses a `Browser.Runtime.Port` object to send and receive messages. You can see a full example below.

A full list of built-in transports can be found below.

<h3>Table of contents</h3>

<!-- vscode-markdown-toc -->

- [Iframes, service workers, broadcast channels... (message ports)](#iframes-service-workers-broadcast-channels-message-ports)
- [Web extensions transport](#web-extensions-transport)

<!-- vscode-markdown-toc-config
	numbering=false
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->

## <a name='Iframesserviceworkersbroadcastchannels...messageports'></a>Iframes, service workers, broadcast channels... (message ports)

TODO: section.

## <a name='Webextensionstransport'></a>Web extensions transport

```ts
function createTransportFromBrowserRuntimePort(
  port: Browser.Runtime.Port | Chrome.runtime.Port,
): Transport;
```

Create RPCs between a content script and a service worker, using browser runtime ports. TODO: add links.

**Example**

Here's how it looks in a content script:

```ts
import { createTransportFromBrowserRuntimePort } from "rpc-anywhere";

const port = browser.runtime.connect({ name: "my-rpc-port" });

const rpc = new RPC<ScriptSchema, WorkerSchema>({
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
    const rpc = new RPC<WorkerSchema, ScriptSchema>({
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
