import React, { useState } from "react";
import { Grid, Layout, theme, Avatar, Typography } from "antd";
import { ThemedLayout, ThemedSider } from "@refinedev/antd";
import { Header } from "../header";
import { BottomNavBar } from "./bottom-nav-bar";
import { MoreMenuDrawer } from "./more-menu-drawer";
import { useGetIdentity, useList } from "@refinedev/core";

const { useBreakpoint } = Grid;
const { Text } = Typography;

interface MobileShellProps {
  children: React.ReactNode;
  SidebarTitle: React.FC<{ collapsed: boolean }>;
}

export const MobileShell: React.FC<MobileShellProps> = ({ children, SidebarTitle }) => {
  const screens = useBreakpoint();
  const { token } = theme.useToken();
  const [moreOpen, setMoreOpen] = useState(false);

  const { data: user } = useGetIdentity<{
    id: string;
    email?: string;
    user_metadata?: { full_name?: string; avatar_url?: string };
  }>();

  const { query: shopsQuery } = useList<{
    id: string;
    name: string;
    code: string;
    logo_url?: string | null;
  }>({
    resource: "shops",
    filters: user?.id ? [{ field: "user_id", operator: "eq", value: user.id }] : [],
    pagination: { pageSize: 1 },
    queryOptions: { enabled: !!user?.id },
  });
  const shop = shopsQuery?.data?.data?.[0];

  // If desktop (md and above), use Refine's desktop layout
  const isDesktop = screens.md;

  if (isDesktop) {
    return (
      <ThemedLayout
        Header={Header}
        Sider={(props) => <ThemedSider {...props} Title={SidebarTitle} fixed />}
      >
        {children}
      </ThemedLayout>
    );
  }

  // Native Mobile App Layout
  const avatarSrc = shop?.logo_url ?? user?.user_metadata?.avatar_url;
  const avatarFallback = (shop?.name?.[0] || user?.email?.[0] || "S").toUpperCase();

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: token.colorBgLayout,
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Native-style Top Mobile App Bar */}
      <header
        data-testid="mobile-top-bar"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 990,
          backgroundColor: token.colorBgElevated,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
            flex: 1,
            marginRight: 12,
          }}
        >
          <img
            src="/logo_icon.png"
            alt="Shringar"
            style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }}
          />
          <div style={{ lineHeight: 1.2, minWidth: 0, flex: 1 }}>
            <Text
              strong
              ellipsis
              style={{
                fontSize: 15,
                fontWeight: 700,
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {shop?.name || "Shringar POS"}
            </Text>
            {shop?.code && (
              <Text
                type="secondary"
                ellipsis
                style={{
                  fontSize: 11,
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Code: {shop.code}
              </Text>
            )}
          </div>
        </div>

        <Avatar
          src={avatarSrc}
          size={34}
          onClick={() => setMoreOpen(true)}
          style={{
            backgroundColor: token.colorPrimary,
            color: "#fff",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {avatarFallback}
        </Avatar>
      </header>

      {/* Main Content Area with Bottom Padding for Tab Dock */}
      <main
        style={{
          flex: 1,
          padding: "16px 12px calc(env(safe-area-inset-bottom, 0px) + 72px)",
          maxWidth: "100vw",
          overflowX: "hidden",
        }}
      >
        {children}
      </main>

      {/* Sticky Bottom Tab Bar */}
      <BottomNavBar onOpenMore={() => setMoreOpen(true)} isMoreOpen={moreOpen} />

      {/* More Menu Drawer */}
      <MoreMenuDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
};
