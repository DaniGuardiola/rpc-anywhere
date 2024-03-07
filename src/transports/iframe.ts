import {
  createTransportFromMessagePort,
  type RPCMessagePortTransportOptions,
} from "../index.js";

const IFRAME_MSG_KEY = "[iframe-transport]";
const IFRAME_READY_MSG = "[iframe-transport-ready]";

async function waitForLoad(element: HTMLElement) {
  const readyState = (element as HTMLIFrameElement).contentDocument?.readyState;
  const location = (element as HTMLIFrameElement).contentWindow?.location.href;
  return location !== "about:blank" && readyState === "complete"
    ? Promise.resolve()
    : new Promise((resolve) => element.addEventListener("load", resolve));
}

async function portReadyPromise(port: MessagePort) {
  return new Promise<void>((resolve) => {
    port.addEventListener("message", function ready(event) {
      if (event.data === IFRAME_READY_MSG) {
        port.removeEventListener("message", ready);
        resolve();
      }
    });
  });
}

/**
 * Options for the iframe transport.
 */
export type RPCIframeTransportOptions = Omit<
  RPCMessagePortTransportOptions,
  "transportId" | "remotePort"
> & {
  /**
   * An identifier for the transport. This is used to match the iframe with
   * the parent window. If not set, a default value will be used when establishing
   * the connection.
   */
  transportId?: string | number;

  /**
   * The target origin of the iframe. This is used to restrict the domains
   * that can communicate with the iframe. If not set, the iframe will accept
   * messages from any origin. [Learn more about `targetOrigin` on MDN.](
   * https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#targetorigin)
   *
   * @default "*"
   */
  targetOrigin?: string;
};

/**
 * Creates a transport to communicate with an iframe. This is an asynchronous
 * process because it requires waiting for the iframe to load and signal that
 * it's ready to receive messages.
 *
 * The target iframe must use `createIframeParentTransport` with a matching
 * `transportId` or `filter` option (if set).
 *
 * Uses `MessageChannel` under the hood. [Learn more about the Channel Messaging
 * API on MDN.](https://developer.mozilla.org/en-US/docs/Web/API/Channel_Messaging_API/Using_channel_messaging)
 *
 * Using the `transportId` option is recommended to
 * avoid conflicts with other connections. If security is a concern, the
 * `targetOrigin` option should be set to the expected origin of the iframe.
 * [Learn more about `targetOrigin` on MDN.](
 * https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#targetorigin).
 *
 * @example
 *
 * ```ts
 * const rpc = createRPC<ParentSchema, IframeSchema>({
 *   transport: await createIframeTransport(iframeElement, {
 *     transportId: "my-iframe"
 *   }),
 *   // ...
 * });
 * ```
 *
 */
export async function createIframeTransport(
  /**
   * The iframe element to communicate with.
   */
  iframe: HTMLIFrameElement,
  /**
   * Options for the iframe transport.
   */
  options: RPCIframeTransportOptions = {},
) {
  const channel = new MessageChannel();
  const { port1, port2 } = channel;
  port1.start();
  const transport = createTransportFromMessagePort(port1, options);
  const readyPromise = portReadyPromise(port1);
  await waitForLoad(iframe);
  if (!iframe.contentWindow) throw new Error("Unexpected iframe state");
  iframe.contentWindow.postMessage(
    { [IFRAME_MSG_KEY]: options.transportId ?? "default" },
    options.targetOrigin ?? "*",
    [port2],
  );
  await readyPromise;
  return transport;
}

async function waitForInit(id: string | number) {
  return new Promise<MessagePort>((resolve) => {
    window.addEventListener("message", function init(event) {
      const { data, ports } = event;
      if (data[IFRAME_MSG_KEY] === id) {
        const [port] = ports;
        window.removeEventListener("message", init);
        resolve(port);
      }
    });
  });
}

/**
 * Options for the iframe parent transport.
 */
export type RPCIframeParentTransportOptions = Omit<
  RPCMessagePortTransportOptions,
  "transportId" | "remotePort"
> & {
  /**
   * An identifier for the transport. This is used to match the iframe with
   * the parent window. If not set, a default value will be used when establishing
   * the connection.
   */
  transportId?: string | number;
};

/**
 * Creates a transport to communicate with the parent window from an iframe. This
 * is an asynchronous process because it requires waiting for the parent window
 * to connect to the iframe.
 *
 * The parent window must use `createIframeTransport` with a matching
 * `transportId` or `filter` option (if set).
 *
 * Using the `transportId` option is recommended to avoid conflicts with other
 * connections.
 *
 * @example
 *
 * ```ts
 * const rpc = createRPC<IframeSchema, ParentSchema>({
 *   transport: await createIframeParentTransport({ transportId: "my-iframe" }),
 *   // ...
 * });
 * ```
 */
export async function createIframeParentTransport(
  options: RPCIframeParentTransportOptions = {},
) {
  const port = await waitForInit(options.transportId ?? "default");
  port.start();
  port.postMessage(IFRAME_READY_MSG);
  return createTransportFromMessagePort(port, options);
}

// TODO: iframe transport tests.
