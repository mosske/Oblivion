import React from "react";
import { BottomNav, BottomNavProps } from "./BottomNav";

export type NavigationProps = BottomNavProps;

export const Navigation: React.FC<NavigationProps> = (props) => {
  return <BottomNav {...props} />;
};

export default Navigation;
export { BottomNav };
