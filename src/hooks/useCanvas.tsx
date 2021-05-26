import Spline from "cubic-spline-ts";
import * as React from "react";
import * as twgl from "twgl.js";

export function useCanvas(): [
  React.Ref<HTMLCanvasElement>,
  CanvasRenderingContext2D
] {
  const canvasRef = React.useRef<HTMLCanvasElement>();
  const [context, setContext] = React.useState<CanvasRenderingContext2D>();

  React.useEffect(() => {
    setContext(canvasRef.current.getContext("2d"));
  }, []);

  return [canvasRef, context];
}
