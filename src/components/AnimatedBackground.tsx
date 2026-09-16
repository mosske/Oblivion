import React from "react";
import { BespokeCanvas, BespokeCanvasProps } from "./BespokeCanvas";

export interface AnimatedBackgroundProps extends BespokeCanvasProps {
  theme?: string;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = (props) => {
  return <BespokeCanvas {...props} />;
};

export { BespokeCanvas };
