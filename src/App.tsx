import * as React from "react";
import { ControlPoint, Point } from "./components/ControlPoint";
import Spline from "cubic-spline-ts";
import { useMeasurement } from "./hooks/useMeasurement";
import {
  applyToneCurve,
  createDecodingCanvas,
  createImageFromByte,
  decode,
} from "./ImageManipulation";
import { getRelativeMousePosition } from "./hooks/relativeMousePos";
import {
  EMPTY_SPLINE,
  ToneCurves,
  useImagePreivew,
} from "./hooks/useImagePreview";
import { ChannelCurveEditor } from "./components/ChannelCurveEditor";
import { ChannelToggle } from "./components/ChannelToggle";

type ComponentItemType = {
  id: string;
  name: string;
};

export enum Channel {
  RED = "red",
  GREEN = "green",
  BLUE = "blue",
  LUMINANCE = "luminance",
}

export interface ChannelsControlPoints {
  red: Point[];
  green: Point[];
  blue: Point[];
  luminance: Point[];
}

export const App = () => {
  const [isSelectedImage, setIsSelectedImage] = React.useState(false);
  const [imageBytes, setImageBytes] = React.useState<Uint8Array>();

  const [previewCanvasRef, regl, toneCurveRef, changeImage] = useImagePreivew();
  const [curveColor, setCurveColor] = React.useState("#555");
  const [selectedChannel, setSelectedChannel] = React.useState(
    Channel.LUMINANCE
  );

  const [controlPoints, setControlPoints] = React.useState<ToneCurves>({
    red: EMPTY_SPLINE,
    green: EMPTY_SPLINE,
    blue: EMPTY_SPLINE,
    luminance: EMPTY_SPLINE,
  });

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

  const applyCurveToPreview = (channel: Channel, toneCurve: Spline) => {
    // set luminance by default first
    switch (channel) {
      case Channel.LUMINANCE:
        toneCurveRef.current.luminance = toneCurve;
        break;
      case Channel.RED:
        toneCurveRef.current.red = toneCurve;
        break;
      case Channel.GREEN:
        toneCurveRef.current.green = toneCurve;
        break;
      case Channel.BLUE:
        toneCurveRef.current.blue = toneCurve;
        break;
    }
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

  const handleToneCurveChange = (channel: Channel, newCurve: Spline) => {
    applyCurveToPreview(channel, newCurve);
  };

  const create = (id: string) => {
    // deliver message to the figma plugin instance
    // parent.postMessage({ pluginMessage: { type: "create-instance", id } }, "*");
  };

  // return <div>{isSelectedImage && "Image"}</div>;

  const [containerRef, { width, height }, refreshMeasurement] =
    useMeasurement<HTMLDivElement>();
  const panelWidth = width;
  const panelHeight = height;

  React.useEffect(() => {
    refreshMeasurement();
  }, [selectedChannel]);

  // const { panelWidth, panelHeight, elmOffsetX, elmOffsetY } = (() => {
  //   if (!containerRef.current)
  //     return { panelWidth: 0, panelHeight: 0, elmOffsetX: 0, elmOffsetY: 0 };

  //   const bounds = containerRef.current.getBoundingClientRect();
  //   return {
  //     panelWidth: bounds.width,
  //     panelHeight: bounds.height,
  //     elmOffsetX: bounds.left,
  //     elmOffsetY: bounds.top,
  //   };
  // })();

  return (
    <>
      <div className="layout-grid">
        <div>
          <canvas
            style={{ opacity: isSelectedImage ? 1 : 0 }}
            width={window.innerWidth}
            height={window.innerHeight}
            ref={previewCanvasRef}
            className={"image-preivew"}
          />
        </div>
        <div className="controls-container">
          <div className="curve-container">
            <ChannelCurveEditor
              key={Channel.LUMINANCE}
              width={panelWidth}
              height={panelHeight}
              containerRef={containerRef}
              isActive={selectedChannel === Channel.LUMINANCE}
              onChange={(curve) =>
                handleToneCurveChange(Channel.LUMINANCE, curve)
              }
              curveColor={curveColor}
            />
            <ChannelCurveEditor
              key={Channel.RED}
              containerRef={containerRef}
              width={panelWidth}
              height={panelHeight}
              isActive={selectedChannel === Channel.RED}
              onChange={(curve) => handleToneCurveChange(Channel.RED, curve)}
              curveColor={curveColor}
            />
            <ChannelCurveEditor
              key={Channel.GREEN}
              containerRef={containerRef}
              width={panelWidth}
              height={panelHeight}
              isActive={selectedChannel === Channel.GREEN}
              onChange={(curve) => handleToneCurveChange(Channel.GREEN, curve)}
              curveColor={curveColor}
            />
            <ChannelCurveEditor
              key={Channel.BLUE}
              containerRef={containerRef}
              width={panelWidth}
              height={panelHeight}
              isActive={selectedChannel === Channel.BLUE}
              onChange={(curve) => handleToneCurveChange(Channel.BLUE, curve)}
              curveColor={curveColor}
            />
          </div>
          <div>
            <ChannelToggle
              color="#a7a7a7"
              isActive={selectedChannel === Channel.LUMINANCE}
              onClick={() => setSelectedChannel(Channel.LUMINANCE)}
            />
            <ChannelToggle
              color="#e64242"
              isActive={selectedChannel === Channel.RED}
              onClick={() => setSelectedChannel(Channel.RED)}
            />
            <ChannelToggle
              color="#52d652"
              isActive={selectedChannel === Channel.GREEN}
              onClick={() => setSelectedChannel(Channel.GREEN)}
            />
            <ChannelToggle
              color="#3232dd"
              isActive={selectedChannel === Channel.BLUE}
              onClick={() => setSelectedChannel(Channel.BLUE)}
            />
          </div>
        </div>
      </div>
      {
        <div className="unselected-overlay">
          <div
            className={
              isSelectedImage
                ? "unselected-overlay__content unselected-overlay__content--hidden"
                : "unselected-overlay__content"
            }
          >
            Please select an image in the document.
          </div>
        </div>
      }
    </>
  );
};
