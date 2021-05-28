import * as React from "react";
import { ControlPoint, Point } from "./components/ControlPoint";
import Spline from "cubic-spline-ts";
import { useCanvas } from "./hooks/useCanvas";
import { useMeasurement } from "./hooks/useMeasurement";
import {
  applyToneCurve,
  createDecodingCanvas,
  createImageFromByte,
  decode,
} from "./ImageManipulation";
import { getRelativeMousePosition } from "./hooks/relativeMousePos";
import { useImagePreivew } from "./hooks/useImagePreview";
import { ChannelCurveEditor } from "./components/ChannelCurveEditor";

type ComponentItemType = {
  id: string;
  name: string;
};

enum Channel {
  RED,
  GREEN,
  BLUE,
  LUMINANCE,
}

export const App = () => {
  const [isSelectedImage, setIsSelectedImage] = React.useState(false);
  const [imageBytes, setImageBytes] = React.useState<Uint8Array>();

  const [previewCanvasRef, regl, toneCurveRef, changeImage] = useImagePreivew();
  const [curveColor, setCurveColor] = React.useState("#555");
  const [selectedChannel, setSelectedChannel] = React.useState(
    Channel.LUMINANCE
  );

  React.useEffect(() => {
    onmessage = (event) => {
      if (!event.data.pluginMessage) return;

      switch (event.data.pluginMessage.type) {
        case "select-image":
          setIsSelectedImage(true);
          const imageBytes = event.data.pluginMessage.bytes;
          setImageBytes(imageBytes);

          createImageFromByte(imageBytes).then((image) => {
            changeImage(image);
          });

          // const canvas = createDecodingCanvas();
          // decode(canvas.canvas, canvas.context, imageBytes).then((value) => {
          //   imageRef.current = createImageFromByte(value);
          // });
          // imageRef.current =

          break;
        case "deselect-image":
          setIsSelectedImage(false);
          break;
      }
    };
  }, []);

  const updateImageBytesWithCruve = async (toneCurve: Spline) => {
    // set luminance by default first
    toneCurveRef.current.luminance = toneCurve;
    toneCurveRef.current.red = toneCurve;
    toneCurveRef.current.green = toneCurve;
    toneCurveRef.current.blue = toneCurve;
    // const newBytes = applyToneCurve(
    //   ctx.getImageData(0, 0, canvas.width, canvas.height),
    //   toneCurve
    // );
    // send the new byte to client
    // parent.postMessage(
    //   { pluginMessage: { type: "image-bytes-update", bytes: newBytes } },
    //   "*"
    // );
    // adjustedImageData.current = newBytes;
    // draw the update image onto the canvas
  };

  const handleToneCurveChange = (newCurve: Spline) => {
    updateImageBytesWithCruve(newCurve);
  };

  const create = (id: string) => {
    // deliver message to the figma plugin instance
    // parent.postMessage({ pluginMessage: { type: "create-instance", id } }, "*");
  };

  // return <div>{isSelectedImage && "Image"}</div>;

  const [containerRef, { width, height }] = useMeasurement<HTMLDivElement>();
  const panelWidth = width;
  const panelHeight = height;

  return (
    <div className="layout-grid">
      <div>
        <canvas
          width={window.innerWidth}
          height={window.innerHeight}
          ref={previewCanvasRef}
          className={"image-preivew"}
        />
      </div>
      <div className="controls-container">
        <ChannelCurveEditor
          containerRef={containerRef}
          width={panelWidth}
          height={panelHeight}
          isActive={isSelectedImage}
          onChange={handleToneCurveChange}
          curveColor={curveColor}
        />
      </div>
    </div>
  );
};
