import {
  type _RPCPacket,
  createRPC,
  createRPCRequestHandler,
  createTransportFromMessagePort,
  type RPCSchema,
} from "../src/index.js"; // "rpc-anywhere"
// import the iframe (remote) schema
import { type IframeSchema } from "./iframe.js";

// grab some elements
const iframeEl = el<HTMLIFrameElement>("iframe");
const syncedInputEl = el<HTMLInputElement>("synced-input");
const updateColoredButtonEl = el<HTMLButtonElement>("update-colored-button");

// request handler
const requestHandler = createRPCRequestHandler({
  /**
   * Create a story with the given details.
   */
  createStory: (storyDetails: StoryDetails) => {
    renderStory(storyDetails);
    const { name, newTitle, villageName } = storyDetails;
    return { title: `The Tale of ${name}, the ${newTitle} of ${villageName}` };
  },
});

// declare the parent (local) schema
export type ParentSchema = RPCSchema<
  {
    messages: {
      /**
       * Sent when the parent's input is updated.
       */
      parentInputUpdated: string;
    };
  },
  // infer request types from the request handler
  typeof requestHandler
>;

function waitForFrameLoad(frame: HTMLIFrameElement) {
  if (frame.contentWindow?.document.readyState === "complete")
    return Promise.resolve();
  return new Promise((resolve) =>
    window.parent.addEventListener("load", resolve),
  );
}

// wait for the iframe to load
waitForFrameLoad(iframeEl).then(() => {
  console.log("[parent] Parent loaded!");

  // create the parent's RPC
  const rpc = createRPC<ParentSchema, IframeSchema>({
    // provide the transport
    transport: createTransportFromMessagePort(window, iframeEl.contentWindow!, {
      // provide a unique ID that matches the iframe
      transportId: "rpc-anywhere-demo",
    }),
    // provide the request handler
    requestHandler,
    // this is for demo purposes - you can ignore it
    _debugHooks: { onSend: _debugOnSend, onReceive: _debugOnReceive },
  });

  // use the proxy as an alias ✨
  const iframe = rpc.proxy;

  // ready
  rpc.addMessageListener("ready", onIframeReady);

  // synced input
  syncedInputEl.addEventListener("input", () =>
    iframe.send.parentInputUpdated(syncedInputEl.value),
  );
  rpc.addMessageListener(
    "iframeInputUpdated",
    (value) => (syncedInputEl.value = value),
  );

  // colored button
  updateColoredButtonEl.addEventListener("click", async () => {
    const currentColor = await iframe.request.getColor();
    el("button-color").textContent = currentColor;
  });
});

type StoryDetails = {
  /** The name of the village where the story is set. */
  villageName: string;

  /** The type of animal the main character is. */
  animal: string;

  /** The name of the main character. */
  name: string;

  /** The main activity the character enjoys. */
  activity: string;

  /** A significant landmark in the village. */
  landmark: string;

  /** An object found by the main character that has special powers. */
  object: string;

  /** A special ability or power provided by the magical object. */
  superpower: string;

  /** The new title or status achieved by the main character at the end. */
  newTitle: string;
};

// non-demo stuff - you can ignore this :)
// ---------------------------------------

function el<Element extends HTMLElement>(id: string) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Element with id ${id} not found`);
  return element as Element;
}

function els<Element extends HTMLElement>(selector: string) {
  const elements = document.querySelectorAll(selector);
  if (elements.length === 0)
    throw new Error(`No elements found matching selector ${selector}`);
  return Array.from(elements) as Element[];
}

function onIframeReady() {
  el("ready").style.removeProperty("display"); // remove display: none
  el("loading").style.display = "none";
  el("controls").classList.remove("opacity-60", "pointer-events-none");
}

function updateIframeSize() {
  const size =
    iframeEl.contentWindow!.document.querySelector("#sizer")!.scrollHeight;
  iframeEl.style.height = `${size + 4}px`;
}

iframeEl.addEventListener("load", () => {
  updateIframeSize();
  window.addEventListener("resize", updateIframeSize);
});

function renderStory({
  villageName,
  animal,
  name,
  activity,
  landmark,
  object,
  superpower,
  newTitle,
}: StoryDetails) {
  els(".story-village-name").forEach((el) => (el.textContent = villageName));
  els(".story-animal").forEach((el) => (el.textContent = animal));
  els(".story-name").forEach((el) => (el.textContent = name));
  els(".story-activity").forEach((el) => (el.textContent = activity));
  els(".story-landmark").forEach((el) => (el.textContent = landmark));
  els(".story-object").forEach((el) => (el.textContent = object));
  els(".story-superpower").forEach((el) => (el.textContent = superpower));
  els(".story-new-title").forEach((el) => (el.textContent = newTitle));
  el("story").style.removeProperty("display");
  const storyEl = el<HTMLDivElement>("story");
  storyEl.style.removeProperty("display");
}

declare const jsonFormatHighlight: (data: any) => any;
const messageTemplate = el<HTMLTemplateElement>("message-template");
function _debugAppendMessage(
  type: "send" | "receive",
  logElement: HTMLElement,
  packet: _RPCPacket,
) {
  const msgEl = messageTemplate.content.firstElementChild!.cloneNode(
    true,
  ) as HTMLParagraphElement;
  const typeArrow = type === "send" ? "→" : "←";
  if (type === "receive") msgEl.classList.remove("bg-white/10");
  // time in HH:MM:SS
  const time = new Date().toLocaleTimeString("en-US").split(" ")[0];
  if (packet.type === "message") {
    msgEl.querySelector(".packet-meta")!.textContent =
      `${time} ${typeArrow} message: ${packet.id}`;
    msgEl.querySelector(".packet-payload")!.innerHTML = jsonFormatHighlight(
      packet.payload === undefined ? "&lt;no payload>" : packet.payload,
    );
  }
  if (packet.type === "request") {
    msgEl.querySelector(".packet-meta")!.textContent =
      `${time} ${typeArrow} request (${packet.id}): ${packet.method}`;
    msgEl.querySelector(".packet-payload")!.innerHTML = jsonFormatHighlight(
      packet.params === undefined ? "&lt;no params>" : packet.params,
    );
  }
  if (packet.type === "response") {
    msgEl.querySelector(".packet-meta")!.textContent =
      `${time} ${typeArrow} response (id: ${packet.id}): ${
        packet.success ? "✅" : "❌"
      }`;
    if (packet.success)
      msgEl.querySelector(".packet-payload")!.innerHTML = jsonFormatHighlight(
        packet.payload === undefined ? "&lt;no response>" : packet.payload,
      );
    else
      msgEl.querySelector(".packet-payload")!.innerHTML = jsonFormatHighlight(
        packet.error === undefined ? "&lt;no error>" : packet.error,
      );
  }
  const wasScrolledToBottom =
    Math.abs(
      logElement.scrollHeight - logElement.scrollTop - logElement.clientHeight,
    ) < 1;

  logElement.appendChild(msgEl);
  if (wasScrolledToBottom) logElement.scrollTop = logElement.scrollHeight;
}
(window as any)._debugAppendMessage = _debugAppendMessage;

const parentLogsEl = el<HTMLDivElement>("parent-logs");
const iframeLogsEl = el<HTMLDivElement>("iframe-logs");
const parentLogsClearEl = el<HTMLDivElement>("parent-logs-clear");
const iframeLogsClearEl = el<HTMLDivElement>("iframe-logs-clear");
function _debugOnSend(packet: _RPCPacket) {
  console.log("[parent] sent", packet);
  setTimeout(updateIframeSize, 100); // hack ¯\_(ツ)_/¯
  (window as any)._debugAppendMessage("send", parentLogsEl, packet);
}
function _debugOnReceive(packet: _RPCPacket) {
  console.log("[parent] received", packet);
  (window as any)._debugAppendMessage("receive", parentLogsEl, packet);
}
parentLogsClearEl.addEventListener(
  "click",
  () => (parentLogsEl.innerHTML = ""),
);
iframeLogsClearEl.addEventListener(
  "click",
  () => (iframeLogsEl.innerHTML = ""),
);
