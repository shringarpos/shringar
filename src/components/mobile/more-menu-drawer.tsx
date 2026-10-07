import React, { useContext } from "react";
import { Drawer, Typography, Avatar, Switch, Button, theme, Space, Divider } from "antd";
import { useNavigate, useLocation } from "react-router";
import { useGetIdentity, useList, useLogout } from "@refinedev/core";
import {
  Users,
  Gem,
  List,
  TrendingUp,
  Images,
  SettingsIcon,
  LogOut,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { ColorModeContext } from "../../contexts/color-mode";

const { Text, Title } = Typography;

interface MoreMenuDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface IUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
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
      subtitle: "Showroom profile & staff access",
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
          background: token.colorBgLayout,
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
      {/* Top Grab Bar Handle */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: token.colorBorder,
          }}
        />
      </div>

      {/* Showroom & Profile Card */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          backgroundColor: token.colorBgElevated,
          borderRadius: 14,
          border: `1px solid ${token.colorBorderSecondary}`,
          marginBottom: 16,
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
          <Text strong style={{ fontSize: 15, display: "block" }} ellipsis>
            {shop?.name || displayName}
          </Text>
          <Text type="secondary" style={{ fontSize: 12, display: "block" }} ellipsis>
            {shop?.code ? `Shop Code: ${shop.code} • ` : ""}
            {user?.email}
          </Text>
        </div>
      </div>

      {/* Menu List */}
      <div
        style={{
          backgroundColor: token.colorBgElevated,
          borderRadius: 14,
          border: `1px solid ${token.colorBorderSecondary}`,
          overflow: "hidden",
          marginBottom: 16,
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
                  backgroundColor: isActive ? token.colorPrimaryBg : "transparent",
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
                      backgroundColor: isActive ? token.colorPrimary : token.colorFillAlter,
                      color: isActive ? "#fff" : token.colorPrimary,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <Text
                      strong
                      style={{
                        fontSize: 14,
                        color: isActive ? token.colorPrimary : token.colorText,
                        display: "block",
                      }}
                    >
                      {item.label}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                      {item.subtitle}
                    </Text>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: token.colorTextQuaternary }} />
              </div>
              {idx < menuItems.length - 1 && (
                <div
                  style={{
                    height: 1,
                    backgroundColor: token.colorBorderSecondary,
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
          backgroundColor: token.colorBgElevated,
          borderRadius: 14,
          border: `1px solid ${token.colorBorderSecondary}`,
          marginBottom: 16,
        }}
      >
        <Space align="center" size="middle">
          {mode === "dark" ? (
            <Moon size={18} style={{ color: token.colorPrimary }} />
          ) : (
            <Sun size={18} style={{ color: token.colorPrimary }} />
          )}
          <Text style={{ fontSize: 14 }}>Dark Theme</Text>
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
