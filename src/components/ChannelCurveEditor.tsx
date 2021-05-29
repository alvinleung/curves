import Spline from "cubic-spline-ts";
import * as React from "react";
import { Channel } from "../App";
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
  clearControlPoints: React.MutableRefObject<Function>;
}

export const ChannelCurveEditor = ({
  containerRef,
  width,
  height,
  isActive,
  onChange,
  curveColor,
  clearControlPoints,
}: Props) => {
  const initialPointValues = [
    { x: 0.0, y: 0.0 },
    { x: 1, y: 1 },
  ];

  const [canvasRef, ctx] = useCanvas();

  const [controlPoints, setControlPoints] =
    React.useState<Point[]>(initialPointValues);

  clearControlPoints.current = React.useCallback(() => {
    setControlPoints(initialPointValues);
  }, []);

  const handlePointValueChange = (point: Point, pointIndex: number) => {
    const clampedPoint = {
      x: clamp(point.x),
      y: clamp(point.y, -0.00000000001, 1),
    };

    controlPoints[pointIndex] = clampedPoint;
    setControlPoints([...controlPoints]);
  };

  const handleDragDone = (pointIndex: number) => {
    // reset the creation mouse drag
    setNewPointIndex(null);

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

  const createSplineFromPoints = (controlPoints) => {
    let [xs, ys] = getXsYs(controlPoints);
    return new Spline(xs, ys);
  };

  React.useEffect(() => {
    // send control point option change to main thread
    parent.postMessage(
      { pluginMessage: { type: "curve-update", controlPoints } },
      "*"
    );
    // update teh image curve
    onChange && onChange(createSplineFromPoints(controlPoints));
  }, [controlPoints]);

  React.useEffect(() => {
    // update the canvas curve base on control point
    ctx && updateCanvasCurve(controlPoints);
  }, [controlPoints, ctx, isActive]);

  // update  the curve color
  React.useEffect(() => {
    updateCanvasCurve(controlPoints);
  }, [curveColor]);

  const updateCanvasCurve = (points: Point[]) => {
    if (!ctx) return;

    // don't draw anything if nothing is selecteed
    if (!isActive) {
      ctx.clearRect(0, 0, curveEditorWidth, curveEditorHeight);
      return;
    }

    ctx.clearRect(0, 0, curveEditorWidth, curveEditorHeight);

    // STEP 1 - RENDER GRIDS
    // render grids
    const cols = 4;
    const colSize = curveEditorWidth / cols;
    const rows = 4;
    const rowSize = curveEditorHeight / rows;
    // the grid colour
    ctx.strokeStyle = "#EEE";
    for (let i = 1; i < cols; i++) {
      ctx.beginPath();
      ctx.moveTo(colSize * i, 0);
      ctx.lineTo(colSize * i, curveEditorHeight);
      ctx.stroke();
    }
    for (let i = 1; i < rows; i++) {
      ctx.beginPath();
      ctx.moveTo(0, rowSize * i);
      ctx.lineTo(curveEditorWidth, rowSize * i);
      ctx.stroke();
    }

    // STEP 2 - RENDER SPLINE
    // will generate natual curves base on the points
    const spline = createSplineFromPoints(controlPoints);

    const lineWeight = 1;
    ctx.lineWidth = lineWeight * window.devicePixelRatio;

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
  };

  const [newPointIndex, setNewPointIndex] = React.useState<number>(null);

  const handleControlPointAdd = (e: React.MouseEvent) => {
    const relativeMosuePos = getRelativeMousePosition(containerRef.current, e);

    const addX = relativeMosuePos.x / panelWidth;
    const addY = relativeMosuePos.y / panelHeight;

    // find the appropriate index
    const insertionIndex = controlPoints.reduce((result, current, index) => {
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
    copy.splice(insertionIndex + 1, 0, { x: addX, y: 1 - addY });

    setControlPoints([...copy]);
    setNewPointIndex(insertionIndex + 1);
  };

  return (
    <div
      ref={isActive ? containerRef : null}
      className={"curve"}
      style={{
        height: window.innerHeight / 2,
        width: "100%",
        display: isActive ? "block" : "none",
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
        overflow="visible"
      >
        {isActive &&
          controlPoints.map((pointValue, index) => {
            const isCurveEndPoint =
              index === 0 || index === controlPoints.length - 1;

            return (
              <ControlPoint
                key={index}
                color={curveColor}
                value={pointValue}
                onChange={(val) => handlePointValueChange(val, index)}
                containerRef={canvasRef as React.RefObject<HTMLElement>}
                width={panelWidth}
                height={panelHeight}
                onEndDrag={() => handleDragDone(index)}
                horizontalMovement={!isCurveEndPoint}
                verticalMovement={true}
                shouldDrag={index === newPointIndex}
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
