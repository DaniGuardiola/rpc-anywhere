<div align="center">
  <img alt="The RPC Anywhere logo" src="https://github.com/DaniGuardiola/rpc-anywhere/raw/main/logo.png">
</div>
<br/>
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

Read the documentation:

- [RPC](./docs/1-rpc.md)
- [Built-in transports](./docs/2-built-in-transports.md)
- [Bridging transports](./docs/3-built-in-transports.md)
- [Creating a custom transport](./docs/4-creating-a-custom-transport.md)

The API reference is available at [tsdocs.dev](https://tsdocs.dev/docs/rpc-anywhere/).

## <a name='Typesafetyfeatures'></a>Type safety features

TODO: section.

## <a name='Featuresunderconsideration'></a>Features under consideration

- Improved type-safety in general handlers, i.e. the function form of request handlers, the fallback request handler, and the wildcard message handler. Thoughts:
  - Likely possible to allow type discrimination by passing an object instead of separate parameters.
  - Is it possible to provide type safety for the return value at all?
  - In the fallback handler, is it possible to "filter out" the already declared methods?
- A mechanism to wait for connections (e.g. the loading of an iframe) before being able to use a transport. To make this type-safe with nice inference, [partial type argument inference](https://github.com/microsoft/TypeScript/issues/26242) would be nice.
- [File a feature request!](https://github.com/DaniGuardiola/rpc-anywhere/issues/new?assignees=&labels=enhancement&projects=&template=feature-request.yaml)

## <a name='Priorart'></a>Prior art

RPC Anywhere is inspired by JSON-RPC, with a few small differences. For example, the concept of "messages" in RPC Anywhere resembles "notifications" in JSON-RPC. Some implementation details (like using an `id` property in requests and responses) are also similar.
