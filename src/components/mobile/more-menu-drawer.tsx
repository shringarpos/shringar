import React, { useContext } from "react";
import { Drawer, Avatar, Typography, Button, Switch, Space, theme } from "antd";
import {
  Users,
  Gem,
  List,
  TrendingUp,
  Images,
  Settings as SettingsIcon,
  LogOut,
  Moon,
  Sun,
  ChevronRight,
  X,
} from "lucide-react";
import { useGetIdentity, useLogout, useList } from "@refinedev/core";
import { useNavigate, useLocation } from "react-router";
import { ColorModeContext } from "../../contexts/color-mode";

const { Text } = Typography;

interface MoreMenuDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface IUser {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string; avatar_url?: string };
}

interface IShop {
  id: string;
  name: string;
  code: string;
  logo_url?: string | null;
}

export const MoreMenuDrawer: React.FC<MoreMenuDrawerProps> = ({ open, onClose }) => {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, setMode } = useContext(ColorModeContext);
  const isDark = mode === "dark";
  const { data: user } = useGetIdentity<IUser>();
  const { mutate: logout } = useLogout();

  const { query: shopsQuery } = useList<IShop>({
    resource: "shops",
    filters: user?.id ? [{ field: "user_id", operator: "eq", value: user.id }] : [],
    pagination: { pageSize: 1 },
    queryOptions: { enabled: !!user?.id },
  });
  const shop = shopsQuery?.data?.data?.[0];

  const displayName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email ??
    "Jeweler";

  const avatarSrc = shop?.logo_url ?? user?.user_metadata?.avatar_url;
  const avatarFallback = displayName?.[0]?.toUpperCase() || "S";

  const menuItems = [
    {
      key: "customers",
      label: "Customers",
      icon: Users,
      path: "/customers",
      subtitle: "Directory & credit ledger",
    },
    {
      key: "ornaments",
      label: "Ornaments",
      icon: Gem,
      path: "/ornaments",
      subtitle: "Stock, weights, and purity",
    },
    {
      key: "categories",
      label: "Categories",
      icon: List,
      path: "/categories",
      subtitle: "Jewelry types & tax codes",
    },
    {
      key: "metal_rates",
      label: "Metal Rates",
      icon: TrendingUp,
      path: "/metal-rates",
      subtitle: "Live gold & silver pricing",
    },
    {
      key: "design_gallery",
      label: "Design Gallery",
      icon: Images,
      path: "/design-gallery",
      subtitle: "Digital catalogs & lookbooks",
    },
    {
      key: "settings",
      label: "Settings",
      icon: SettingsIcon,
      path: "/settings",
      subtitle: "Showroom profile & making charges",
    },
  ];

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <Drawer
      data-testid="mobile-more-drawer"
      open={open}
      onClose={onClose}
      placement="bottom"
      height="82vh"
      styles={{
        body: {
          padding: "16px 20px 32px",
          background: isDark ? "#09090b" : "#f1f5f9",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          display: "flex",
          flexDirection: "column",
        },
        header: {
          display: "none",
        },
      }}
      rootStyle={{ zIndex: 1050 }}
    >
      {/* Top Header with Grab Bar and Close Button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ width: 28 }} />
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: isDark ? "#3f3f46" : "#cbd5e1",
          }}
        />
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            padding: 4,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isDark ? "#94a3b8" : "#64748b",
            borderRadius: "50%",
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Showroom & Profile Card */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          backgroundColor: isDark ? "#141414" : "#ffffff",
          borderRadius: 14,
          border: isDark ? "1px solid #27272a" : "1px solid #e2e8f0",
          marginBottom: 16,
          boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.4)" : "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <Avatar
          size={48}
          src={avatarSrc}
          style={{
            backgroundColor: token.colorPrimary,
            color: "#fff",
            fontWeight: 600,
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {avatarFallback}
        </Avatar>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: isDark ? "#f8fafc" : "#0f172a",
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {shop?.name || displayName}
          </span>
          <span
            style={{
              fontSize: 12,
              color: isDark ? "#94a3b8" : "#64748b",
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {shop?.code ? `Shop Code: ${shop.code} • ` : ""}
            {user?.email}
          </span>
        </div>
      </div>

      {/* Menu List */}
      <div
        style={{
          backgroundColor: isDark ? "#141414" : "#ffffff",
          borderRadius: 14,
          border: isDark ? "1px solid #27272a" : "1px solid #e2e8f0",
          overflow: "hidden",
          marginBottom: 16,
          boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.4)" : "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);

          return (
            <React.Fragment key={item.key}>
              <div
                data-testid={`drawer-item-${item.key}`}
                onClick={() => handleNavigate(item.path)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  cursor: "pointer",
                  backgroundColor: isActive
                    ? isDark
                      ? "rgba(37, 99, 235, 0.22)"
                      : token.colorPrimaryBg
                    : "transparent",
                  transition: "background-color 0.15s ease",
                  userSelect: "none",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: isActive
                        ? token.colorPrimary
                        : isDark
                          ? "rgba(37, 99, 235, 0.18)"
                          : "rgba(37, 99, 235, 0.08)",
                      color: isActive ? "#fff" : isDark ? "#60a5fa" : token.colorPrimary,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: isActive
                          ? isDark
                            ? "#60a5fa"
                            : token.colorPrimary
                          : isDark
                            ? "#f8fafc"
                            : "#0f172a",
                        display: "block",
                      }}
                    >
                      {item.label}
                    </span>
                    <span style={{ fontSize: 11, color: isDark ? "#94a3b8" : "#64748b", display: "block" }}>
                      {item.subtitle}
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: isDark ? "#71717a" : "#94a3b8" }} />
              </div>
              {idx < menuItems.length - 1 && (
                <div
                  style={{
                    height: 1,
                    backgroundColor: isDark ? "#27272a" : "#f1f5f9",
                    marginLeft: 64,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Dark Mode & Logout Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          backgroundColor: isDark ? "#141414" : "#ffffff",
          borderRadius: 14,
          border: isDark ? "1px solid #27272a" : "1px solid #e2e8f0",
          marginBottom: 16,
          boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.4)" : "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <Space align="center" size="middle">
          {mode === "dark" ? (
            <Moon size={18} style={{ color: "#60a5fa" }} />
          ) : (
            <Sun size={18} style={{ color: "#eab308" }} />
          )}
          <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? "#f8fafc" : "#0f172a" }}>
            Dark Theme
          </span>
        </Space>
        <Switch
          checked={mode === "dark"}
          onChange={(checked) => setMode(checked ? "dark" : "light")}
        />
      </div>

      <Button
        danger
        block
        size="large"
        icon={<LogOut size={16} />}
        onClick={() => {
          onClose();
          logout();
        }}
        style={{
          borderRadius: 12,
          height: 46,
          fontWeight: 600,
          marginTop: "auto",
        }}
      >
        Log Out
      </Button>
    </Drawer>
  );
};
