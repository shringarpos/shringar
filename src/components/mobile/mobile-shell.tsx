import React, { useState } from "react";
import { useLocation } from "react-router";
import { Grid, Layout, theme, Avatar, Typography } from "antd";
import { ThemedLayout, ThemedSider } from "@refinedev/antd";
import { Header } from "../header";
import { BottomNavBar } from "./bottom-nav-bar";
import { MoreMenuDrawer } from "./more-menu-drawer";
import { MobileMetalRatesBar } from "../metal-rates/mobile-metal-rates-bar";
import { useGetIdentity, useList } from "@refinedev/core";

const { useBreakpoint } = Grid;
const { Text } = Typography;

interface MobileShellProps {
  children: React.ReactNode;
  SidebarTitle: React.FC<{ collapsed: boolean }>;
}

export const MobileShell: React.FC<MobileShellProps> = ({ children, SidebarTitle }) => {
  const screens = useBreakpoint();
  const location = useLocation();
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
    filters: user?.id ? [{ field: "shop_id", operator: "eq", value: user.id }] : [],
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

  // Detect dedicated full-screen forms to give them complete viewport ownership
  const isDedicatedFormPage =
    location.pathname.startsWith("/ornaments/new") ||
    location.pathname.startsWith("/customers/new") ||
    location.pathname.startsWith("/gold-ledger/new") ||
    location.pathname.includes("/ornaments/edit/") ||
    location.pathname.includes("/customers/edit/") ||
    location.pathname.includes("/gold-ledger/edit/");

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
      {/* Sticky Native App Header + Live Metal Rates Bar (hidden on dedicated full-screen form pages) */}
      {!isDedicatedFormPage && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 990,
            backgroundColor: token.colorBgElevated,
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          {/* Top App Bar */}
          <header
            data-testid="mobile-top-bar"
            style={{
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
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

          {/* Persistent, Sleek Non-Breaking Metal Rates Bar */}
          <MobileMetalRatesBar />
        </div>
      )}

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          padding: isDedicatedFormPage
            ? 0
            : "14px 16px calc(72px + env(safe-area-inset-bottom, 16px))",
          maxWidth: "100%",
          boxSizing: "border-box",
          overflowX: "hidden",
        }}
      >
        {children}
      </main>

      {/* Persistent Bottom Tab Dock (hidden on dedicated form pages to allow full form CTA dock visibility) */}
      {!isDedicatedFormPage && (
        <BottomNavBar
          onOpenMore={() => setMoreOpen(true)}
          isMoreOpen={moreOpen}
        />
      )}

      {/* Profile & Secondary Modules Drawer */}
      <MoreMenuDrawer
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
      />
    </div>
  );
};
