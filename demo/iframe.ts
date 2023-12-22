import {
  type _RPCPacket,
  createRPC,
  createRPCRequestHandler,
  createTransportFromMessagePort,
  type RPCSchema,
} from "../src/index.js"; // "rpc-anywhere"
// import the parent (remote) schema
import { type ParentSchema } from "./parent.js";

// grab some elements and prepare some stuff
const syncedInputEl = el<HTMLInputElement>("synced-input");
const coloredButtonEl = el("colored-button");
const storyButtonEl = el("story-button");
const storyResultEl = el("story-result");
const storyTitleEl = el("story-title");
const storyVillageNameEl = el<HTMLInputElement>("story-village-name-input");
const storyAnimalEl = el<HTMLInputElement>("story-animal-input");
const storyNameEl = el<HTMLInputElement>("story-name-input");
const storyActivityEl = el<HTMLInputElement>("story-activity-input");
const storyLandmarkEl = el<HTMLInputElement>("story-landmark-input");
const storyObjectEl = el<HTMLInputElement>("story-object-input");
const storySuperpowerEl = el<HTMLInputElement>("story-superpower-input");
const storyNewTitleEl = el<HTMLInputElement>("story-new-title-input");
const colors = ["red", "green", "blue", "purple"] as const;
type Color = (typeof colors)[number];

// request handler
const requestHandler = createRPCRequestHandler({
  /**
   * Get the current color of the button.
   */
  getColor: () => coloredButtonEl.dataset.color as Color,
});

// declare the iframe (local) schema
export type IframeSchema = RPCSchema<
  {
    messages: {
      /**
       * Sent when the iframe's RPC is ready.
       */
      ready: void;
      /**
       * Sent when the iframe's input is updated.
       */
      iframeInputUpdated: string;
    };
  },
  // infer request types from the request handler
  typeof requestHandler
>;

function waitForFrameParentLoad() {
  if (window.parent.document.readyState === "complete")
    return Promise.resolve();
  return new Promise((resolve) =>
    window.parent.addEventListener("load", resolve),
  );
}

// wait for the parent window to load
waitForFrameParentLoad().then(() => {
  console.log("[iframe] The parent has loaded!");

  // create the iframe's RPC
  const rpc = createRPC<IframeSchema, ParentSchema>({
    // provide the transport
    transport: createTransportFromMessagePort(window, window.parent, {
      // provide a unique ID that matches the parent
      transportId: "rpc-anywhere-demo",
    }),
    // provide the request handler
    requestHandler,
    // this is for demo purposes - you can ignore it
    _debugHooks: { onSend: _debugOnSend, onReceive: _debugOnReceive },
  });

  // use the proxy as an alias ✨
  const parent = rpc.proxy;

  // send the ready message
  parent.send.ready();

  // synced input
  syncedInputEl.addEventListener("input", () =>
    parent.send.iframeInputUpdated(syncedInputEl.value),
  );
  rpc.addMessageListener(
    "parentInputUpdated",
    (value) => (syncedInputEl.value = value),
  );

  // story time
  storyButtonEl.addEventListener("click", async () => {
    const { title } = await parent.request.createStory({
      villageName: storyVillageNameEl.value,
      animal: storyAnimalEl.value,
      name: storyNameEl.value,
      activity: storyActivityEl.value,
      landmark: storyLandmarkEl.value,
      object: storyObjectEl.value,
      superpower: storySuperpowerEl.value,
      newTitle: storyNewTitleEl.value,
    });
    storyResultEl.style.removeProperty("display");
    storyTitleEl.textContent = title;
  });
});

// non-demo stuff - you can ignore this :)
// ---------------------------------------

const colorToClass = {
  red: "bg-red-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
};
function updateButtonColor(color?: Color) {
  const currentColor = coloredButtonEl.dataset.color;
  const currentClass = colorToClass[currentColor as Color];
  const nextColor =
    color ??
    colors[(colors.indexOf(currentColor as Color) + 1) % colors.length];
  const nextClass = colorToClass[nextColor];
  coloredButtonEl.dataset.color = nextColor;
  coloredButtonEl.classList.remove(currentClass);
  coloredButtonEl.classList.add(nextClass);
}
coloredButtonEl.addEventListener("click", () => updateButtonColor());

function el<Element extends HTMLElement>(id: string) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Element with id ${id} not found`);
  return element as Element;
}

const iframeLogsEl = window.parent.document.querySelector("#iframe-logs")!;
function _debugOnSend(packet: _RPCPacket) {
  console.log("[iframe] sent", packet);
  (window.parent as any)._debugAppendMessage("send", iframeLogsEl, packet);
}
function _debugOnReceive(packet: _RPCPacket) {
  console.log("[iframe] received", packet);
  (window.parent as any)._debugAppendMessage("receive", iframeLogsEl, packet);
}
