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
} from "antd";
import {
  Search,
  Plus,
  Phone,
  Eye,
  Edit,
  MessageCircle,
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
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { mode: "server", pageSize: 50 },
    queryOptions: { enabled: !!shopId },
  });

  const customers = (query?.data?.data ?? []) as ICustomer[];
  const isLoading = query?.isLoading;

  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const term = searchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.customer_code?.toLowerCase().includes(term) ||
        c.phone?.includes(term) ||
        c.address?.toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  const handleCreateNew = () => {
    setEditingCustomer(null);
    formProps.form?.resetFields();
    showCustomerModal();
  };

  const handleEdit = (c: ICustomer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingCustomer(c);
    showCustomerModal(c.id);
  };

  const cleanPhone = (phone?: string) => {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
  };

  return (
    <div
      data-testid="mobile-customers"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        paddingBottom: "calc(88px + env(safe-area-inset-bottom, 16px))",
        position: "relative",
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
            {filteredCustomers.length} {filteredCustomers.length === 1 ? "client" : "clients"} listed
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

      {/* Sticky Search Input */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backgroundColor: token.colorBgLayout,
          paddingBottom: 4,
        }}
      >
        <Input
          prefix={<Search size={16} color={token.colorTextPlaceholder} />}
          placeholder="Search name, phone, or customer code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
          inputMode="search"
          style={{
            height: 44,
            borderRadius: 12,
            fontSize: 14,
            background: token.colorBgElevated,
            border: `1px solid ${token.colorBorderSecondary}`,
          }}
        />
      </div>

      {/* Customers Cards List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Skeleton active paragraph={{ rows: 2 }} />
            <Skeleton active paragraph={{ rows: 2 }} />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <Empty
            description={
              <span>
                {searchTerm ? "No customers matching your search" : "No customers found"}
              </span>
            }
            style={{ margin: "32px 0" }}
          >
            {searchTerm && (
              <Button size="small" onClick={() => setSearchTerm("")}>
                Clear Search
              </Button>
            )}
          </Empty>
        ) : (
          filteredCustomers.map((c) => {
            const initial = c.name ? c.name[0].toUpperCase() : "C";
            const digits = cleanPhone(c.phone);
            const waNumber = digits.length === 10 ? `91${digits}` : digits;

            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => setShowCustomer(c)}
                style={{
                  backgroundColor: token.colorBgElevated,
                  borderRadius: 14,
                  padding: "12px 14px",
                  border: `1px solid ${token.colorBorderSecondary}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                  cursor: "pointer",
                  transition: "transform 0.1s ease",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {/* Top Row: Avatar, Name & Code */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ position: "relative" }}>
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
                      {c.is_active && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: -1,
                            right: -1,
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: "#16a34a",
                            border: `2px solid ${token.colorBgElevated}`,
                          }}
                        />
                      )}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Text strong style={{ fontSize: 14, color: token.colorText }}>
                          {c.name}
                        </Text>
                      </div>
                      <Tag
                        color="blue"
                        style={{
                          margin: "2px 0 0",
                          fontFamily: "monospace",
                          fontSize: 10,
                          lineHeight: "16px",
                          padding: "0 4px",
                          borderRadius: 4,
                        }}
                      >
                        {c.customer_code}
                      </Tag>
                    </div>
                  </div>

                  {/* 1-Tap Call & WhatsApp Direct Triggers */}
                  {c.phone && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <a
                        href={`https://wa.me/${waNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="WhatsApp customer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: "#f0fdf4",
                          color: "#16a34a",
                          border: "1px solid #bbf7d0",
                          textDecoration: "none",
                        }}
                      >
                        <MessageCircle size={15} />
                      </a>

                      <a
                        href={`tel:${c.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Call customer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          backgroundColor: token.colorPrimaryBg,
                          color: token.colorPrimary,
                          border: `1px solid ${token.colorPrimaryBorder}`,
                          padding: "0 10px",
                          height: 34,
                          borderRadius: 17,
                          fontSize: 12,
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        <Phone size={13} />
                        <span>Call</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Middle Row: Phone & Address */}
                {(c.phone || c.address) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {c.phone && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Phone: {c.phone}
                      </Text>
                    )}
                    {c.address && (
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
                        {c.address}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCustomer(c);
                    }}
                    style={{
                      flex: 1,
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      height: 34,
                    }}
                  >
                    View Ledger
                  </Button>

                  <Button
                    size="small"
                    icon={<Edit size={13} />}
                    onClick={(e) => handleEdit(c, e)}
                    style={{
                      borderRadius: 8,
                      fontSize: 12,
                      height: 34,
                      padding: "0 14px",
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
        open={!!showCustomer}
        record={showCustomer}
        onClose={() => setShowCustomer(null)}
        onEdit={() => {
          const target = showCustomer;
          setShowCustomer(null);
          if (target) {
            handleEdit(target);
          }
        }}
      />

      {/* Create / Edit Customer Modal */}
      <CustomerModal
        action={editingCustomer ? "edit" : "create"}
        modalProps={modalProps}
        formProps={formProps}
        shopId={shopId}
        close={() => {
          setEditingCustomer(null);
          closeCustomerModal();
        }}
        onFinish={formProps.onFinish as any}
      />
    </div>
  );
};
