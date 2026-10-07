import React, { useState, useMemo } from "react";
import { useList } from "@refinedev/core";
import { useModalForm } from "@refinedev/antd";
import {
  Typography,
  Input,
  Button,
  Tag,
  Avatar,
  Skeleton,
  theme,
  Empty,
  message,
} from "antd";
import {
  Search,
  Plus,
  Phone,
  Eye,
  Edit,
  Share2,
  MapPin,
  UserCheck,
} from "lucide-react";
import type { ICustomer } from "../../libs/interfaces";
import { useShopCheck } from "../../hooks/use-shop-check";
import { CustomerModal } from "./customer-modal";
import { CustomerShowModal } from "./customer-show-modal";

const { Title, Text } = Typography;

export const MobileCustomerList: React.FC = () => {
  const { token } = theme.useToken();
  const { shops } = useShopCheck();
  const shopId = shops?.[0]?.id;

  const [searchTerm, setSearchTerm] = useState("");
  const [showCustomer, setShowCustomer] = useState<ICustomer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<ICustomer | null>(null);

  // Modal form for creating/editing customer
  const {
    modalProps,
    formProps,
    show: showCustomerModal,
    close: closeCustomerModal,
  } = useModalForm<ICustomer>({
    resource: "customers",
    action: editingCustomer ? "edit" : "create",
    id: editingCustomer?.id,
    redirect: false,
    onMutationSuccess: () => {
      setEditingCustomer(null);
      closeCustomerModal();
    },
  });

  const { query } = useList<ICustomer>({
    resource: "customers",
    filters: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
    sorters: [{ field: "name", order: "asc" }],
    pagination: { mode: "server", pageSize: 50 },
    queryOptions: { enabled: !!shopId },
  });

  const customers = (query?.data?.data ?? []) as ICustomer[];
  const isLoading = query?.isLoading;

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(term) ||
        c.customer_code?.toLowerCase().includes(term) ||
        c.phone?.includes(term) ||
        c.city?.toLowerCase().includes(term)
      );
    });
  }, [customers, searchTerm]);

  const handleCreateNew = () => {
    setEditingCustomer(null);
    formProps.form?.resetFields();
    showCustomerModal();
  };

  const handleEdit = (c: ICustomer) => {
    setEditingCustomer(c);
    showCustomerModal(c.id);
  };

  return (
    <div
      data-testid="mobile-customers"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        paddingBottom: 40,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "2px 0",
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            Customers
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {filteredCustomers.length} {filteredCustomers.length === 1 ? "client" : "clients"}
          </Text>
        </div>

        <Button
          data-testid="mobile-new-customer-btn"
          type="primary"
          icon={<Plus size={16} />}
          onClick={handleCreateNew}
          style={{
            height: 38,
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          Add Client
        </Button>
      </div>

      {/* Search Input */}
      <Input
        prefix={<Search size={16} color={token.colorTextPlaceholder} />}
        placeholder="Search name, phone, or customer code..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        allowClear
        style={{
          height: 42,
          borderRadius: 12,
          fontSize: 14,
          background: token.colorBgElevated,
        }}
      />

      {/* Customers Cards List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Skeleton active paragraph={{ rows: 2 }} />
            <Skeleton active paragraph={{ rows: 2 }} />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <Empty description="No customers found" style={{ margin: "32px 0" }} />
        ) : (
          filteredCustomers.map((c) => {
            const initial = c.name ? c.name[0].toUpperCase() : "C";

            return (
              <div
                key={c.id}
                style={{
                  backgroundColor: token.colorBgElevated,
                  borderRadius: 14,
                  padding: "12px 14px",
                  border: `1px solid ${token.colorBorderSecondary}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                }}
              >
                {/* Top Row: Avatar, Name & Code */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar
                      size={40}
                      style={{
                        backgroundColor: token.colorPrimaryBg,
                        color: token.colorPrimary,
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      {initial}
                    </Avatar>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Text strong style={{ fontSize: 14 }}>
                          {c.name}
                        </Text>
                        {c.is_active && (
                          <UserCheck size={13} color={token.colorSuccess} />
                        )}
                      </div>
                      <Tag
                        color="blue"
                        style={{
                          margin: "2px 0 0",
                          fontFamily: "monospace",
                          fontSize: 10,
                          lineHeight: "16px",
                          padding: "0 4px",
                        }}
                      >
                        {c.customer_code}
                      </Tag>
                    </div>
                  </div>

                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        backgroundColor: "#f0fdf4",
                        color: "#16a34a",
                        padding: "6px 10px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      <Phone size={12} />
                      <span>Call</span>
                    </a>
                  )}
                </div>

                {/* Middle Row: Phone & Address */}
                {(c.phone || c.city || c.address) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {c.phone && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Phone: {c.phone}
                      </Text>
                    )}
                    {(c.address || c.city) && (
                      <span
                        style={{
                          fontSize: 11,
                          color: token.colorTextSecondary,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <MapPin size={11} />
                        {[c.address, c.city].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>
                )}

                {/* Bottom Row: Actions */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTop: `1px solid ${token.colorFillAlter}`,
                    paddingTop: 8,
                    gap: 8,
                  }}
                >
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<Eye size={13} />}
                    onClick={() => setShowCustomer(c)}
                    style={{
                      flex: 1,
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      height: 32,
                    }}
                  >
                    Profile
                  </Button>

                  <Button
                    size="small"
                    icon={<Edit size={13} />}
                    onClick={() => handleEdit(c)}
                    style={{
                      borderRadius: 8,
                      fontSize: 12,
                      height: 32,
                    }}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Show Customer Modal */}
      <CustomerShowModal
        customer={showCustomer}
        onClose={() => setShowCustomer(null)}
      />

      {/* Create / Edit Customer Modal */}
      <CustomerModal
        modalProps={modalProps}
        formProps={formProps}
        customer={editingCustomer}
        onClose={() => {
          setEditingCustomer(null);
          closeCustomerModal();
        }}
      />
    </div>
  );
};
