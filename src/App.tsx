import * as React from "react";
import { ControlPoint, Point } from "./components/ControlPoint";
import Spline from "cubic-spline-ts";
import { useMeasurement } from "./hooks/useMeasurement";
import {
  applyToneCurve,
  createDecodingCanvas,
  createImageFromByte,
  decode,
  encode,
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

export enum CURVE_COLOR_CODE {
  red = "#e64242",
  green = "#52d652",
  blue = "#3232dd",
  luminance = "#a7a7a7",
}

export const App = () => {
  const [isSelectedImage, setIsSelectedImage] = React.useState(false);
  const [imageBytes, setImageBytes] = React.useState<Uint8Array>();

  const [
    previewCanvasRef,
    regl,
    toneCurveRef,
    changeImage,
    getAdjustedImageBytes,
  ] = useImagePreivew();
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

  const handleApplyCurveClick = async () => {
    if (!isSelectedImage) return;

    // STEP 1 - get the image from preview
    const imageBytes = await getAdjustedImageBytes();

    // STEP 2 - apply
    parent.postMessage(
      { pluginMessage: { type: "image-bytes-update", bytes: imageBytes } },
      "*"
    );
  };

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

  const [containerRef, { width, height }, refreshMeasurement] =
    useMeasurement<HTMLDivElement>(true);
  const panelWidth = width;
  const panelHeight = height;

  React.useEffect(() => {
    refreshMeasurement();
    setCurveColor(CURVE_COLOR_CODE[selectedChannel]);
  }, [selectedChannel]);

  const clearLuminanceControlPoints = React.useRef<() => void>();
  const clearBlueControlPoints = React.useRef<() => void>();
  const clearRedControlPoints = React.useRef<() => void>();
  const clearGreenControlPoints = React.useRef<() => void>();

  function handleToneCurveClear() {
    clearLuminanceControlPoints.current();
    clearRedControlPoints.current();
    clearGreenControlPoints.current();
    clearBlueControlPoints.current();
  }

  return (
    <>
      <div className="layout-grid">
        <div
          className="preview-container"
          style={{ backgroundColor: "rgba(229.5, 229.5, 229.5, 1)" }}
        >
          <canvas
            style={{ opacity: isSelectedImage ? 1 : 0 }}
            width={window.innerWidth}
            height={window.innerHeight}
            ref={previewCanvasRef}
            className={"image-preivew"}
          />
          <div className="preview-container__unselected-overlay">
            <div
              className={
                isSelectedImage
                  ? "preview-container__unselected-overlay-banner preview-container__unselected-overlay-banner--hidden"
                  : "preview-container__unselected-overlay-banner"
              }
            >
              Select an image from the document to preview adjustment.
            </div>
          </div>
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
              clearControlPoints={clearLuminanceControlPoints}
            />
            <ChannelCurveEditor
              key={Channel.RED}
              containerRef={containerRef}
              width={panelWidth}
              height={panelHeight}
              isActive={selectedChannel === Channel.RED}
              onChange={(curve) => handleToneCurveChange(Channel.RED, curve)}
              curveColor={curveColor}
              clearControlPoints={clearRedControlPoints}
            />
            <ChannelCurveEditor
              key={Channel.GREEN}
              containerRef={containerRef}
              width={panelWidth}
              height={panelHeight}
              isActive={selectedChannel === Channel.GREEN}
              onChange={(curve) => handleToneCurveChange(Channel.GREEN, curve)}
              curveColor={curveColor}
              clearControlPoints={clearGreenControlPoints}
            />
            <ChannelCurveEditor
              key={Channel.BLUE}
              containerRef={containerRef}
              width={panelWidth}
              height={panelHeight}
              isActive={selectedChannel === Channel.BLUE}
              onChange={(curve) => handleToneCurveChange(Channel.BLUE, curve)}
              curveColor={curveColor}
              clearControlPoints={clearBlueControlPoints}
            />
          </div>
          <div className="curve__setting-container">
            <div className="curve__channel-toggle-group">
              <ChannelToggle
                color={CURVE_COLOR_CODE[Channel.LUMINANCE]}
                isActive={selectedChannel === Channel.LUMINANCE}
                onClick={() => setSelectedChannel(Channel.LUMINANCE)}
              />
              <ChannelToggle
                color={CURVE_COLOR_CODE[Channel.RED]}
                isActive={selectedChannel === Channel.RED}
                onClick={() => setSelectedChannel(Channel.RED)}
              />
              <ChannelToggle
                color={CURVE_COLOR_CODE[Channel.GREEN]}
                isActive={selectedChannel === Channel.GREEN}
                onClick={() => setSelectedChannel(Channel.GREEN)}
              />
              <ChannelToggle
                color={CURVE_COLOR_CODE[Channel.BLUE]}
                isActive={selectedChannel === Channel.BLUE}
                onClick={() => setSelectedChannel(Channel.BLUE)}
              />
            </div>
            <button className="label-button" onClick={handleToneCurveClear}>
              Clear All
            </button>
          </div>
          <div className="control-button-group">
            <button
              className="button button--primary"
              disabled={!isSelectedImage}
              onClick={handleApplyCurveClick}
            >
              Apply Curve
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
