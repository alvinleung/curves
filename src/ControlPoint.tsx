import * as React from "react";

export interface Point {
  x: number;
  y: number;
}

interface Props {
  onChange?: (val: Point) => void;
  onEndDrag?: () => void;
  value?: Point;
  containerRef?: React.RefObject<HTMLElement>;
}

export const ControlPoint = ({
  value,
  onChange,
  containerRef,
  onEndDrag,
}: Props) => {
  const { panelWidth, panelHeight, elmOffsetX, elmOffsetY } =
    React.useMemo(() => {
      if (!containerRef.current)
        return { panelWidth: 0, panelHeight: 0, elmOffsetX: 0, elmOffsetY: 0 };

      const bounds = containerRef.current.getBoundingClientRect();
      return {
        panelWidth: bounds.width,
        panelHeight: bounds.height,
        elmOffsetX: bounds.left,
        elmOffsetY: bounds.top,
      };
    }, [containerRef.current]);

  function convertPointToPixelSpace(point: Point) {
    return { x: point.x * panelWidth, y: (1 - point.y) * panelHeight };
  }

  function convertPointToValue(point: Point) {
    return { x: point.x / panelWidth, y: 1 - point.y / panelHeight };
  }

  const [isDragging, setIsDragging] = React.useState(false);

  const HANDLE_SIZE = 5;

  const beginDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const pointPos = {
        x: e.clientX - elmOffsetX,
        y: e.clientY - elmOffsetY,
      };

      onChange && onChange(convertPointToValue(pointPos));
    };

    const endDrag = (e: MouseEvent) => {
      setIsDragging(false);
      onEndDrag && onEndDrag();
    };

    document.body.addEventListener("mouseup", endDrag);
    document.body.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.body.removeEventListener("mousemove", handleMouseMove);
      document.body.removeEventListener("mouseup", endDrag);
    };
  }, [isDragging]);

  return (
    <circle
      className="curve__control-point"
      cx={convertPointToPixelSpace(value).x}
      cy={convertPointToPixelSpace(value).y}
      r={HANDLE_SIZE}
      onMouseDownCapture={beginDrag}
      fill="#AAA"
    />
  );
};
