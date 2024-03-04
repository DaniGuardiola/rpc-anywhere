<div align="left">

[**Previous: Documentation index**](./README.md)

</div>
<div align="right">

[**Next: Built-in transports**](./2-built-in-transports.md)

</div>

<h1>RPC</h1>

Before reading this documentation, it is recommended to check out [the "Getting started" section of the README](../README.md#getting-started).

<h3>Table of contents</h3>

<!-- vscode-markdown-toc -->

- [RPC schemas](#rpc-schemas)
  - [Declaring schemas](#declaring-schemas)
  - [Using schemas in RPC instances](#using-schemas-in-rpc-instances)
  - [Schema flexibility](#schema-flexibility)
  - [Empty schemas](#empty-schemas)
  - [Client/server RPC schemas](#clientserver-rpc-schemas)
  - [Symmetrical RPC schemas](#symmetrical-rpc-schemas)
  - [Documenting schemas with JSDoc](#documenting-schemas-with-jsdoc)
- [Transports](#transports)
- [Requests](#requests)
  - [Making requests](#making-requests)
  - [The request proxy API](#the-request-proxy-api)
  - [Request timeout](#request-timeout)
  - [Handling requests](#handling-requests)
  - [Inferring the schema from the request handler](#inferring-the-schema-from-the-request-handler)
- [Messages](#messages)
  - [Sending messages](#sending-messages)
  - [Listening for messages](#listening-for-messages)
- [The `proxy` property](#the-proxy-property)
- [Recipes](#recipes)
  - [Client/server RPC](#clientserver-rpc)
  - [Symmetrical RPC](#symmetrical-rpc)

<!-- vscode-markdown-toc-config
	numbering=false
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->

## <a name='RPCschemas'></a>RPC schemas

A schema defines the requests that a specific endpoint can respond to, and the messages that it can send. Since RPC Anywhere doesn't enforce a client-server architecture, each endpoint has its own schema, and both RPC instances need to "know" about the other's schema.

Schema types bring type safety to an instance, both when acting as a "client" (sending requests and listening for messages) and as a "server" (responding to requests and sending messages).

### <a name='Declaringschemas'></a>Declaring schemas

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

### Using schemas in RPC instances

Once you've declared your schemas, you can use them to create an RPC instance. An instance acts as the "client" that sends requests and listens for messages from the other endpoint, and as the "server" that responds to requests and sends messages to the other endpoint.

For this reason, you need to pass two schema types to `createRPC`: the local schema (representing this instance's capabilities), and the remote schema (representing the other endpoint's capabilities).

The local schema is the first type parameter, and the remote schema is the second type parameter.

```ts
import { createRPC } from "rpc-anywhere";

const rpc = createRPC<LocalSchema, RemoteSchema>({
  // ...
});
```

A typical pattern is to declare the local schema in the same file where the corresponding RPC instance is created. For example, you might end up with a file structure like this:

```ts
// rpc-a.ts
import { type SchemaB } from "./rpc-b.js";

export type SchemaA = RPCSchema</* ... */>;
const rpcA = createRPC<SchemaA, SchemaB>();

// rpc-b.ts
import { type SchemaA } from "./rpc-a.js";

export type SchemaB = RPCSchema</* ... */>;
const rpcB = createRPC<SchemaB, SchemaA>();
```

You might have noticed that the schema imports are circular. This is completely fine! Circular imports are only problematic for runtime values, but schemas are types which are only used for type-checking/IDE features and do not affect bundling or runtime behavior.

### <a name='Schemaflexibility'></a>Schema flexibility

There is complete flexibility in the structure of the schemas. All properties can be omitted or set to `void`. Request parameters and message contents can be optional too. Some examples:

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

    // message with optional content
    messageName?: {
      content?: string;
    };
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

### <a name='Emptyschemas'></a>Empty schemas

Schemas can be "empty" if one of the RPC instances does not handle requests or send messages (resembling a "pure" client/server connection). For this situation, there is a special type: `EmptyRPCSchema`.

```ts
type RemoteSchema = RPCSchema<{
  requests: {
    requestName: void;
  };
}>;

// rpc-local.ts (client)
const rpc = createRPC<EmptyRPCSchema, RemoteSchema>(/* ... */);
rpc.request("requestName");

// rpc-remote.ts (server)
const rpc = createRPC<RemoteSchema, EmptyRPCSchema>({
  requestHandler: {
    requestName() {
      /* ... */
    },
  },
});
```

### <a name='ClientserverRPCschemas'></a>Client/server RPC schemas

For convenience, `createClientRPC` and `createServerRPC` can be used to achieve the same result as in the previous section in a simpler way. They both take the remote (server) schema as a type parameter, as it is the only one that matters (the local/client one is empty).

```ts
// rpc-local.ts (client)
const rpc = createClientRPC<RemoteSchema>(/* ... */);
await rpc.request("requestName");

// rpc-remote.ts (server)
const rpc = createServerRPC<RemoteSchema>({
  requestHandler: {
    requestName() {
      /* ... */
    },
  },
});
```

### <a name='SymmetricalRPCschemas'></a>Symmetrical RPC schemas

If both RPC endpoints are "symmetrical" (i.e. they both handle the same requests and send the same messages), you can skip the second schema type parameter:

```ts
// rpc-a.ts
const rpcA = createRPC<SymmetricalSchema>(/* ... */);

// rpc-b.ts
const rpcB = createRPC<SymmetricalSchema>(/* ... */);
```

In this case, the passed schema will be interpreted as both the local and remote schema.

### <a name='DocumentingschemaswithJSDoc'></a>Documenting schemas with JSDoc

Schemas support JSDoc comments in almost everything that can be defined, including:

- Requests.
- Request parameters.
- Request responses.
- Messages.
- Message contents.

These comments are later accessible when using the RPC instances. For example, this is how a request might be documented:

````ts
type MySchema = RPCSchema<{
  requests: {
    /**
     * Move the car.
     *
     * @example
     *
     * ```
     * const result = await rpc.request.move({ direction: "left", duration: 1000 });
     * ```
     */
    move: {
      params: {
        /**
         * The direction of the movement.
         */
        direction: "left" | "right";
        /**
         * The total duration of the movement.
         */
        duration: number;
        /**
         * The velocity of the car.
         *
         * @default 100
         */
        velocity?: number;
      };
      response: {
        /**
         * The total distance traveled by the car.
         */
        distance: number;
        /**
         * The final position of the car.
         */
        position: number;
      };
    };
  };
}>;
````

If this example schema is used for the remote RPC endpoint, hovering over any of the symbols highlighted below (in a supported IDE, like Visual Studio Code) will show the corresponding JSDoc documentation, along with their types.

```ts
const { distance, position } = await rpc.request.move({
  //    ^         ^                              ^
  direction: "left",
  // ^
  duration: 1000,
  // ^
  velocity: 200,
  // ^
});
```

## <a name='Transports'></a>Transports

An RPC transport is the channel through which messages are sent and received between point A and point B. In RPC Anywhere, a transport is an object that contains the specific logic to accomplish this.

Using a built-in transport is **strongly recommended**. You can learn about them in the [Built-in transports](./2-built-in-transports.md) page.

If you can't find one that fits your use case, you can create one yourself. Learn how in the [Creating a custom transport](./4-creating-a-custom-transport.md) page. You can also consider filing a feature request or contributing a new built-in transport to the project.

To provide a transport to an RPC instance pass it to `createRPC` as the `transport` option, or lazily set it at a later time using the `setTransport` method. For example:

```ts
const rpc = createRPC<LocalSchema, RemoteSchema>({
  transport: createTransportFromMessagePort(window, iframe.contentWindow),
});

// or

const rpc = createRPC<LocalSchema, RemoteSchema>();
rpc.setTransport(createTransportFromMessagePort(window, iframe.contentWindow));
```

Keep in mind that if the transport is set lazily, the RPC instance will be unusable until then.

Transports can be hot-swapped by using the lazy setter, as long as the transport supports this. All built-in transports support hot-swapping. If you create a custom transport, you can add support for it by making sure that it cleans up after itself when replaced, typically by unregistering event listeners in the `unregisterHandler` method.

## <a name='Requests'></a>Requests

### <a name='Makingrequests'></a>Making requests

Requests are sent using the `request` method:

```ts
const response = await rpc.request("requestName", {
  /* request parameters */
});
```

The parameters can be omitted if the request doesn't support any (or if they are optional):

```ts
const response = await rpc.request("requestName");
```

### <a name='TherequestproxyAPI'></a>The request proxy API

Alternatively, you can use the request proxy API:

```ts
const response = await rpc.request.requestName({
  /* request parameters */
});
```

The `rpc.request` property acts as a function and as an object at the same time. This has an unfortunate effect: when autocompleting with TypeScript (when you type `rpc.request.`), some suggestions will be properties from the function JavaScript prototype (`apply`, `bind`, `call`...).

If you want a version that only contains the proxied methods (e.g. for a better developer experience or aliasing), you can use `requestProxy` instead:

```ts
const chef = chefRPC.requestProxy;
const dish = await chef.cook({ recipe: "rice" });
```

### <a name='Requesttimeout'></a>Request timeout

If the remote endpoint takes too long to respond to a request, it will time out and be rejected with an error. The default request timeout is 1000 milliseconds (1 second). You can change it by passing a `maxRequestTime` option to `createRPC`:

```ts
const rpc = createRPC<Schema>({
  // ...
  maxRequestTime: 5000,
});
```

To disable the timeout, pass `Infinity`. Be careful! It can lead to requests hanging indefinitely.

### <a name='Handlingrequests'></a>Handling requests

Requests are handled using the `requestHandler` option of `createRPC`. The request handler can be defined in two ways:

**Object format**

The object format is the recommended way to define request handlers because it is the most ergonomic, provides full type safety, and supports a "fallback" handler. All handlers can be `async`.

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

The request handler can be lazily set with the `setRequestHandler` method:

```ts
const rpc = createRPC<Schema>();
rpc.setRequestHandler(/* ... */);
```

Until the request handler is set, the RPC instance won't be able to handle requests.

### <a name='Inferringtheschemafromtherequesthandler'></a>Inferring the schema from the request handler

Defining both a "requests" schema and a request handler can be redundant. For example:

```ts
type Schema = RPCSchema<{
  requests: {
    myRequest: {
      params: { a: number; b: string };
      response: { c: boolean };
    };
  };
  messages: { myMessage: void };
}>;

const rpc = createRPC<Schema>({
  // ...
  requestHandler: {
    myRequest({ a, b }) {
      return { c: a > 0 && b.length > 0 };
    },
  },
});
```

To reduce duplication, RPC Anywhere provides a way to partially infer the schema type from the request handler.

To do this, first create the request handler (in object format) using `createRPCRequestHandler`, and then pass its type as the second type parameter by using `typeof`. Updating the previous example:

```ts
const myRequestHandler = createRPCRequestHandler({
  myRequest({ a, b }: { a: number; b: string }) {
    return { c: a > 0 && b.length > 0 };
  },
});

type Schema = RPCSchema<
  { messages: { myMessage: void } },
  typeof myRequestHandler
>;

const rpc = createRPC<Schema>({
  // ...
  requestHandler: myRequestHandler,
});
```

If there are no messages in the schema, you can pass `void` as the first type parameter to `RPCSchema`:

```ts
type Schema = RPCSchema<void, typeof myRequestHandler>;
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

Similar to requests, there is a message proxy API you can use:

```ts
rpc.send.messageName({
  /* message content */
});

// or

rpc.sendProxy.messageName({
  /* message content */
});
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

## <a name='Theproxyproperty'></a>The `proxy` property

RPC instances also expose a `proxy` property, which is an object that contains both proxies (`request` and `send`). It is an alternative API provided for convenience, for example:

```ts
const rpc = createRPC<Schema>(/* ... */).proxy;
rpc.request.requestName(/* ... */);
rpc.send.messageName(/* ... */);
```

## <a name='Recipes'></a>Recipes

Below are some common examples to help you get started with RPC Anywhere.

### <a name='ClientserverRPC'></a>Client/server RPC

```ts
// server.ts
const requestHandler = createRPCRequestHandler({
  hello(name: string) {
    return `Hello, ${name}!`;
  },
});

export type ServerSchema = RPCSchema<void, typeof requestHandler>;

const rpc = createServerRPC<ServerSchema>({
  // ...
  requestHandler,
});

// client.ts
import { type ServerSchema } from "./server.js";

const rpc = createClientRPC<ServerSchema>(/* ... */).proxy.request;
const response = await rpc.hello("world");
console.log(response); // Hello, world!
```

### <a name='SymmetricalRPC'></a>Symmetrical RPC

```ts
// schema.ts
type SymmetricalSchema = RPCSchema<{
  requests: {
    hello: {
      params: { name: string };
      response: string;
    };
  };
  messages: {
    goodbye: void;
  };
}>;

// rpc-a.ts
const rpcA = createRPC<SymmetricalSchema>(/* ... */);
rpcA.addMessageListener("goodbye", () => {
  console.log("Goodbye!");
});

// rpc-b.ts
const rpcB = createRPC<SymmetricalSchema>(/* ... */);
const response = await rpcB.request.hello({ name: "world" });
console.log(response); // Hello, world!
rpcB.send.goodbye();
```

---

<div align="left">

[**Previous: Documentation index**](./README.md)

</div>
<div align="right">

[**Next: Built-in transports**](./2-built-in-transports.md)

</div>
