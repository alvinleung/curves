import * as React from "react";

interface Props {
  color: string;
  isActive?: boolean;
  onClick: (e?: React.MouseEvent) => void;
}

export const ChannelToggle = ({ color, isActive, onClick }: Props) => {
  return (
    <button
      onClick={onClick}
      className="curve__channel-toggle"
      style={{
        borderColor: color,
        backgroundColor: isActive ? color : "transparent",
      }}
    />
  );
};
