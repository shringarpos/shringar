import React from "react";
import { useNavigate } from "react-router";
import { Card, theme, Typography } from "antd";
import {
  Gem,
  LayoutGrid,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  UserPlus,
} from "lucide-react";

const { Text } = Typography;

interface QuickAction {
  label: string;
  description: string;
  icon: React.ReactNode;
  path: string;
}

const ACTIONS: QuickAction[] = [
  {
    label: "New Sale",
    description: "Create invoice",
    icon: <ShoppingCart size={20} />,
    path: "/create-sale",
  },
  {
    label: "Add Customer",
    description: "Register new customer",
    icon: <UserPlus size={20} />,
    path: "/customers?create-customer=true",
  },
  {
    label: "Add Ornament",
    description: "Add to inventory",
    icon: <Gem size={20} />,
    path: "/inventory/ornaments",
  },
  {
    label: "Update Rates",
    description: "Set today's metal rate",
    icon: <TrendingUp size={20} />,
    path: "/metal-rates",
  },
  {
    label: "Invoices",
    description: "View all transactions",
    icon: <ReceiptText size={20} />,
    path: "/invoices",
  },
  {
    label: "Categories",
    description: "Manage ornament types",
    icon: <LayoutGrid size={20} />,
    path: "/inventory/categories",
  },
];

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  const { token } = theme.useToken();

  return (
    <Card title="Quick Actions">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {ACTIONS.map((action) => (
          <div
            key={action.label}
            onClick={() => navigate(action.path)}
            style={{
              flex: "1 1 140px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: token.borderRadiusLG,
              cursor: "pointer",
              border: `1px solid ${token.colorPrimaryBorder}`,
              backgroundColor: token.colorBgBlur,
              transition: "box-shadow 0.15s ease, background-color 0.15s ease",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = token.colorBgBase;
              (e.currentTarget as HTMLDivElement).style.boxShadow = token.colorBgBlur;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = token.colorBgBlur;
              (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: token.borderRadius,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: token.colorPrimary,
              }}
            >
              {action.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <Text strong style={{ fontSize: 13, display: "block", lineHeight: 1.3, color: token.colorPrimaryText }}>
                {action.label}
              </Text>
              <Text
                type="secondary"
                style={{
                  fontSize: 11,
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {action.description}
              </Text>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
