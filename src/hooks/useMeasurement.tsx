import * as React from "react";
import useForceUpdate from "use-force-update";

const initialValue = {
  x: 0,
  y: 0,
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  width: 0,
  height: 0,
  toJSON: () => {},
};

export function useMeasurement<T extends HTMLElement>(
  ignoreBorder?: boolean
): [React.RefObject<T>, DOMRect, () => void] {
  const [measurement, setMeasurement] = React.useState<DOMRect>(initialValue);
  const ref = React.useRef<T>();

  const update = useForceUpdate();

  React.useEffect(() => {
    if (ref.current !== null) {
      const boundingRect = ref.current.getBoundingClientRect();

      if (ignoreBorder) {
        const computedStyle = window.getComputedStyle(ref.current);
        // fetch the 4 border width values
        const topBorder = parseFloat(
          computedStyle.getPropertyValue("border-top-width")
        );
        const rightBorder = parseFloat(
          computedStyle.getPropertyValue("border-right-width")
        );
        const bottomBorder = parseFloat(
          computedStyle.getPropertyValue("border-bottom-width")
        );
        const leftBorder = parseFloat(
          computedStyle.getPropertyValue("border-left-width")
        );

        boundingRect.width = boundingRect.width - leftBorder - rightBorder;
        boundingRect.height = boundingRect.height - topBorder - bottomBorder;
      }
      setMeasurement(boundingRect);
      return;
    }
  }, [ref.current]);

  return [ref, measurement, update];
}
