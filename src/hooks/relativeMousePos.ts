export function getRelativeMousePosition<T extends HTMLElement>(
  elm: T,
  e: MouseEvent | React.MouseEvent
) {
  const bounds = elm.getBoundingClientRect();

  return {
    x: e.pageX - window.scrollX - bounds.left,
    y: e.pageY - window.scrollY - bounds.top,
  };
}
