import React, { useState } from "react";
import { Grid, theme, Typography } from "antd";
import ShopProfileSettings from "../../components/settings/shop-profile-settings";
import MakingChargesSettings from "../../components/settings/making-charges-settings";
import AccessRequestsSettings from "../../components/settings/access-requests-settings";
import { Percent, Store, ShieldCheck } from "lucide-react";

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;

export default function Settings() {
  const [activeTab, setActiveTab] = useState<"shop" | "making-charges" | "access-requests">("making-charges");
  const { token } = theme.useToken();
  const screens = useBreakpoint();

  if (!screens.md) {
    return (
      <div
        data-testid="mobile-settings"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: "4px 0 40px",
          maxWidth: "100%",
          overflowX: "hidden",
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            Showroom Settings
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Manage rates, shop profile and team access
          </Text>
        </div>

        {/* Mobile Tab Pills */}
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            scrollbarWidth: "none",
            paddingBottom: 4,
          }}
        >
          <button
            type="button"
            data-testid="mobile-settings-tab-making-charges"
            onClick={() => setActiveTab("making-charges")}
            style={{
              padding: "8px 14px",
              borderRadius: 20,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
              backgroundColor:
                activeTab === "making-charges"
                  ? token.colorPrimary
                  : token.colorFillAlter,
              color:
                activeTab === "making-charges" ? "#fff" : token.colorTextSecondary,
            }}
          >
            <Percent size={14} />
            <span>Making Charges</span>
          </button>

          <button
            type="button"
            data-testid="mobile-settings-tab-shop"
            onClick={() => setActiveTab("shop")}
            style={{
              padding: "8px 14px",
              borderRadius: 20,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
              backgroundColor:
                activeTab === "shop"
                  ? token.colorPrimary
                  : token.colorFillAlter,
              color:
                activeTab === "shop" ? "#fff" : token.colorTextSecondary,
            }}
          >
            <Store size={14} />
            <span>Shop Profile</span>
          </button>

          <button
            type="button"
            data-testid="mobile-settings-tab-access-requests"
            onClick={() => setActiveTab("access-requests")}
            style={{
              padding: "8px 14px",
              borderRadius: 20,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
              backgroundColor:
                activeTab === "access-requests"
                  ? token.colorPrimary
                  : token.colorFillAlter,
              color:
                activeTab === "access-requests" ? "#fff" : token.colorTextSecondary,
            }}
          >
            <ShieldCheck size={14} />
            <span>Access Requests</span>
          </button>
        </div>

        {/* Content */}
        <div style={{ maxWidth: "100%", overflowX: "hidden" }}>
          {activeTab === "shop" && <ShopProfileSettings />}
          {activeTab === "making-charges" && <MakingChargesSettings />}
          {activeTab === "access-requests" && <AccessRequestsSettings />}
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
        <TabItem
          label="Access Requests"
          active={activeTab === "access-requests"}
          onClick={() => setActiveTab("access-requests")}
          token={token}
        />
      </div>

      {/* Content */}
      {activeTab === "shop" && <ShopProfileSettings />}
      {activeTab === "making-charges" && <MakingChargesSettings />}
      {activeTab === "access-requests" && <AccessRequestsSettings />}
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
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "0 0 14px 0",
        fontWeight: active ? 600 : 500,
        fontSize: 15,
        color: active ? token.colorPrimary : token.colorTextSecondary,
        borderBottom: active ? `2px solid ${token.colorPrimary}` : "2px solid transparent",
        marginBottom: -1,
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}
