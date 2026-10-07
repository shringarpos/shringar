import React, { useContext } from "react";
import { useLocation, useNavigate } from "react-router";
import { LayoutGrid, ShoppingCart, ReceiptIcon, Coins, Menu } from "lucide-react";
import { ColorModeContext } from "../../contexts/color-mode";

interface BottomNavBarProps {
  onOpenMore: () => void;
  isMoreOpen?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  onOpenMore,
  isMoreOpen = false,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode } = useContext(ColorModeContext);
  const isDark = mode === "dark";

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
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        backgroundColor: isDark ? "rgba(0, 0, 0, 0.88)" : "rgba(255, 255, 255, 0.92)",
        borderTop: isDark ? "1px solid #27272a" : "1px solid rgba(15, 23, 42, 0.08)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 10px)",
        paddingTop: 8,
        paddingLeft: 8,
        paddingRight: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        boxShadow: isDark ? "0 -4px 20px rgba(0, 0, 0, 0.5)" : "0 -4px 20px rgba(0, 0, 0, 0.05)",
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.isActive;
        const activeColor = isDark ? "#60a5fa" : "#2563eb";
        const inactiveColor = isDark ? "#94a3b8" : "#475569";

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
              userSelect: "none",
              WebkitTapHighlightColor: "transparent",
              minHeight: 50,
              touchAction: "manipulation",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 30,
                borderRadius: 15,
                backgroundColor: active
                  ? isDark
                    ? "rgba(37, 99, 235, 0.28)"
                    : "rgba(37, 99, 235, 0.12)"
                  : "transparent",
                color: active ? activeColor : inactiveColor,
                transition: "background-color 0.2s ease, color 0.2s ease",
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: active ? 700 : 600,
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
