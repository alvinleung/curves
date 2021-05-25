import * as React from "react";
import { ControlPoint, Point } from "./ControlPoint";
import Spline from "cubic-spline-ts";
import { useCanvas, usePreviewCanvas } from "./useCanvas";
import { useMeasurement } from "./useMeasurement";
import {
  applyToneCurve,
  createDecodingCanvas,
  createImageFromByte,
  decode,
} from "./ImageManipulation";

type ComponentItemType = {
  id: string;
  name: string;
};

export const App = () => {
  const [isSelectedImage, setIsSelectedImage] = React.useState(false);
  const [imageBytes, setImageBytes] = React.useState<Uint8Array>();

  const [previewCanvasRef, regl, toneCurveRef, changeImage] =
    usePreviewCanvas();
  const [canvasRef, ctx] = useCanvas();

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
    toneCurveRef.current = toneCurve;
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

  const create = (id: string) => {
    // deliver message to the figma plugin instance
    // parent.postMessage({ pluginMessage: { type: "create-instance", id } }, "*");
  };

  // return <div>{isSelectedImage && "Image"}</div>;

  const initialPointValues = [
    { x: 0.0, y: 0.0 },
    { x: 0.25, y: 0.25 },
    { x: 0.75, y: 0.75 },
    { x: 1, y: 1 },
  ];

  const [controlPoints, setControlPoints] =
    React.useState<Point[]>(initialPointValues);

  const handlePointValueChange = (point: Point, pointIndex: number) => {
    const clampedPoint = {
      x: clamp(point.x),
      y: clamp(point.y, -0.00000000001, 1),
    };

    controlPoints[pointIndex] = clampedPoint;
    setControlPoints([...controlPoints]);
  };

  const handleDragDone = (pointIndex: number) => {
    if (controlPoints[pointIndex].y < 0) {
      controlPoints.splice(pointIndex, 1);
      setControlPoints([...controlPoints]);
    }
  };

  const [containerRef, { width, height, x, y }] =
    useMeasurement<HTMLDivElement>();
  const panelWidth = width;
  const panelHeight = height;
  const panelPosX = x;
  const panelPosY = y;

  React.useEffect(() => {
    // send control point option change to main thread
    parent.postMessage(
      { pluginMessage: { type: "curve-update", controlPoints } },
      "*"
    );
    // update teh image curve
    const [xs, ys] = getXsYs(controlPoints);
    updateImageBytesWithCruve(new Spline(xs, ys));
  }, [controlPoints]);

  React.useEffect(() => {
    // update the canvas curve base on control point
    ctx && updateCanvasCurve(controlPoints);
  }, [controlPoints, ctx, isSelectedImage]);

  const updateCanvasCurve = (points: Point[]) => {
    // don't draw anything if nothing is selecteed
    if (!isSelectedImage) {
      ctx.clearRect(0, 0, panelWidth, panelHeight);
      return;
    }

    // generate a spline curve first
    const xs = [];
    const ys = [];

    points.forEach((point) => {
      xs.push(point.x);
      ys.push(point.y);
    });

    // will generate natual curves base on the points
    const spline = new Spline(xs, ys);

    // log out the derivatives on the curve
    // console.log(spline.ks);

    // draw the curve on canvas
    ctx.clearRect(0, 0, panelWidth, panelHeight);

    ctx.beginPath();
    // interpolate a line at a higher resolution
    const iterations = 100;
    for (let x = 0; x < iterations; x++) {
      const xStepSize = clamp(x / iterations);
      const y = clamp(spline.at(xStepSize));
      ctx.lineTo(xStepSize * panelWidth, (1 - y) * panelHeight);
    }
    // connect to the last point
    ctx.lineTo(panelWidth, (1 - spline.at(1)) * panelHeight);
    ctx.stroke();
    // ctx.moveTo(x * panelWidth, y * panelHeight);
  };

  const [updateTimes, setUpdateTimes] = React.useState(0);
  const handleControlPointAdd = (e: React.MouseEvent) => {
    const addX = (e.clientX - panelPosX) / panelWidth;
    const addY = (e.clientY - panelPosY) / panelHeight;

    // find the appropriate index
    const insertIndex = controlPoints.reduce((result, current, index) => {
      const nextItem = controlPoints[index + 1];

      if (!nextItem) return result;

      if (current.x <= addX && nextItem.x >= addX) {
        // insert in between
        result = index;
      }
      return result;
    }, controlPoints.length);

    // new array
    const copy = [...controlPoints];
    copy.splice(insertIndex + 1, 0, { x: addX, y: 1 - addY });

    setControlPoints([...copy]);
    setUpdateTimes(updateTimes + 1);
  };

  return (
    <>
      <div>
        <canvas
          width={window.innerWidth}
          height={window.innerHeight}
          ref={previewCanvasRef}
          className={"image-preivew"}
        />
      </div>
      <div
        ref={containerRef}
        className={"curve"}
        style={{
          cursor: isSelectedImage ? "inherit" : "default",
        }}
      >
        <canvas
          width={panelWidth}
          height={panelHeight}
          ref={canvasRef}
          className={"curve__plot"}
        />
        <svg onMouseDown={(e) => isSelectedImage && handleControlPointAdd(e)}>
          {isSelectedImage &&
            controlPoints.map((pointValue, index) => {
              return (
                <ControlPoint
                  key={index}
                  value={pointValue}
                  onChange={(val) => handlePointValueChange(val, index)}
                  containerRef={canvasRef as React.RefObject<HTMLElement>}
                  onEndDrag={() => handleDragDone(index)}
                />
              );
            })}
        </svg>
      </div>
    </>
  );
};

const lerp = (x, y, a) => x * (1 - a) + y * a;
const clamp = (a, min = 0, max = 1) => Math.min(max, Math.max(min, a));
const invlerp = (x, y, a) => clamp((a - x) / (y - x));
const range = (x1, y1, x2, y2, a) => lerp(x2, y2, invlerp(x1, y1, a));

function getXsYs(points: Point[]) {
  // generate a spline curve first
  const xs = [];
  const ys = [];

  points.forEach((point) => {
    xs.push(point.x);
    ys.push(point.y);
  });

  return [xs, ys];
}
