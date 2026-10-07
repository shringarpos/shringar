import React from "react";
import { Grid } from "antd";
import { MobileOrnamentForm } from "./mobile-ornament-form";

export const OrnamentCreatePage: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;

  return (
    <div
      style={{
        maxWidth: isMobile ? "100%" : 720,
        margin: "0 auto",
        minHeight: "100vh",
      }}
    >
      <MobileOrnamentForm action="create" />
    </div>
  );
};

export default OrnamentCreatePage;
