import * as React from "react";

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

export function useMeasurement<T extends HTMLElement>(): [
  React.RefObject<T>,
  DOMRect
] {
  const [measurement, setMeasurement] = React.useState<DOMRect>(initialValue);
  const ref = React.useRef<T>();

  React.useEffect(() => {
    if (ref.current !== null) {
      setMeasurement(ref.current.getBoundingClientRect());
      return;
    }
  }, [ref.current]);

  return [ref, measurement];
}
