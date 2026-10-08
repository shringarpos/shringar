import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
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
} from "lucide-react";
import type { ICustomer } from "../../libs/interfaces";
import { useShopCheck } from "../../hooks/use-shop-check";
import { CustomerModal } from "./customer-modal";
import { CustomerShowModal } from "./customer-show-modal";

const { Title, Text } = Typography;

export const MobileCustomerList: React.FC = () => {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const { shops } = useShopCheck();
  const shopId = shops?.[0]?.id;

  const [searchTerm, setSearchTerm] = useState("");
  const [showCustomer, setShowCustomer] = useState<ICustomer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<ICustomer | null>(null);

  // Modal form for creating/editing customer (retained as backup for edit)
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
        c.phone?.toLowerCase().includes(term) ||
        c.customer_code?.toLowerCase().includes(term) ||
        c.address?.toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  const handleCreateNew = () => {
    navigate("/customers/new");
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

      {/* Search Input (shell header already sticky — no nested sticky here) */}
      <div
        style={{
          backgroundColor: token.colorBgLayout,
          padding: "4px 0",
        }}
      >
        <Input
          prefix={<Search size={16} color={token.colorTextPlaceholder} style={{ marginRight: 4 }} />}
          placeholder="Search by name, phone or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
          inputMode="search"
          style={{
            height: 42,
            borderRadius: 12,
            fontSize: 14,
            backgroundColor: token.colorBgElevated,
            border: `1px solid ${token.colorBorderSecondary}`,
          }}
        />
      </div>

      {/* Customers List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                backgroundColor: token.colorBgElevated,
                borderRadius: 14,
                padding: 14,
                border: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <Skeleton active avatar paragraph={{ rows: 1 }} />
            </div>
          ))
        ) : filteredCustomers.length === 0 ? (
          <Empty
            description={
              <div style={{ padding: "16px 0" }}>
                <Text type="secondary">No clients found matching your query</Text>
                {searchTerm && (
                  <div style={{ marginTop: 8 }}>
                    <Button size="small" onClick={() => setSearchTerm("")}>
                      Clear Search
                    </Button>
                  </div>
                )}
              </div>
            }
          />
        ) : (
          filteredCustomers.map((c) => {
            const rawDigits = cleanPhone(c.phone);
            const initials = c.name
              ? c.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "C";

            return (
              <div
                key={c.id}
                onClick={() => setShowCustomer(c)}
                style={{
                  backgroundColor: token.colorBgElevated,
                  borderRadius: 14,
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  cursor: "pointer",
                }}
              >
                {/* Top Row: Avatar, Name, Code, and Call Action */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    <Avatar
                      style={{
                        backgroundColor: token.colorPrimary,
                        color: token.colorTextLightSolid,
                        fontWeight: 700,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                      size={36}
                    >
                      {initials}
                    </Avatar>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Text
                          strong
                          style={{
                            fontSize: 14,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.name}
                        </Text>
                        {!c.is_active && (
                          <Tag color="default" style={{ margin: 0, fontSize: 10, padding: "0 4px" }}>
                            Inactive
                          </Tag>
                        )}
                      </div>

                      {c.customer_code && (
                        <span
                          style={{
                            fontSize: 11,
                            color: token.colorPrimary,
                            fontWeight: 600,
                            fontFamily: "monospace",
                          }}
                        >
                          #{c.customer_code}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Call action button */}
                  {rawDigits && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <a
                        href={`https://wa.me/91${rawDigits}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: "#f0fdf4",
                          color: "#16a34a",
                          border: "1px solid #bbf7d0",
                          textDecoration: "none",
                        }}
                        aria-label="WhatsApp chat"
                      >
                        <MessageCircle size={15} />
                      </a>

                      <a
                        href={`tel:${c.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          padding: "0 10px",
                          height: 44,
                          backgroundColor: token.colorPrimaryBg,
                          color: token.colorPrimary,
                          border: `1px solid ${token.colorPrimaryBorder}`,
                          borderRadius: 18,
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
                    justifyContent: "flex-end",
                    gap: 8,
                    paddingTop: 6,
                    borderTop: `1px dashed ${token.colorBorderSecondary}`,
                  }}
                >
                  <Button
                    size="small"
                    icon={<Eye size={13} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCustomer(c);
                    }}
                    style={{
                      borderRadius: 8,
                      fontSize: 12,
                      height: 44,
                      padding: "0 14px",
                    }}
                  >
                    View
                  </Button>
                  <Button
                    size="small"
                    icon={<Edit size={13} />}
                    onClick={(e) => handleEdit(c, e)}
                    style={{
                      borderRadius: 8,
                      fontSize: 12,
                      height: 44,
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
