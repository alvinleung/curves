import { subscribeOnMessages } from "react-figma";

figma.showUI(__html__);
figma.ui.resize(800, 400);

// this correct, but somehow the template doesn't recognise the "on" method under figma
// @ts-ignore
figma.on("selectionchange", () => {
  const selected = figma.currentPage.selection[0] as GeometryMixin;
  setImageSelection(selected);
});

let currentEditingImageBytes: Uint8Array;
let currentSelectedNode: GeometryMixin;
figma.ui.onmessage = async (message) => {
  subscribeOnMessages(message);

  // get message from the plugin ui
  if (message.type === "create-instance") {
    // const component = figma.root.findOne(
    //   (node) => node.id === message.id
    // ) as ComponentNode;
    // component.createInstance();
  }

  switch (message.type) {
    case "image-bytes-update":
      if (!currentSelectedNode) return;

      const newBytes = message.bytes;
      const paint = currentSelectedNode.fills[0];

      const newPaint = JSON.parse(JSON.stringify(paint));
      newPaint.imageHash = figma.createImage(newBytes).hash;

      currentSelectedNode.fills = [newPaint];
      break;
  }
};

function selectImage(imageBytes: Uint8Array, node: GeometryMixin) {
  currentEditingImageBytes = imageBytes;
  currentSelectedNode = node;
  figma.ui.postMessage({
    type: "select-image",
    bytes: imageBytes,
  });
}
function deselectImage() {
  currentEditingImageBytes = null;
  currentSelectedNode = null;
  figma.ui.postMessage({ type: "deselect-image" });
}

async function setImageSelection(node: GeometryMixin) {
  if (!node) {
    deselectImage();
    return;
  }

  const newFills = [];
  for (const paint of node.fills as readonly Paint[]) {
    if (paint.type === "IMAGE") {
      // Get the (encoded) bytes for this image.
      const image = figma.getImageByHash(paint.imageHash);
      const bytes = await image.getBytesAsync();

      selectImage(bytes, node);

      // Create an invisible iframe to act as a "worker" which
      // will do the task of decoding and send us a message
      // when it's done.
      // figma.showUI(__html__, { visible: false });

      // currentEditingImageBytes = bytes;

      // Send the raw bytes of the file to the worker.
      // figma.ui.postMessage({ type: "select-image" });

      // Wait for the worker's response.
      // const newBytes = await new Promise((resolve, reject) => {
      //   figma.ui.onmessage = (value) => resolve(value);
      // });

      // Create a new paint for the new image.
      // const newPaint = JSON.parse(JSON.stringify(paint));
      // newPaint.imageHash = figma.createImage(newBytes).hash;
      // newFills.push(newPaint);
    }
  }
  // node.fills = newFills;
}
