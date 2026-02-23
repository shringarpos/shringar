
import ShopProfileSettings from "../../components/settings/shop-profile-settings";
import MakingChargesSettings from "../../components/settings/making-charges-settings";
import { useState } from "react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState<"shop" | "making-charges">("shop");

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 30,
          borderBottom: "1px solid #e5e5e5",
          marginBottom: 40,
        }}
      >
        <TabItem
          label="Shop Settings"
          active={activeTab === "shop"}
          onClick={() => setActiveTab("shop")}
        />
        <TabItem
          label="Making Charges"
          active={activeTab === "making-charges"}
          onClick={() => setActiveTab("making-charges")}
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
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        paddingBottom: 6,
        cursor: "pointer",
        fontWeight: active ? 600 : 400,
        borderBottom: active ? "2px solid white" : "2px solid transparent",
      }}
    >
      {label}
    </div>
  );
}

