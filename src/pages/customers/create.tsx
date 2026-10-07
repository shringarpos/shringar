import React from "react";
import { Grid } from "antd";
import { MobileCustomerForm } from "./mobile-customer-form";

export const CustomerCreatePage: React.FC = () => {
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
      <MobileCustomerForm />
    </div>
  );
};

export default CustomerCreatePage;
