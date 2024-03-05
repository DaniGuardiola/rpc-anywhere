<div align="center">
  <img alt="The RPC Anywhere logo" src="https://github.com/DaniGuardiola/rpc-anywhere/raw/main/logo.png">
</div>
<br/>
<div align="center">

[![API reference](https://img.shields.io/badge/tsdocs-%23007EC6?style=flat&logo=typescript&logoColor=%23fff&label=API%20reference&labelColor=%23555555)](https://tsdocs.dev/docs/rpc-anywhere/) [![Bundle size](https://deno.bundlejs.com/?q=rpc-anywhere%40latest&treeshake=%5B%7B+createRPC+%7D%5D&badge=&badge-style=flat&badge-raster=false)](https://bundlejs.com/?q=rpc-anywhere%40latest&treeshake=%5B%7B+createRPC+%7D%5D)

</div>

Create a type-safe RPC anywhere.

> RPC Anywhere powers [Electrobun](https://www.electrobun.dev/), [Teampilot AI](https://teampilot.ai/), and more.

```bash
npm i rpc-anywhere
```

[✨ Interactive iframe demo ✨](https://rpc-anywhere.dio.la/)

---

RPC Anywhere lets you create RPCs in **any** context, as long as a transport layer (a way for messages to move between point A and point B) is provided.

Designed to be the last RPC library you'll ever need, it ships with a few transports out of the box: iframes, Electron IPC, browser extensions, workers...

<details>
<summary><b>What is an RPC?</b></summary>

> In the context of this library, an RPC is a connection between two endpoints, which send messages to each other.
>
> If the sender expects a response, it's called a "request". A request can be thought of as a function call where the function is executed on the other side of the connection, and the result is sent back to the sender.
>
> [Learn more about the general concept of RPCs on Wikipedia.](https://www.wikiwand.com/en/Remote_procedure_call)

</details>

<details>
<summary><b>What is a transport layer?</b></summary>

> A transport layer is the "channel" through which messages are sent and received between point A and point B. Some very common examples of endpoints:
>
> - Websites: iframes, workers, `BroadcastChannel`.
> - Browser extensions: content script ↔ service worker.
> - Electron: renderer process ↔ main process.
> - WebSocket.

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
> RPC Anywhere manages to be flexible and simple without sacrificing robust type safety or ergonomics. It's also well-tested and packs a lot of features in a very small footprint (~1kb gzipped).
>
> If you're missing a feature, feel free to [file a feature request](https://github.com/DaniGuardiola/rpc-anywhere/issues/new?assignees=&labels=enhancement&projects=&template=feature-request.yaml)! The goal is to make RPC Anywhere the best RPC library out there.

</details>

---

<!-- vscode-markdown-toc -->

- [Features](#features)
- [Usage example (parent window to iframe)](#usage-example-parent-window-to-iframe)
  - [Iframe script (`iframe.ts`)](#iframe-script-iframets)
  - [Parent window script (`parent.ts`)](#parent-window-script-parentts)
- [Getting started](#getting-started)
  - [Schemas](#schemas)
  - [RPC instances](#rpc-instances)
  - [Messages](#messages)
  - [Requests](#requests)
- [Documentation](#documentation)
- [Type safety and features](#type-safety-and-features)
- [Features under consideration](#features-under-consideration)
- [Prior art](#prior-art)
- [Contributing](#contributing)

<!-- vscode-markdown-toc-config
	numbering=false
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->

---

## <a name='Features'></a>Features

- Type-safe and extensively tested.
- Transport agnostic, with ready-to-use transports:
  - Iframes.
  - Web workers.
  - Browser extensions.
  - Electron IPC (coming soon).
  - Broadcast channels.
  - Message ports: advanced use cases like service workers, worklets, etc.
- Tiny (~1.4kb gzipped, transport included).
- Flexible (no enforced client-server architecture).
- Promise-based with optional proxy APIs (e.g. `rpc.requestName(params)`).
- Schema type can be inferred from the request handlers.
- Optional lazy initialization (e.g. `rpc.setTransport(transport)`).

## <a name='Usageexampleparentwindowtoiframe'></a>Usage example (parent window to iframe)

This is a simplified example of an RPC connection between a parent window and an iframe.

### <a name='Iframescriptiframe.ts'></a>Iframe script (`iframe.ts`)

```ts
import {
  createIframeParentTransport,
  createRPC,
  createRPCRequestHandler,
  type RPCSchema,
} from "rpc-anywhere";

// import the parent's (remote) schema
import { type ParentSchema } from "./parent.js";

// handle incoming requests from the parent
const requestHandler = createRPCRequestHandler({
  /** Greet a given target. */
  greet: ({
    name,
  }: {
    /** The target of the greeting. */
    name: string;
  }) => `Hello, ${name}!`, // respond to the parent
});

// create the iframe's schema
export type IframeSchema = RPCSchema<
  {
    messages: {
      buttonClicked: {
        /** The button that was clicked. */
        button: string;
      };
    };
  },
  // request types can be inferred from the handler
  typeof requestHandler
>;

async function main() {
  // create the iframe's RPC
  const rpc = createRPC<IframeSchema, ParentSchema>({
    // wait for a connection with the parent window and
    // pass the transport to our RPC
    transport: await createIframeParentTransport({ id: "my-rpc" }),
    // provide the request handler
    requestHandler,
  });

  // send a message to the parent
  blueButton.addEventListener("click", () => {
    rpc.send.buttonClicked({ button: "blue" });
  });

  // listen for messages from the iframe
  rpc.addMessageListener("userLoggedIn", ({ name }) => {
    console.log(`The user "${name}" logged in`);
  });
}

main();
```

### <a name='Parentwindowscriptparent.ts'></a>Parent window script (`parent.ts`)

```ts
import { createIframeTransport, createRPC, type RPCSchema } from "rpc-anywhere";

// import the iframe's (remote) schema
import { type IframeSchema } from "./iframe.js";

// create the parent window's schema
export type ParentSchema = RPCSchema<{
  messages: {
    userLoggedIn: {
      /** The user's name. */
      name: string;
    };
  };
}>;

async function main() {
  // create the parent window's RPC
  const rpc = createRPC<ParentSchema, IframeSchema>({
    // wait for a connection with the iframe and
    // pass the transport to our RPC
    transport: await createIframeTransport(
      document.getElementById("my-iframe"),
      { id: "my-rpc" },
    ),
  });

  // use the proxy API as an alias ✨
  const iframe = rpc.proxy;

  // make a request to the iframe
  const greeting = await iframe.request.greet({ name: "world" });
  console.log(greeting); // Hello, world!

  // send a message to the iframe
  onUserLoggedIn((user) => iframe.send.userLoggedIn({ name: user.name }));

  // listen for messages from the iframe
  rpc.addMessageListener("buttonClicked", ({ button }) => {
    console.log(`The button "${button}" was clicked`);
  });
}

main();
```

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

type ManagerSchema = RPCSchema<{
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
const chefRpc = createRPC<ChefSchema, ManagerSchema>({
  transport: createRestaurantTransport(),
});

// manager-rpc.ts
const managerRpc = createRPC<ManagerSchema, ChefSchema>({
  transport: createRestaurantTransport(),
});
```

Schema types are passed as type parameters to `createRPC`. The first one is the local schema, while the second one is the schema of the other endpoint (the "remote" schema).

RPC Anywhere is transport-agnostic: you need to specify it. A transport provides the means to send and listen for messages to and from the other endpoint. A common real-world example is communicating with an iframe through `window.postMessage(message)` and `window.addEventListener('message', handler)`.

You can use [a built-in transport](./docs/2-built-in-transports.md), or [create your own](./docs/4-creating-a-custom-transport.md).

### <a name='Messages'></a>Messages

Here's how the chef could listen for incoming messages from the manager:

```ts
// chef-rpc.ts
chefRpc.addMessageListener("takingABreak", ({ duration, reason }) => {
  console.log(
    `The manager is taking a break for ${duration} minutes: ${reason}`,
  );
});
```

The manager can then send a message to the chef:

```ts
// manager-rpc.ts
managerRpc.send.takingABreak({ duration: 30, reason: "lunch" });
```

When the chef receives the message, the listener will be called, and the following will be logged:

```
The manager is taking a break for 30 minutes: lunch
```

### <a name='Requests'></a>Requests

To handle incoming requests, we need to define a request handler:

```ts
// chef-rpc.ts
const chefRpc = createRPC<ChefSchema, ManagerSchema>({
  // ...
  requestHandler: {
    cook({ recipe }) {
      return prepareDish(recipe, availableIngredients);
    },
  },
});
// ...
```

Now the chef RPC can respond to `cook` requests. Request handlers can be written in this "object" format or as a function (`requestHandler(method, params): response`). All functions that handle requests can be synchronous or asynchronous.

To make a request, there are two main options:

```ts
// manager-rpc.ts

// using ".request()"
const dish = await managerRpc.request("cook", { recipe: "pizza" });
// using the request proxy API
const dish = await managerRpc.request.cook({ recipe: "pizza" });
```

Both are functionally equivalent.

> **Note:** requests can fail for various reasons, like an execution error, a missing method handler, or a timeout. Make sure to handle errors appropriately when making requests.

## <a name='Documentation'></a>Documentation

The documentation contains important details that are skipped or overly simplified in the examples above!

Start with [RPC](./docs/1-rpc.md), then read about your transport of choice on the [Built-in transports](./docs/2-built-in-transports.md) page.

- [RPC](./docs/1-rpc.md)
- [Built-in transports](./docs/2-built-in-transports.md)
- [Bridging transports](./docs/3-bridging-transports.md)
- [Creating a custom transport](./docs/4-creating-a-custom-transport.md)

The API reference is available at [tsdocs.dev](https://tsdocs.dev/docs/rpc-anywhere/).

**This package is published as both ESM and CommonJS.**

## <a name='Typesafetyandfeatures'></a>Type safety and features

RPC Anywhere is designed to be as type-safe as possible while maintaining great ergonomics and flexibility. Here are some examples:

- When making requests and sending messages, all data is strictly typed based on the schema types including request parameters, response data and message contents.
- Similarly, all data involved in handling requests and listening to messages is strictly typed. For example, you can't return the wrong response from a request handler.
- Most times, you'll get autocomplete suggestions in your IDE, like request or message names.
- The proxy APIs for requests and messages are fully typed as well based on the schema types. This means you can't call a request or send a message that doesn't exist, or with the wrong data types.

This library goes to even greater lengths to ensure a smooth developer experience, for example:

- It is possible to infer the request schema types from the runtime request handlers, which prevents duplication by having a single source of truth.
- The features of an RPC instance are constrained based on the schema types. For example, if the remote schema doesn't declare any requests, the `request` method won't be available in the first place. Similarly, if the local schema doesn't declare any requests, you can't set a request handler or customize the maximum request time. This affects almost all of the methods and options!

Besides these, many other minor type-related details make RPC Anywhere extremely type-safe and a joy to work with.

## <a name='Featuresunderconsideration'></a>Features under consideration

If you need any of these, please [file a feature request](https://github.com/DaniGuardiola/rpc-anywhere/issues/new?assignees=&labels=enhancement&projects=&template=feature-request.yaml) or upvote an existing one! 😄

- Transport: Electron ipcMain/ipcRenderer.
- Transport: WebSockets.
- Transport: service workers (this is already possible through the message port transport, but it's a low-level API).
- Transport: WebRTC.
- Transport: HTTP(S) requests.
- Transport: UDP.
- Many-to-one or many-to-many connections.
- Improved type-safety in general handlers, i.e. the function form of request handlers, the fallback request handler, and the wildcard message handler.
- A simplified way to wait for connections to be established in any context, like across a chain of bridged transports.
- Runtime validation support (e.g. through zod or valibot).
- Better error handling.
- Support for transferable objects in transports that support it (e.g. workers).
- Lite version with a much smaller footprint.
- [File a feature request!](https://github.com/DaniGuardiola/rpc-anywhere/issues/new?assignees=&labels=enhancement&projects=&template=feature-request.yaml)

## <a name='Priorart'></a>Prior art

RPC Anywhere is inspired by [JSON-RPC](https://www.jsonrpc.org/), with a few small differences.

For example, the concept of "messages" in RPC Anywhere resembles "notifications" in JSON-RPC. Some implementation details (like using an `id` property in requests and responses) are also similar.

A notable difference is that RPC Anywhere is completely flexible, while JSON-RPC is client-server oriented.

## <a name='Contributing'></a>Contributing

Contributions are welcome! Please make sure to create or update any tests as necessary when submitting a pull request.

The demo is useful for quick manual testing. To start it locally, run `bun demo` and open the local server's address in your browser (probably `localhost:8080`, check the console output). It will automatically reload when you make changes to the source code.

Before making big changes, consider opening a discussion first to get feedback and make sure the change is aligned with the project's goals.
