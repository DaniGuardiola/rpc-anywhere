<div align="center">
  <img alt="The RPC Anywhere logo" src="https://github.com/DaniGuardiola/rpc-anywhere/raw/main/logo.png">
</div>
<div align="center">

[![API reference](https://img.shields.io/badge/tsdocs-%23007EC6?style=flat&logo=typescript&logoColor=%23fff&label=API%20reference&labelColor=%23555555)](https://tsdocs.dev/docs/rpc-anywhere/) [![Bundle size](https://deno.bundlejs.com/?q=rpc-anywhere%40latest&treeshake=%5B%7B+RPC+%7D%5D&badge=detailed&badge-style=flat&badge-raster=false)](https://bundlejs.com/?q=rpc-anywhere%40latest&treeshake=%5B%7B+RPC+%7D%5D)

</div>

Create a type-safe RPC anywhere.

```bash
npm i rpc-anywhere
```

---

RPC Anywhere lets you create RPCs in **any** context, as long as you can provide the transport layer. In other words: a way for messages to get from point A to point B and vice-versa.

It also ships with a few transports out of the box for common use cases.

<details>
<summary><b>What is an RPC?</b></summary>

> In the context of this library, an RPC is a connection between two endpoints, which send messages to each other.
>
> If the sender expects a response, it's called a "request". A request is similar to a function call where the function is executed on the other side of the connection, and the result is sent back to the sender.
>
> [Learn more about the general concept of RPCs on Wikipedia.](https://www.wikiwand.com/en/Remote_procedure_call)

</details>

<details>
<summary><b>What is a transport layer?</b></summary>

> A transport layer is the "channel" through which messages are sent and received between point A and point B. Some very common examples of endpoints:
>
> - Websites: iframes, service workers...
> - Browser extensions: content scripts, service workers...
> - Tabs: `localStorage` events, `BroadcastChannel`...
> - Electron: `ipcRenderer`, `ipcMain`...

</details>

<details>
<summary><b>Why should I use RPC Anywhere?</b></summary>

> While there are some really great RPC libraries out there, many of them are focused in a specific use-case, and come with trade-offs like being tied to a specific transport layer, very opinionated, very simple, or not type-safe.
>
> Because of this, many people end up creating their own RPC implementations, "reinventing the wheel" over and over again. [In a Twitter poll, over 75% of respondents said they had done it at some point.](https://x.com/daniguardio_la/status/1735854964574937483?s=20) You've probably done it too!
>
> By contrast, RPC Anywhere is designed to be the last RPC library you'll ever need. The features of a specific RPC (schema, requests, messages, etc.) are completely decoupled from the transport layer, so you can set it up and forget about it.
>
> In fact, you can replace the transport layer at any time, and the RPC will keep working exactly the same way (except that messages will travel through different means).
>
> RPC Anywhere manages to be flexible and simple without sacrificing robust type safety or ergonomics. It's also well-tested and packs a lot of features in a very small footprint.
>
> If you're missing a feature, feel free to [file a feature request](https://github.com/DaniGuardiola/rpc-anywhere/issues/new?assignees=&labels=enhancement&projects=&template=feature-request.yaml)! The goal is to make RPC Anywhere the best RPC library out there.

</details>

## <a name='Contents'></a>Contents

<!-- vscode-markdown-toc -->

- [Contents](#contents)
- [Features](#features)
- [Getting started](#getting-started)
  - [Schemas](#schemas)
  - [RPC instances](#rpc-instances)
  - [Messages](#messages)
  - [Requests](#requests)
- [Documentation](#documentation)
  - [RPC schemas](#rpc-schemas)
  - [Transports](#transports)
  - [Built-in transports](#built-in-transports)
    - [Iframes, service workers, broadcast channels... (message ports)](#iframes-service-workers-broadcast-channels-message-ports)
    - [Web extensions transport](#web-extensions-transport)
  - [Transport bridges](#transport-bridges)
  - [Requests](#requests-1)
    - [Making requests](#making-requests)
    - [The request proxy API](#the-request-proxy-api)
    - [Request timeout](#request-timeout)
    - [Handling requests](#handling-requests)
    - [Schema type from request handler](#schema-type-from-request-handler)
  - [Messages](#messages-1)
    - [Sending messages](#sending-messages)
    - [Listening for messages](#listening-for-messages)
- [Type safety features](#type-safety-features)
- [Features under consideration](#features-under-consideration)
- [Prior art](#prior-art)

<!-- vscode-markdown-toc-config
	numbering=false
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->

## <a name='Features'></a>Features

- Type-safe and well-tested.
- Transport agnostic.
- Flexible (no enforced client-server architecture).
- Promise-based with optional proxy API (`rpc.requestProxy.methodName(params)`).
- Infers schema type from request handler.
- Lazy transport initialization (e.g. `rpc.setTransport(transport)`)
- Ready-to-use transports:
  - Message ports: `window`, iframes, workers, broadcast channels, etc.
  - Web extensions: content scripts <-> service worker.

**This package is ESM-only at the moment.** File an issue if this is problem for you.

## <a name='Gettingstarted'></a>Getting started

An RPC is a connection between two endpoints. In this connection, messages are exchanged in two ways:

- **Requests:** messages sent expecting a response.
- **Messages:** messages sent without expecting a response.

RPC Anywhere is completely flexible, so there is no "server" or "client" in the traditional sense. Both endpoints can send or receive requests, responses and messages.

Let's go through an example.

### <a name='Schemas'></a>Schemas

First, we define the requests and messages supported by each endpoint:

```ts
import { type RPCSchema } from "rpc-anywhere";

type ChefSchema = RPCSchema<{
  requests: {
    cook: {
      params: { recipe: Recipe };
      response: Dish;
    };
  };
  messages: {
    kitchenOpened: void;
    kitchenClosed: { reason: string };
  };
}>;

type WorkerSchema = RPCSchema<{
  requests: {
    getIngredients: {
      params: { neededIngredients: IngredientList };
      response: Ingredient[];
    };
  };
  messages: {
    shiftStarted: void;
    shiftEnded: void;
    takingABreak: { reason: string; duration: number };
  };
}>;
```

### <a name='RPCinstances'></a>RPC instances

Then, we create each RPC instance:

```ts
import { createRPC } from "rpc-anywhere";

// chef-rpc.ts
const chefRpc = createRPC<ChefSchema, WorkerSchema>({
  transport: {
    send: (message) => sendToWorker(message),
    registerHandler: (handler) => onWorkerMessage(handler),
});

// worker-rpc.ts
const workerRpc = createRPC<WorkerSchema, ChefSchema>({
  transport: {
    send: (message) => sendToChef(message),
    registerHandler: (handler) => onChefMessage(handler),
});
```

Schema types are passed as type parameters to `RPC`. Note how the first one is the schema of the RPC being created, and the second one is the schema of the RPC on the other endpoint (a.k.a. the "remote" schema). This is why the order of the type parameters in the example is different for each endpoint.

RPC Anywhere is transport-agnostic: you need to "teach" it how to communicate by giving it ways to send and listen for messages for the other endpoint. A common real-world example is communicating with an iframe through `iframeWindow.postMessage()` and `window.addEventListener('message', handler)`.

### <a name='Messages'></a>Messages

Here's how the chef RPC could listen for incoming messages from the worker RPC:

```ts
// chef-rpc.ts
chefRpc.addMessageListener("takingABreak", ({ duration, reason }) => {
  console.log(
    `The worker is taking a break for ${duration} minutes: ${reason}`,
  );
});
```

The worker can then send a message to the chef:

```ts
// worker-rpc.ts
workerRpc.send("takingABreak", { duration: 30, reason: "lunch" });
```

When the chef receives the message, the listener will be called, and the following will be logged:

```
The worker is taking a break for 30 minutes: lunch
```

### <a name='Requests'></a>Requests

To handle incoming requests, we need to define a request handler:

```ts
// chef-rpc.ts
const chefRpc = createRPC<ChefSchema, WorkerSchema>({
  // ...
  requestHandler: {
    cook({ recipe }) {
      return cook(recipe, availableIngredients);
    },
  },
});
// ...
```

Now the chef RPC can respond to `cook` requests. Request handlers can be written in this "object" format or as a function (`requestHandler(method, params): response`). All functions that handle requests can be synchronous or asynchronous.

To make a request, there are two main options:

```ts
// worker-rpc.ts

// using ".request()"
const dish = await workerRpc.request("cook", { recipe: "pizza" });
// using the request proxy API
const dish = await workerRpc.requestProxy.cook({ recipe: "pizza" });
```

Both are functionally equivalent.

> **Note:** requests can fail for various reasons, like an execution error, a missing method handler, or a timeout. Make sure to handle errors appropriately when making requests.

## <a name='Documentation'></a>Documentation

### <a name='RPCschemas'></a>RPC schemas

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

### <a name='Transports'></a>Transports

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

### <a name='Built-intransports'></a>Built-in transports

RPC Anywhere ships with a few built-in ways to create transports for common use cases.

For example, a transport for web extensions (content scripts <-> service worker) can be created with `createTransportFromBrowserRuntimePort`. As the name implies, it uses a `Browser.Runtime.Port` object to send and receive messages. You can see a full example below.

A full list of built-in transports can be found below.

#### <a name='Iframesserviceworkersbroadcastchannels...messageports'></a>Iframes, service workers, broadcast channels... (message ports)

TODO: section.

#### <a name='Webextensionstransport'></a>Web extensions transport

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

### <a name='Transportbridges'></a>Transport bridges

TODO: section.

### <a name='Requests-1'></a>Requests

#### <a name='Makingrequests'></a>Making requests

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

#### <a name='TherequestproxyAPI'></a>The request proxy API

Alternatively, you can use the request proxy API:

```ts
const response = await rpc.requestProxy.requestName({
  /* request parameters */
});
```

#### <a name='Requesttimeout'></a>Request timeout

If a request takes too long to complete, it will time out and be rejected with an error. The default request timeout is 1000 milliseconds. You can change it by passing a `maxRequestTime` option to the `RPC` constructor:

```ts
const rpc = createRPC<Schema>({
  // ...
  maxRequestTime: 5000,
});
```

To disable the timeout, pass `Infinity`. Be careful with this, as it can lead to requests hanging indefinitely.

#### <a name='Handlingrequests'></a>Handling requests

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

#### <a name='Schematypefromrequesthandler'></a>Schema type from request handler

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

### <a name='Messages-1'></a>Messages

#### <a name='Sendingmessages'></a>Sending messages

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

#### <a name='Listeningformessages'></a>Listening for messages

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

## <a name='Typesafetyfeatures'></a>Type safety features

TODO: section.

## <a name='Featuresunderconsideration'></a>Features under consideration

- Improved type-safety in general handlers, i.e. the function form of request handlers, the fallback request handler, and the wildcard message handler. Thoughts:
  - Likely possible to allow type discrimination by passing an object instead of separate parameters.
  - Is it possible to provide type safety for the return value at all?
  - In the fallback handler, is it possible to "filter out" the already declared methods?
- A mechanism to wait for connections (e.g. the loading of an iframe) before being able to use a transport. To make this type safe with nice inference, [partial type argument inference](https://github.com/microsoft/TypeScript/issues/26242) would be nice.
- [File a feature request!](https://github.com/DaniGuardiola/rpc-anywhere/issues/new?assignees=&labels=enhancement&projects=&template=feature-request.yaml)

## <a name='Priorart'></a>Prior art

RPC Anywhere is inspired by JSON-RPC, with a few small differences. For example, the concept of "messages" in RPC Anywhere resembles "notifications" in JSON-RPC. Some implementation details (like using an `id` property in requests and responses) are also similar.
