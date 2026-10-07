import React, { useState } from "react";
import { Grid, theme, Typography } from "antd";
import ShopProfileSettings from "../../components/settings/shop-profile-settings";
import MakingChargesSettings from "../../components/settings/making-charges-settings";
import { Percent, Store } from "lucide-react";

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;

export default function Settings() {
  const [activeTab, setActiveTab] = useState<"shop" | "making-charges">("making-charges");
  const { token } = theme.useToken();
  const screens = useBreakpoint();

  if (!screens.md) {
    const tabs = [
      {
        key: "making-charges",
        label: "Making Charges",
        icon: <Percent size={15} />,
        testId: "mobile-settings-tab-making-charges",
      },
      {
        key: "shop",
        label: "Shop Profile",
        icon: <Store size={15} />,
        testId: "mobile-settings-tab-shop",
      },
    ] as const;

    return (
      <div
        data-testid="mobile-settings"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          padding: "4px 0 16px",
          maxWidth: "100%",
          overflowX: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "0 2px" }}>
          <Title level={4} style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>
            Showroom Settings
          </Title>
          <Text type="secondary" style={{ fontSize: 12, marginTop: 2, display: "block" }}>
            Manage rates and shop profile
          </Text>
        </div>

        {/* Edge-to-Edge Segmented Tab Pills */}
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            padding: "2px 0 6px",
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                data-testid={tab.testId}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  minHeight: 40,
                  padding: "8px 16px",
                  borderRadius: 20,
                  border: isActive
                    ? `1px solid ${token.colorPrimary}`
                    : `1px solid ${token.colorBorderSecondary}`,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  backgroundColor: isActive ? token.colorPrimary : token.colorBgContainer,
                  color: isActive ? "#ffffff" : token.colorText,
                  boxShadow: isActive
                    ? "0 3px 8px rgba(0, 0, 0, 0.12)"
                    : "0 1px 2px rgba(0, 0, 0, 0.03)",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div style={{ maxWidth: "100%", overflowX: "hidden" }}>
          {activeTab === "shop" && <ShopProfileSettings />}
          {activeTab === "making-charges" && <MakingChargesSettings />}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "clamp(16px, 4vw, 40px)", fontFamily: "sans-serif" }}>
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 30,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          marginBottom: 40,
        }}
      >
        <TabItem
          label="Making Charges"
          active={activeTab === "making-charges"}
          onClick={() => setActiveTab("making-charges")}
          token={token}
        />
        <TabItem
          label="Shop Settings"
          active={activeTab === "shop"}
          onClick={() => setActiveTab("shop")}
          token={token}
        />
      </div>

      {activeTab === "shop" && <ShopProfileSettings />}
      {activeTab === "making-charges" && <MakingChargesSettings />}
    </div>
  );
}

function TabItem({
  label,
  active,
  onClick,
  token,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  token: any;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "none",
        background: "none",
        fontSize: "16px",
        fontWeight: active ? "600" : "400",
        color: active ? token.colorPrimary : token.colorTextSecondary,
        borderBottom: active ? `2px solid ${token.colorPrimary}` : "2px solid transparent",
        paddingBottom: "10px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {label}
    </button>
  );
}
