import React from "react";
import { Home, HomeProps } from "./Home";

export type HomeViewProps = HomeProps;

export const HomeView: React.FC<HomeViewProps> = (props) => {
  return <Home {...props} />;
};

export default HomeView;
