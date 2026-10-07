import React from "react";
import { Grid } from "antd";
import { MobileGoldLoanForm } from "./mobile-gold-loan-form";

export const GoldLoanCreatePage: React.FC = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;

  return (
    <div
      style={{
        maxWidth: isMobile ? "100%" : 680,
        margin: "0 auto",
        minHeight: "100vh",
      }}
    >
      <MobileGoldLoanForm />
    </div>
  );
};

export default GoldLoanCreatePage;
