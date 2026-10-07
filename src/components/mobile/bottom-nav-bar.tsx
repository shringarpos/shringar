import React from "react";
import { useLocation, useNavigate } from "react-router";
import { theme } from "antd";
import { LayoutGrid, ShoppingCart, ReceiptIcon, Coins, Menu } from "lucide-react";

interface BottomNavBarProps {
  onOpenMore: () => void;
  isMoreOpen?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  onOpenMore,
  isMoreOpen = false,
}) => {
  const { token } = theme.useToken();
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname;

  const tabs = [
    {
      key: "dashboard",
      label: "Home",
      icon: LayoutGrid,
      path: "/",
      isActive: currentPath === "/" || currentPath === "/dashboard",
    },
    {
      key: "pos",
      label: "New Sale",
      icon: ShoppingCart,
      path: "/sales/new",
      isActive: currentPath.startsWith("/sales"),
    },
    {
      key: "invoices",
      label: "Invoices",
      icon: ReceiptIcon,
      path: "/invoices",
      isActive: currentPath.startsWith("/invoices"),
    },
    {
      key: "gold_ledger",
      label: "Gold Loan",
      icon: Coins,
      path: "/gold-ledger",
      isActive: currentPath.startsWith("/gold-ledger"),
    },
    {
      key: "more",
      label: "More",
      icon: Menu,
      isAction: true,
      onClick: onOpenMore,
      isActive: isMoreOpen,
    },
  ];

  return (
    <nav
      data-testid="mobile-bottom-nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        backgroundColor: token.colorBgElevated,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)",
        paddingTop: 6,
        paddingLeft: 8,
        paddingRight: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.05)",
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.isActive;
        const activeColor = token.colorPrimary;
        const inactiveColor = token.colorTextSecondary;

        return (
          <button
            key={tab.key}
            data-testid={`mobile-nav-${tab.key}`}
            onClick={() => {
              if (tab.isAction && tab.onClick) {
                tab.onClick();
              } else if (tab.path) {
                navigate(tab.path);
              }
            }}
            type="button"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              padding: "4px 2px",
              cursor: "pointer",
              outline: "none",
              transition: "all 0.2s ease",
              userSelect: "none",
              WebkitTapHighlightColor: "transparent",
              minHeight: 48,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 38,
                height: 28,
                borderRadius: 14,
                backgroundColor: active ? token.colorPrimaryBg : "transparent",
                color: active ? activeColor : inactiveColor,
                transition: "background-color 0.2s ease, color 0.2s ease",
              }}
            >
              <Icon size={19} strokeWidth={active ? 2.3 : 1.8} />
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: active ? 600 : 500,
                color: active ? activeColor : inactiveColor,
                marginTop: 2,
                lineHeight: 1,
                letterSpacing: "-0.2px",
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
