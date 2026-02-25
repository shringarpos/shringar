import type { RefineThemedLayoutHeaderProps } from "@refinedev/antd";
import { useGetIdentity, useList, useLogout } from "@refinedev/core";
import { LogoutOutlined } from "@ant-design/icons";
import {
  Layout as AntdLayout,
  Avatar,
  Button,
  Divider,
  Popover,
  Space,
  Switch,
  theme,
  Typography,
} from "antd";
import React, { useContext, useState } from "react";
import { ColorModeContext } from "../../contexts/color-mode";
import { HeaderRatesWidget } from "../metal-rates/header-rates-widget";

const { Text } = Typography;
const { useToken } = theme;

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

export const Header: React.FC<RefineThemedLayoutHeaderProps> = ({
  sticky = true,
}) => {
  const { token } = useToken();
  const { data: user } = useGetIdentity<IUser>();
  const { mode, setMode } = useContext(ColorModeContext);
  const { mutate: logout } = useLogout();
  const [popoverOpen, setPopoverOpen] = useState(false);

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
    "";
  const avatarSrc = shop?.logo_url ?? user?.user_metadata?.avatar_url;
  const avatarFallback = displayName?.[0]?.toUpperCase();

  const headerStyles: React.CSSProperties = {
    backgroundColor: token.colorBgElevated,
    display: "flex",
    alignItems: "center",
    padding: "0px 24px",
    height: "64px",
  };

  if (sticky) {
    headerStyles.position = "sticky";
    headerStyles.top = 0;
    headerStyles.zIndex = 1;
  }

  const popoverContent = (
    <div style={{ width: 256 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12 }}>
        <Avatar
          size={52}
          src={avatarSrc}
          style={{ backgroundColor: token.colorPrimary, flexShrink: 0, fontSize: 20 }}
        >
          {avatarFallback}
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <Text strong style={{ display: "block" }} ellipsis>
            {displayName}
          </Text>
          {shop && (
            <Text type="secondary" style={{ fontSize: 11, display: "block" }} ellipsis>
              {shop.name}
              {shop.code ? ` · ${shop.code}` : ""}
            </Text>
          )}
        </div>
      </div>
      <Divider style={{ margin: "0 0 10px" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>Dark mode</Text>
        <Switch
          checkedChildren="🌛"
          unCheckedChildren="🔆"
          onChange={() => setMode(mode === "light" ? "dark" : "light")}
          checked={mode === "dark"}
        />
      </div>
      <Button
        block
        danger
        icon={<LogoutOutlined />}
        onClick={() => {
          setPopoverOpen(false);
          logout();
        }}
      >
        Logout
      </Button>
    </div>
  );

  return (
    <AntdLayout.Header style={headerStyles}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          justifyContent: "space-between",
        }}
      >
        <div />
        <Space size="middle" align="center">
          <HeaderRatesWidget />
          <Popover
            content={popoverContent}
            trigger="click"
            placement="bottomRight"
            open={popoverOpen}
            onOpenChange={setPopoverOpen}
            arrow={false}
          >
            <Avatar
              src={avatarSrc}
              size={36}
              style={{
                backgroundColor: token.colorPrimary,
                cursor: "pointer",
                fontSize: 15,
                flexShrink: 0,
              }}
            >
              {avatarFallback}
            </Avatar>
          </Popover>
        </Space>
      </div>
    </AntdLayout.Header>
  );
};
