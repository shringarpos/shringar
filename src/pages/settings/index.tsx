import ShopProfileSettings from "../../components/settings/shop-profile-settings";
import MakingChargesSettings from "../../components/settings/making-charges-settings";
import { useState } from "react";
import { theme } from "antd";

export default function Settings() {
  const [activeTab, setActiveTab] = useState<"shop" | "making-charges">("making-charges");
  const { token } = theme.useToken();

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

      {/* Content */}
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
    <div
      onClick={onClick}
      style={{
        paddingBottom: 6,
        cursor: "pointer",
        fontWeight: active ? 600 : 400,
        color: active ? token.colorPrimary : token.colorTextSecondary,
        borderBottom: active ? `2px solid ${token.colorPrimary}` : "2px solid transparent",
        transition: "all 0.2s ease",
      }}
    >
      {label}
    </div>
  );
}
