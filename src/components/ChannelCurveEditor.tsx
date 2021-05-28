import Spline from "cubic-spline-ts";
import * as React from "react";
import { getRelativeMousePosition } from "../hooks/relativeMousePos";
import { useCanvas } from "../hooks/useCanvas";
import { useMeasurement } from "../hooks/useMeasurement";
import { ControlPoint, Point } from "./ControlPoint";

interface Props {
  containerRef: React.RefObject<HTMLDivElement>;
  isActive: boolean;
  width: number;
  height: number;
  onChange: (toneCurve: Spline) => void;
  curveColor: string;
}

export const ChannelCurveEditor = ({
  containerRef,
  width,
  height,
  isActive,
  onChange,
  curveColor,
}: Props) => {
  const initialPointValues = [
    { x: 0.0, y: 0.0 },
    { x: 0.25, y: 0.25 },
    { x: 0.75, y: 0.75 },
    { x: 1, y: 1 },
  ];

  const [canvasRef, ctx] = useCanvas();

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
    // don't delete the first point and the last point
    if (pointIndex === 0 || pointIndex === controlPoints.length - 1) return;
    if (controlPoints[pointIndex].y < 0) {
      // delete the control point
      controlPoints.splice(pointIndex, 1);
      setControlPoints([...controlPoints]);
    }
  };
  const panelWidth = width;
  const panelHeight = height;
  const curveEditorWidth = panelWidth * window.devicePixelRatio;
  const curveEditorHeight = panelHeight * window.devicePixelRatio;

  React.useEffect(() => {
    // send control point option change to main thread
    parent.postMessage(
      { pluginMessage: { type: "curve-update", controlPoints } },
      "*"
    );
    // update teh image curve
    const [xs, ys] = getXsYs(controlPoints);
    onChange && onChange(new Spline(xs, ys));
  }, [controlPoints]);

  React.useEffect(() => {
    // update the canvas curve base on control point
    ctx && updateCanvasCurve(controlPoints);
  }, [controlPoints, ctx, isActive]);

  const updateCanvasCurve = (points: Point[]) => {
    // don't draw anything if nothing is selecteed
    if (!isActive) {
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
    ctx.clearRect(0, 0, curveEditorWidth, curveEditorHeight);

    ctx.strokeStyle = curveColor;

    ctx.beginPath();
    // interpolate a line at a higher resolution
    const iterations = 50;
    for (let x = 0; x < iterations; x++) {
      const xStepSize = clamp(x / iterations);
      const y = clamp(spline.at(xStepSize));
      ctx.lineTo(xStepSize * curveEditorWidth, (1 - y) * curveEditorHeight);
    }
    // connect to the last point
    ctx.lineTo(curveEditorWidth, (1 - spline.at(1)) * curveEditorHeight);
    ctx.stroke();
    // ctx.moveTo(x * panelWidth, y * panelHeight);
  };

  const handleControlPointAdd = (e: React.MouseEvent) => {
    const relativeMosuePos = getRelativeMousePosition(containerRef.current, e);

    const addX = relativeMosuePos.x / panelWidth;
    const addY = relativeMosuePos.y / panelHeight;

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
  };

  return (
    <div
      ref={containerRef}
      className={"curve"}
      style={{
        height: window.innerHeight / 2,
      }}
    >
      <canvas
        width={curveEditorWidth}
        height={curveEditorHeight}
        ref={canvasRef}
        className={"curve__plot"}
      />
      <svg
        width={panelWidth}
        height={panelHeight}
        onMouseDown={(e) => isActive && handleControlPointAdd(e)}
      >
        {isActive &&
          controlPoints.map((pointValue, index) => {
            const isCurveEndPoint =
              index === 0 || index === controlPoints.length - 1;

            return (
              <ControlPoint
                key={index}
                value={pointValue}
                onChange={(val) => handlePointValueChange(val, index)}
                containerRef={canvasRef as React.RefObject<HTMLElement>}
                onEndDrag={() => handleDragDone(index)}
                horizontalMovement={!isCurveEndPoint}
                verticalMovement={true}
              />
            );
          })}
      </svg>
    </div>
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
