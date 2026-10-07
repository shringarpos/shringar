import React from "react";
import { useParams } from "react-router";
import { Grid } from "antd";
import { MobileOrnamentForm } from "./mobile-ornament-form";

export const OrnamentEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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
      <MobileOrnamentForm action="edit" id={id} />
    </div>
  );
};

export default OrnamentEditPage;
