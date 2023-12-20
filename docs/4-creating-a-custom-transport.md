<div align="left">

[**Previous: Bridging transports**](./3-bridging-transports.md)

</div>

<h1>Creating a custom transport</h1>

TODO: explain why all are optional.

An RPC transport is the channel through which messages are sent and received between point A and point B. The specific implementation depends on the context, but the requirements to create a transport that an RPC instance can use are always the same:

- Provide a `send` function that takes an arbitrary message and sends it to the other endpoint.
- Provide a `registerHandler` method that takes ("registers") a callback and calls it whenever a message is received from the other endpoint.
- Provide an `unregisterHandler` method that removes or deactivates the previously set handler. This might be necessary if the transport is updated at runtime (through `rpc.setTransport(transport)`), as it is called as a way to clean up the previous transport's handler before registering the new handler.

A transport object looks like this:

```ts
const transport = {
  send(message) {
    // send the message
  },
  registerHandler(handler) {
    // register the handler
  },
  unregisterHandler() {
    // unregister the handler
  },
};
```

Normally, it is a good idea to define a function that creates the transport, because it allows the user to create multiple transports with potentially different configurations, as well as providing a local scope which is useful for unregistering the handler at a later time (as we'll see below).

Let's update the previous snippet to turn it into a function, and add a fictional `channel` object that contains the `postMessage`, `addMessageListener` and `removeMessageListener` methods for the sake of example:

```ts
function createMyCustomTransport(channel: ExampleChannel): RPCTransport {
  let handler: MessageHandler | null = null;
  return {
    send(message) {
      channel.postMessage(message);
    },
    registerHandler(handler) {
      channel.addMessageListener((message) => handler(message));
    },
  };
}
```

Notice how there is no way to unregister the handler. If the user decides to replace the transport at runtime, the previous transport's handler will still be active. To prevent this, we can use a local variable to store the listener, so that we can remove it later:

```ts
function createMyCustomTransport(channel: ExampleChannel): RPCTransport {
  let listener: ExampleMessageListener | null = null;
  return {
    send(message) {
      channel.postMessage(message);
    },
    registerHandler(handler) {
      listener = (message) => handler(message);
      channel.addMessageListener(listener);
    },
    unregisterHandler() {
      if (listener) channel.removeMessageListener(listener);
    },
  };
}
```

There is an additional consideration that might or might not apply depending on the context: certain ways to send and receive message can be used by multiple sources, like other transports, libraries, user code, etc. This can result in issues because the transport might receive messages that are not meant for it.

For example, an iframe can communicate with its parent window using `parentWindow.postMessage(message)`, which is then received by the parent window through `window.addEventListener("message", handler)`. If multiple sources fire `message` events in the same window, the handler will be called for all of them, even if they are not meant for the transport.

There are many ways to solve this problem, like including a unique ID in messages or filtering by checking some contextual information (e.g. a window message event's `origin` property). If you think this might be relevant for your transport, consider adding some way to differentiate a transport's messages from others.

All built-in transports provide ways to achieve this by either providing a unique ID or a custom filtering function. They use [a few utilities](../src/transport-utils.ts) that are also available for you to use. If you want to see how they work, [check out the source of the built-in transports](../src/transports), as well as [the source of the utilities](../src/transport-utils.ts).

---

<div align="left">

[**Previous: Bridging transports**](./3-bridging-transports.md)

</div>
```
