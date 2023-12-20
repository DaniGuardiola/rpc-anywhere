<div align="left">

[**Previous: Documentation index**](./README.md)

</div>
<div align="right">

[**Next: Built-in transports**](./2-built-in-transports.md)

</div>

<h1>RPC</h1>

<h2>Table of contents</h2>

<!-- vscode-markdown-toc -->

- [RPC schemas](#rpc-schemas)
- [Transports](#transports)
- [Built-in transports](#built-in-transports)
  - [Iframes, service workers, broadcast channels... (message ports)](#iframes-service-workers-broadcast-channels-message-ports)
  - [Web extensions transport](#web-extensions-transport)
- [Transport bridges](#transport-bridges)
- [Requests](#requests)
  - [Making requests](#making-requests)
  - [The request proxy API](#the-request-proxy-api)
  - [Request timeout](#request-timeout)
  - [Handling requests](#handling-requests)
  - [Schema type from request handler](#schema-type-from-request-handler)
- [Messages](#messages)
  - [Sending messages](#sending-messages)
  - [Listening for messages](#listening-for-messages)

<!-- vscode-markdown-toc-config
	numbering=false
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->

## <a name='RPCschemas'></a>RPC schemas

A schema defines the requests that a specific endpoint can respond to, and the messages that it can send. Since RPC Anywhere doesn't enforce a client-server architecture, each endpoint has its own schema, and both `RPC` instances need to "know" about the other's schema.

Schema types bring type safety to an instance, both when acting as a "client" (sending requests and listening for messages) and as a "server" (responding to requests and sending messages).

Schemas are declared with the `RPCSchema<InputSchema>` type, using the following structure:

```ts
import { type RPCSchema } from "rpc-anywhere";

type MySchema = RPCSchema<{
  requests: {
    requestName: {
      params: {
        /* request parameters */
      };
      response: {
        /* response content */
      };
    };
  };
  messages: {
    messageName: {
      /* message content */
    };
  };
}>;
```

There is complete flexibility in the structure of the schemas. All properties can be omitted or set to `void`. Some examples:

```ts
type MySchema = RPCSchema<{
  requests: {
    // request with optional parameters
    requestName: {
      params?: {
        direction: "up" | "down";
        velocity?: number;
      };
      response: string | number;
    };

    // request with no response
    requestName: {
      params: string;
    };

    // request with no parameters
    requestName: {
      response: [string, number];
    };

    // request with no parameters and no response
    requestName: void;
  };
  messages: {
    // message with no content
    messageName: void;
  };
}>;

// schema with no requests
type MySchema = RPCSchema<{
  messages: {
    messageName: void;
  };
}>;

// schema with no messages
type MySchema = RPCSchema<{
  requests: {
    requestName: void;
  };
}>;
```

Schemas can be "empty" if the RPC instance does not handle requests or send messages (resembling a "client"). For this situation, there is a special type: `EmptyRPCSchema`.

```ts
type RemoteSchema = RPCSchema<{
  requests: {
    requestName: void;
  };
}>;

// rpc-local.ts ("client")
const rpc = new RPC<EmptyRPCSchema, RemoteSchema>(/* ... */);
rpc.request("requestName");

// rpc-remote.ts ("server")
const rpc = new RPC<RemoteSchema, EmptyRPCSchema>({
  requestHandler: {
    requestName() {
      /* ... */
    },
  },
});
```

For convenience, the `createClientRPC` and `createServerRPC` functions can be used. They both take the remote (server) schema as a type parameter, as it is the one that matters (the local/client one is necessarily empty).

```ts
// rpc-local.ts ("client")
const rpc = createClientRPC<RemoteSchema>(/* ... */);
await rpc.request("requestName");

// rpc-remote.ts ("server")
const rpc = createServerRPC<RemoteSchema>({
  requestHandler: {
    requestName() {
      /* ... */
    },
  },
});
```

If both RPC instances are "symmetrical" (i.e. they both handle the same requests and send the same messages), you can skip the second schema type parameter:

```ts
// rpc-a.ts
const rpcA = createRPC<SymmetricalSchema>(/* ... */);

// rpc-b.ts
const rpcB = createRPC<SymmetricalSchema>(/* ... */);
```

In this case, the passed schema will be interpreted as both the local and remote schema.

## <a name='Transports'></a>Transports

Using a built-in transport (more about them below) is strongly recommended if possible. If you can't find one that fits your use case, you're in charge of creating it and connecting the RPC instances to it.

An RPC transport is the channel through which messages are sent and received between point A and point B. This looks different in every context, but the requirements to hook it up to an RPC instance are simple:

- Provide a `send` function that takes an arbitrary message and sends it to the other endpoint.
- Provide a `registerHandler` method that takes a callback and calls it whenever a message is received from the other endpoint.
- Provide an `unregisterHandler` method that removes or deactivates the previously set handler. This might be necessary if the transport is updated at runtime (through `rpc.setTransport(transport)`), as it is called to clean up before registering the new handler.

The transport can be provided in the `RPC` options, or lazily set at a later time using the `setTransport` method. For example:

```ts
const rpc = createRPC<Schema>({
  transport: {
    send(message) {
      // send the message
    },
    registerHandler(handler) {
      // register the handler
    },
    unregisterHandler() {
      // unregister the handler
    },
  },
});

// or

const rpc = createRPC<Schema>();
rpc.setTransport({
  send(message) {
    // send the message
  },
  registerHandler(handler) {
    // register the handler
  },
  unregisterHandler() {
    // unregister the handler
  },
});
```

All three transport methods are optional. Omitting `unregisterHandler` is fine if the transport doesn't need to be updated at runtime. However, if `send` or `registerHandler` are missing, the RPC will fail when attempting to send or receive messages, respectively.

While uncommon, this might be acceptable for certain use cases, such as unidirectional RPCs that only send messages in one direction (in that case, there is no need for the ability to send messages in the opposite direction).

## <a name='Built-intransports'></a>Built-in transports

RPC Anywhere ships with a few built-in ways to create transports for common use cases.

For example, a transport for web extensions (content scripts <-> service worker) can be created with `createTransportFromBrowserRuntimePort`. As the name implies, it uses a `Browser.Runtime.Port` object to send and receive messages. You can see a full example below.

A full list of built-in transports can be found below.

### <a name='Iframesserviceworkersbroadcastchannels...messageports'></a>Iframes, service workers, broadcast channels... (message ports)

TODO: section.

### <a name='Webextensionstransport'></a>Web extensions transport

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

## <a name='Transportbridges'></a>Transport bridges

TODO: section.

## <a name='Requests'></a>Requests

### <a name='Makingrequests'></a>Making requests

Requests are sent using the `request` method:

```ts
const response = await rpc.request("requestName", {
  /* request parameters */
});
```

The parameters can be omitted if the request doesn't have any:

```ts
const response = await rpc.request("requestName");
```

### <a name='TherequestproxyAPI'></a>The request proxy API

Alternatively, you can use the request proxy API:

```ts
const response = await rpc.requestProxy.requestName({
  /* request parameters */
});
```

### <a name='Requesttimeout'></a>Request timeout

If a request takes too long to complete, it will time out and be rejected with an error. The default request timeout is 1000 milliseconds. You can change it by passing a `maxRequestTime` option to the `RPC` constructor:

```ts
const rpc = createRPC<Schema>({
  // ...
  maxRequestTime: 5000,
});
```

To disable the timeout, pass `Infinity`. Be careful with this, as it can lead to requests hanging indefinitely.

### <a name='Handlingrequests'></a>Handling requests

Requests are handled using the `requestHandler` option of the `RPC` constructor. The request handler can be defined in two ways:

**Object format**

The object format is the recommended way to define request handlers, because it is the most ergonomic, provides full type safety, and supports a "fallback" handler. All functions can be `async`.

```ts
const rpc = createRPC<Schema>({
  // ...
  requestHandler: {
    requestName(/* request parameters */) {
      /* handle the request */
      return /* response */;
    },
    // or
    async requestName(/* request parameters */) {
      await doSomething();
      /* handle the request */
      return /* response */;
    },

    // fallback handler
    _(method, params) {
      /* handle requests that don't have a handler defined (not type-safe) */
      return /* response */;
    },
    // or
    async _(method, params) {
      await doSomething();
      /* handle requests that don't have a handler defined (not type-safe) */
      return /* response */;
    },
  },
});
```

Unless a fallback handler is defined, requests that don't have a handler defined will be rejected with an error.

**Function format**

The function format is useful when you need to handle requests dynamically, delegate/forward them somewhere else, etc.

This format is not type-safe, so it's recommended to use the object format instead whenever possible.

```ts
const rpc = createRPC<Schema>({
  // ...
  requestHandler(method, params) {
    /* handle the request */
    return /* response */;
  },
  // or
  async requestHandler(method, params) {
    await doSomething();
    /* handle the request */
    return /* response */;
  },
});
```

---

The request handler can also be set lazily with the `setRequestHandler` method:

```ts
const rpc = createRPC<Schema>();
rpc.setRequestHandler(/* ... */);
```

### <a name='Schematypefromrequesthandler'></a>Schema type from request handler

There is some duplication between the request handler and the schema type. This can be improved by creating the schema type from runtime values.

To do this, first create the request handler using `createRPCRequestHandler`:

```ts
import { createRPCRequestHandler } from "rpc-anywhere";

const myRequestHandler = createRPCRequestHandler({
  requestName(/* request parameters */) {
    /* handle the request */
    return /* response */;
  },
  // ...
});
```

To use it in a schema type, pass its type as the second type parameter by using `typeof`:

```ts
import { type RPCRequestSchemaFromHandler } from "rpc-anywhere";

type Schema = RPCSchema<
  {
    messages: {
      // ...
    };
  },
  typeof myRequestHandler
>;
```

The schema will then infer the `requests` property type from the request handler. Note that if you do define the `requests` property in the first type argument, **it will be completely ignored** and overridden with the inferred type.

Finally, pass the schema type and the request handler to the `RPC` constructor:

```ts
const rpc = new RPC<Schema>({
  // ...
  requestHandler: myRequestHandler,
});
```

## <a name='Messages'></a>Messages

### <a name='Sendingmessages'></a>Sending messages

Messages are sent using the `send` method:

```ts
rpc.send("messageName", {
  /* message content */
});
```

The content can be omitted if the message doesn't have any or if it's optional:

```ts
rpc.send("messageName");
```

### <a name='Listeningformessages'></a>Listening for messages

Messages are received by adding a message listener:

```ts
rpc.addMessageListener("messageName", (messageContent) => {
  /* handle the message */
});
```

To listen for all messages, use the `*` (asterisk) key:

```ts
rpc.addMessageListener("*", (messageName, messageContent) => {
  /* handle the message */
});
```

A listener can be removed with the `removeMessageListener` method:

```ts
rpc.removeMessageListener("messageName", listener);
rpc.removeMessageListener("*", listener);
```

---

<div align="left">

[**Previous: Documentation index**](./README.md)

</div>
<div align="right">

[**Next: Built-in transports**](./2-built-in-transports.md)

</div>
