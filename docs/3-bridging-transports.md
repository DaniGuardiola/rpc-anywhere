<div align="left">

[**Previous: Built-in transports**](./2-built-in-transports.md)

</div>
<div align="right">

[**Next: Creating a custom transport**](./4-creating-a-custom-transport.md)

</div>

<h1>Bridging transports</h1>

RPC Anywhere has a built-in mechanism to bridge transports. To illustrate what this means and why it's useful, let's consider the following scenario:

- A server that exposes an RPC connection through a WebSocket.
- A main script in an electron app that connects to that WebSocket.
- A renderer in the same electron app that connects to the main script through Electron IPC.
- An RPC iframe inside the renderer that connects to the parent window.

In other words, in this scenario we need to establish an RPC connection between the server and the iframe contained in the renderer. For messages to get from point A to point B, they need to go through the following channels:

```
Server <-----------> Main script <--------------> Renderer <---------------> Iframe
         WebSocket                 Electron IPC              Message ports
```

To achieve this, we need two kinds of things:

- RPC instances in the server and the iframe. RPC instances are created with `createRPC`.
- "Bridges" that connect the main script with the renderer, and the renderer with the iframe. Bridges between transports can be created using `createTransportBridge`.

This is how it'd look in practice (simplified):

<!-- TODO: update transport APIs when they actually, finally exist lol -->

```ts
// server.ts
const serverRPC = createRPC<ServerSchema, IframeSchema>({
  transport: createTransportFromWebSocket(webSocket),
  // ...
});

// main.ts
const bridge = createTransportBridge(
  createTransportFromWebSocket(webSocket),
  createTransportFromElectronIpcMain(ipcMain),
);
bridge.start();

// renderer.ts
createTransportBridge(
  createTransportFromElectronIpcRenderer(ipcRenderer),
  createTransportFromMessagePort(window, iframe.contentWindow),
);
bridge.start();

// iframe.ts
const iframeRPC = createRPC<IframeSchema, ServerSchema>({
  transport: createTransportFromMessagePort(window, window.parent),
  // ...
});
```

Bridges simply forward messages from one transport to another in both directions. There's no need to create RPC instances where the bridges are, because RPC functionality itself is only needed at the endpoints.

While there is no limit to the number of bridges you can create, it's important to keep in mind that each bridge adds a layer of complexity, latency, and potential points of failure. It's a good idea to keep the number of bridges to a minimum, and to test thoroughly when using them.

If you want to stop using a bridge, you can call `bridge.stop()`. This will unregister any event listeners for any transports that support it.

---

<div align="left">

[**Previous: Built-in transports**](./2-built-in-transports.md)

</div>
<div align="right">

[**Next: Creating a custom transport**](./4-creating-a-custom-transport.md)

</div>
