import React, { useState, useMemo, useEffect } from "react";
import { useList, useCreate, useUpdate, useGetIdentity } from "@refinedev/core";
import { useNavigate } from "react-router";
import {
  Typography,
  Input,
  Button,
  Tag,
  Avatar,
  Drawer,
  InputNumber,
  message,
  theme,
  Spin,
  Empty,
  Form,
} from "antd";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  ChevronRight,
  ArrowLeft,
  CheckCircle,
  CreditCard,
  Banknote,
  QrCode,
  Building2,
  UserPlus,
  X,
} from "lucide-react";
import dayjs from "dayjs";
import { useShopCheck } from "../../hooks/use-shop-check";
import type {
  ICustomer,
  IOrnamentWithDetails,
  IMetalRate,
  IInvoice,
  IInvoiceItem,
  IOrnament,
} from "../../libs/interfaces";

const { Title, Text } = Typography;

interface CartItem {
  ornament: IOrnamentWithDetails;
  quantity: number;
  weightGrams: number;
  ratePerGram: number;
  makingChargePaise: number;
  totalPaise: number;
}

export const MobilePOS: React.FC<{
  onBackToDesktop?: () => void;
  mode?: string;
  existingInvoice?: any;
}> = () => {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const { shops } = useShopCheck();
  const shopId = shops?.[0]?.id;

  const { data: identity } = useGetIdentity<{ id: string }>();
  const userId = identity?.id;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMetalFilter, setSelectedMetalFilter] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);
  const [checkoutDrawerOpen, setCheckoutDrawerOpen] = useState(false);
  const [showQuickAddClient, setShowQuickAddClient] = useState(false);
  const [quickClientName, setQuickClientName] = useState("");
  const [quickClientPhone, setQuickClientPhone] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  const [paymentMode, setPaymentMode] = useState<string>("CASH");
  const [cashTendered, setCashTendered] = useState<number | null>(null);
  const [discountPaise, setDiscountPaise] = useState<number>(0);
  const [paidPaise, setPaidPaise] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch Customers
  const { query: customersQuery } = useList<ICustomer>({
    resource: "customers",
    filters: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { mode: "server", pageSize: 100 },
    queryOptions: { enabled: !!shopId },
  });

  // 2. Fetch Ornaments
  const { query: ornamentsQuery } = useList<IOrnamentWithDetails>({
    resource: "ornaments",
    meta: {
      select: "*, metal_type:metal_types(id,name), purity_level:purity_levels(id,display_name,purity_value)",
    },
    filters: shopId
      ? [
          { field: "shop_id", operator: "eq", value: shopId },
          { field: "quantity", operator: "gt", value: 0 },
        ]
      : [],
    pagination: { mode: "server", pageSize: 60 },
    queryOptions: { enabled: !!shopId },
  });

  // 3. Fetch Today's Metal Rates from ornament_rates
  const { query: ratesQuery } = useList<IMetalRate>({
    resource: "ornament_rates",
    filters: shopId
      ? [
          { field: "shop_id", operator: "eq", value: shopId },
          { field: "rate_date", operator: "eq", value: dayjs().format("YYYY-MM-DD") },
        ]
      : [],
    queryOptions: { enabled: !!shopId },
  });

  const { mutateAsync: createInvoice } = useCreate<IInvoice>();
  const { mutateAsync: createInvoiceItem } = useCreate<IInvoiceItem>();
  const { mutateAsync: updateOrnament } = useUpdate<IOrnament>();
  const { mutateAsync: createCustomer } = useCreate<ICustomer>();

  const customers = (customersQuery?.data?.data ?? []) as ICustomer[];
  const ornaments = (ornamentsQuery?.data?.data ?? []) as IOrnamentWithDetails[];
  const rates = (ratesQuery?.data?.data ?? []) as IMetalRate[];

  // Auto-select first customer or Walk-in if not yet selected
  useEffect(() => {
    if (!selectedCustomerId && customers.length > 0) {
      const walkIn = customers.find((c) =>
        c.name.toLowerCase().includes("walk-in") || c.name.toLowerCase().includes("walk in")
      );
      if (walkIn) {
        setSelectedCustomerId(walkIn.id);
      } else {
        setSelectedCustomerId(customers[0].id);
      }
    }
  }, [customers, selectedCustomerId]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm.trim()) return customers;
    const q = customerSearchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.customer_code?.toLowerCase().includes(q)
    );
  }, [customers, customerSearchTerm]);

  // Filter ornaments by search and metal
  const filteredOrnaments = useMemo(() => {
    return ornaments.filter((orn) => {
      const matchSearch =
        !searchTerm ||
        orn.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orn.sku?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchMetal =
        selectedMetalFilter === "all" ||
        orn.metal_type?.name?.toLowerCase() === selectedMetalFilter.toLowerCase();

      return matchSearch && matchMetal;
    });
  }, [ornaments, searchTerm, selectedMetalFilter]);

  // Cart calculation helper
  const calculateItemTotal = (orn: IOrnamentWithDetails, qty: number) => {
    const weight = ((orn.weight_mg ? orn.weight_mg / 1000 : 1) || 1) * qty;
    const rateItem = rates.find((r) => r.metal_type_id === orn.metal_type_id);
    const ratePerGram = rateItem?.rate_per_gram_paise || 700000;
    const metalVal = weight * ratePerGram;
    const makingPaise = (orn.purchase_making_charge_paise || 35000) * qty;
    return {
      weightGrams: weight,
      ratePerGram,
      makingChargePaise: makingPaise,
      totalPaise: Math.round(metalVal + makingPaise),
    };
  };

  const handleAddToCart = (orn: IOrnamentWithDetails) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.ornament.id === orn.id);
      if (existing) {
        const newQty = existing.quantity + 1;
        const calc = calculateItemTotal(orn, newQty);
        return prev.map((item) =>
          item.ornament.id === orn.id
            ? {
                ...item,
                quantity: newQty,
                ...calc,
              }
            : item
        );
      }
      const calc = calculateItemTotal(orn, 1);
      return [
        ...prev,
        {
          ornament: orn,
          quantity: 1,
          ...calc,
        },
      ];
    });
  };

  const handleUpdateQty = (ornId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.ornament.id === ornId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            const calc = calculateItemTotal(item.ornament, newQty);
            return {
              ...item,
              quantity: newQty,
              ...calc,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveItem = (ornId: string) => {
    setCart((prev) => prev.filter((item) => item.ornament.id !== ornId));
  };

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalPaise = cart.reduce((sum, item) => sum + item.totalPaise, 0);
  const gstPaise = Math.round(subtotalPaise * 0.03); // 3% GST
  const grandTotalPaise = Math.max(0, subtotalPaise + gstPaise - discountPaise);
  const grandTotalRs = Math.round(grandTotalPaise / 100);
  const effectivePaid = paidPaise !== null ? paidPaise : grandTotalPaise;
  const balancePaise = Math.max(0, grandTotalPaise - effectivePaid);
  const changeDueRs =
    paymentMode === "CASH" && cashTendered !== null && cashTendered > grandTotalRs
      ? cashTendered - grandTotalRs
      : 0;

  // Handler for Quick Client Creation inside the POS drawer
  const handleCreateQuickClient = async () => {
    if (!quickClientName.trim()) {
      message.error("Please enter client name");
      return;
    }
    if (!shopId) return;

    setCreatingClient(true);
    try {
      const res = await createCustomer({
        resource: "customers",
        values: {
          name: quickClientName.trim(),
          phone: quickClientPhone.trim() || null,
          shop_id: shopId,
          created_by: userId,
          updated_by: userId,
          is_active: true,
        },
      });

      const newId = res?.data?.id;
      if (newId) {
        setSelectedCustomerId(newId);
        message.success(`Client ${quickClientName} added and selected!`);
      }
      setShowQuickAddClient(false);
      setQuickClientName("");
      setQuickClientPhone("");
      await customersQuery?.refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create client";
      message.error(msg);
    } finally {
      setCreatingClient(false);
    }
  };

  // Handler to select or create a Walk-in Customer
  const handleSelectWalkIn = async () => {
    const walkIn = customers.find((c) =>
      c.name.toLowerCase().includes("walk-in") || c.name.toLowerCase().includes("walk in")
    );
    if (walkIn) {
      setSelectedCustomerId(walkIn.id);
      setCustomerDrawerOpen(false);
      return;
    }

    // Auto-create a Walk-in Customer record so DB foreign key / NOT NULL constraint is satisfied
    if (!shopId) return;
    try {
      const res = await createCustomer({
        resource: "customers",
        values: {
          name: "Walk-in Customer",
          phone: "9999999999",
          shop_id: shopId,
          created_by: userId,
          updated_by: userId,
          is_active: true,
        },
      });
      if (res?.data?.id) {
        setSelectedCustomerId(res.data.id);
      }
      await customersQuery?.refetch();
      setCustomerDrawerOpen(false);
    } catch {
      message.error("Could not set walk-in customer");
    }
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      message.error("Cart is empty");
      return;
    }
    if (!shopId) {
      message.error("No active shop found");
      return;
    }
    if (!selectedCustomerId) {
      message.warning("Please select a client for this invoice");
      setCheckoutDrawerOpen(false);
      setCustomerDrawerOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create Invoice with Postgres-compliant columns only
      const invoiceRes = await createInvoice({
        resource: "invoices",
        values: {
          shop_id: shopId,
          customer_id: selectedCustomerId,
          invoice_date: dayjs().format("YYYY-MM-DD"),
          subtotal_amount_paise: subtotalPaise,
          total_making_charges_paise: cart.reduce((sum, i) => sum + i.makingChargePaise, 0),
          discount_amount_paise: discountPaise,
          total_amount_paise: grandTotalPaise,
          notes: paymentMode ? `Paid via ${paymentMode}` : null,
          created_by: userId,
          updated_by: userId,
        },
      });

      const newInvId = invoiceRes?.data?.id;

      // 2. Create Items & decrement stock
      for (const item of cart) {
        await createInvoiceItem({
          resource: "invoice_items",
          values: {
            invoice_id: newInvId,
            ornament_id: item.ornament.id,
            item_name: item.ornament.name,
            quantity: item.quantity,
            weight_mg: item.ornament.weight_mg || Math.round(item.weightGrams * 1000),
            metal_type_name: item.ornament.metal_type?.name || "Gold",
            purity_value: item.ornament.purity_level?.purity_value || 916,
            purity_display_name: item.ornament.purity_level?.display_name || "22K",
            rate_per_gram_paise: item.ratePerGram,
            making_charge_per_gram_paise: Math.round(item.makingChargePaise / item.weightGrams),
            metal_amount_paise: item.totalPaise - item.makingChargePaise,
            making_charge_amount_paise: item.makingChargePaise,
            line_total_paise: item.totalPaise,
          },
        });

        // Decrement stock
        if (item.ornament.id) {
          const currentQty = item.ornament.quantity ?? 1;
          await updateOrnament({
            resource: "ornaments",
            id: item.ornament.id,
            values: {
              quantity: Math.max(0, currentQty - item.quantity),
              updated_by: userId,
            },
          });
        }
      }

      message.success("Invoice created successfully!");
      setCart([]);
      setCheckoutDrawerOpen(false);
      navigate(`/invoices/show/${newInvId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create invoice";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const paymentModes = [
    { key: "CASH", label: "Cash", icon: Banknote, color: "#16a34a" },
    { key: "UPI", label: "UPI / QR", icon: QrCode, color: "#2563eb" },
    { key: "CARD", label: "Card", icon: CreditCard, color: "#9333ea" },
    { key: "NET_BANKING", label: "Bank Transfer", icon: Building2, color: "#d97706" },
  ];

  return (
    <div
      data-testid="mobile-pos"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        paddingBottom: 96,
      }}
    >
      {/* Top Header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "2px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Button
            type="text"
            icon={<ArrowLeft size={18} />}
            onClick={() => navigate("/dashboard")}
            style={{ padding: "4px 8px" }}
          />
          <Title level={4} style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            POS Checkout
          </Title>
        </div>

        <Tag
          color="gold"
          style={{
            margin: 0,
            borderRadius: 12,
            padding: "2px 8px",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {dayjs().format("D MMM")}
        </Tag>
      </div>

      {/* Prominent Full-Width Customer Selection Banner Strip */}
      <div
        onClick={() => setCustomerDrawerOpen(true)}
        role="button"
        tabIndex={0}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderRadius: 14,
          backgroundColor: selectedCustomer ? token.colorPrimaryBg : token.colorBgElevated,
          border: `1px solid ${selectedCustomer ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
          cursor: "pointer",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          transition: "all 0.15s ease",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          <Avatar
            size={36}
            style={{
              backgroundColor: selectedCustomer ? token.colorPrimary : token.colorFillAlter,
              color: selectedCustomer ? "#fff" : token.colorTextSecondary,
              flexShrink: 0,
            }}
          >
            {selectedCustomer ? (
              (selectedCustomer.name?.[0] || "C").toUpperCase()
            ) : (
              <User size={16} />
            )}
          </Avatar>

          <div style={{ minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: token.colorTextSecondary,
                display: "block",
                fontWeight: 600,
              }}
            >
              Customer
            </span>
            <Text
              strong
              style={{
                fontSize: 14,
                display: "block",
                lineHeight: 1.2,
                color: selectedCustomer ? token.colorPrimary : token.colorText,
              }}
              ellipsis
            >
              {selectedCustomer ? selectedCustomer.name : "Select or Add Customer"}
            </Text>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4, color: token.colorPrimary }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Change</span>
          <ChevronRight size={14} />
        </div>
      </div>

      {/* Ornament Search & Category Pills */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Input
          prefix={<Search size={16} color={token.colorTextPlaceholder} />}
          placeholder="Search items or scan barcode..."
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

        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            scrollbarWidth: "none",
            paddingBottom: 2,
          }}
        >
          {["all", "gold", "silver", "diamond"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedMetalFilter(cat)}
              style={{
                padding: "8px 16px",
                minHeight: 44,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 18,
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
                whiteSpace: "nowrap",
                backgroundColor:
                  selectedMetalFilter === cat
                    ? token.colorPrimary
                    : token.colorBgElevated,
                color:
                  selectedMetalFilter === cat ? "#fff" : token.colorTextSecondary,
                boxShadow:
                  selectedMetalFilter === cat
                    ? "0 2px 6px rgba(37, 99, 235, 0.2)"
                    : "none",
              }}
            >
              {cat === "all" ? "All Items" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Cart Summary Card */}
      {cart.length > 0 && (
        <div
          style={{
            backgroundColor: token.colorBgElevated,
            borderRadius: 14,
            padding: "12px 14px",
            border: `1px solid ${token.colorBorderSecondary}`,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: token.colorText }}>
              Cart ({totalItemsCount} items)
            </span>
            <Button
              type="link"
              size="small"
              danger
              onClick={() => setCart([])}
              style={{ padding: 0, height: "auto", fontSize: 12 }}
            >
              Clear Cart
            </Button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {cart.map((item) => (
              <div
                key={item.ornament.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: 12,
                  backgroundColor: token.colorFillAlter,
                }}
              >
                <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                  <Text strong style={{ fontSize: 13, display: "block" }} ellipsis>
                    {item.ornament.name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {item.weightGrams}g • ₹{(item.totalPaise / 100).toLocaleString("en-IN")}
                  </Text>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Stepper with generous 36px touch target */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      backgroundColor: token.colorBgElevated,
                      borderRadius: 8,
                      border: `1px solid ${token.colorBorderSecondary}`,
                      overflow: "hidden",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.ornament.id, -1)}
                      style={{
                        width: 32,
                        height: 32,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "none",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <Minus size={13} />
                    </button>
                    <span style={{ width: 24, textAlign: "center", fontSize: 12, fontWeight: 700 }}>
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.ornament.id, 1)}
                      style={{
                        width: 32,
                        height: 32,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "none",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.ornament.id)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: token.colorError,
                      padding: 6,
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Catalog Grid */}
      <div>
        <Text strong style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, color: token.colorTextSecondary }}>
          Catalog Items ({filteredOrnaments.length})
        </Text>

        {ornamentsQuery.isLoading ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Spin />
          </div>
        ) : filteredOrnaments.length === 0 ? (
          <Empty description="No ornaments found" style={{ margin: "24px 0" }} />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
              gap: 10,
              marginTop: 8,
            }}
          >
            {filteredOrnaments.map((orn) => {
              const weight = orn.weight_mg ? (orn.weight_mg / 1000).toFixed(2) : "1.00";
              const calc = calculateItemTotal(orn, 1);
              const inCartItem = cart.find((i) => i.ornament.id === orn.id);

              return (
                <div
                  key={orn.id}
                  style={{
                    backgroundColor: token.colorBgElevated,
                    borderRadius: 14,
                    padding: "10px 10px 12px",
                    border: `1px solid ${inCartItem ? token.colorPrimary : token.colorBorderSecondary}`,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 8,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                    minWidth: 0,
                    maxWidth: "100%",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <Tag color="gold" style={{ margin: 0, fontSize: 10, borderRadius: 6, flexShrink: 0 }}>
                        {orn.purity_level?.display_name || "22K"}
                      </Tag>
                      <span style={{ fontSize: 11, color: token.colorTextSecondary, whiteSpace: "nowrap" }}>
                        {weight}g
                      </span>
                    </div>

                    <Typography.Paragraph
                      strong
                      ellipsis={{ rows: 2, tooltip: orn.name }}
                      style={{ fontSize: 13, marginTop: 4, marginBottom: 0, minHeight: 36, lineHeight: "18px", overflowWrap: "break-word" }}
                    >
                      {orn.name}
                    </Typography.Paragraph>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      #{orn.sku || "ORN"}
                    </Text>
                  </div>

                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: token.colorText, display: "block", marginBottom: 6 }}>
                      ₹{Math.round(calc.totalPaise / 100).toLocaleString("en-IN")}
                    </span>

                    <Button
                      data-testid="mobile-pos-add-item"
                      type={inCartItem ? "primary" : "default"}
                      size="small"
                      icon={inCartItem ? <CheckCircle size={12} /> : <Plus size={12} />}
                      onClick={() => handleAddToCart(orn)}
                      style={{
                        width: "100%",
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 11,
                        height: 44,
                        minHeight: 44,
                        padding: "0 10px",
                      }}
                    >
                      {inCartItem ? inCartItem.quantity : "Add"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky Bottom Checkout Dock */}
      {cart.length > 0 && (
        <div
          data-testid="mobile-pos-checkout-dock"
          style={{
            position: "fixed",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 64px)",
            left: 0,
            right: 0,
            padding: "10px 16px",
            backgroundColor: token.colorBgElevated,
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
            zIndex: 99,
          }}
        >
          <div>
            <span style={{ fontSize: 11, color: token.colorTextSecondary, display: "block" }}>
              {totalItemsCount} {totalItemsCount === 1 ? "item" : "items"} in cart
            </span>
            <span style={{ fontSize: 17, fontWeight: 800, color: token.colorText }}>
              ₹{(grandTotalPaise / 100).toLocaleString("en-IN")}
            </span>
          </div>

          <Button
            type="primary"
            icon={<ShoppingCart size={16} />}
            onClick={() => setCheckoutDrawerOpen(true)}
            style={{
              height: 44,
              borderRadius: 12,
              padding: "0 20px",
              fontWeight: 700,
              fontSize: 14,
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
            }}
          >
            Review & Pay
          </Button>
        </div>
      )}

      {/* Customer Selection Drawer with Search & Quick Inline Add */}
      <Drawer
        title="Select Client"
        placement="bottom"
        height="80%"
        open={customerDrawerOpen}
        onClose={() => setCustomerDrawerOpen(false)}
        styles={{ body: { padding: "16px 16px" } }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Quick Create Mode */}
          {showQuickAddClient ? (
            <div
              style={{
                backgroundColor: token.colorFillAlter,
                borderRadius: 14,
                padding: 14,
                border: `1px solid ${token.colorPrimaryBorder}`,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Quick Add Client</span>
                <Button
                  type="text"
                  size="small"
                  icon={<X size={14} />}
                  onClick={() => setShowQuickAddClient(false)}
                />
              </div>

              <Input
                placeholder="Client Name *"
                value={quickClientName}
                onChange={(e) => setQuickClientName(e.target.value)}
                style={{ height: 38, borderRadius: 8 }}
              />

              <Input
                placeholder="Phone Number (optional)"
                value={quickClientPhone}
                onChange={(e) => setQuickClientPhone(e.target.value)}
                style={{ height: 38, borderRadius: 8 }}
              />

              <Button
                type="primary"
                loading={creatingClient}
                onClick={handleCreateQuickClient}
                style={{ height: 38, borderRadius: 8, fontWeight: 600 }}
              >
                Save & Select Client
              </Button>
            </div>
          ) : (
            <>
              {/* Customer Search Bar */}
              <Input
                prefix={<Search size={16} color={token.colorTextPlaceholder} />}
                placeholder="Search name, phone or code..."
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                allowClear
                style={{ height: 42, borderRadius: 10 }}
              />

              {/* Walk-in Option */}
              <div
                onClick={handleSelectWalkIn}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  backgroundColor: !selectedCustomerId ? token.colorPrimaryBg : token.colorFillAlter,
                  border: `1px solid ${!selectedCustomerId ? token.colorPrimary : token.colorBorderSecondary}`,
                  cursor: "pointer",
                }}
              >
                <Text strong style={{ fontSize: 13 }}>Walk-in Customer</Text>
                <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                  Standard counter sale without client profile
                </Text>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                <Text strong style={{ fontSize: 13 }}>
                  Saved Clients ({filteredCustomers.length})
                </Text>
                <Button
                  type="link"
                  size="small"
                  icon={<UserPlus size={14} />}
                  onClick={() => setShowQuickAddClient(true)}
                >
                  Quick Add
                </Button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "38vh", overflowY: "auto" }}>
                {filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setCustomerDrawerOpen(false);
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      backgroundColor: selectedCustomerId === c.id ? token.colorPrimaryBg : token.colorFillAlter,
                      border: `1px solid ${selectedCustomerId === c.id ? token.colorPrimary : token.colorBorderSecondary}`,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <Text strong style={{ fontSize: 13, display: "block" }}>
                        {c.name}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {c.phone || c.customer_code}
                      </Text>
                    </div>
                    {selectedCustomerId === c.id && (
                      <CheckCircle size={16} color={token.colorPrimary} />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Drawer>

      {/* Checkout & Payment Drawer with 2x2 Payment Grid and Cash Tendered */}
      <Drawer
        title="Order Summary & Payment"
        placement="bottom"
        height="85%"
        open={checkoutDrawerOpen}
        onClose={() => setCheckoutDrawerOpen(false)}
        styles={{ body: { padding: "16px 16px 24px" } }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Price Breakdown */}
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: token.colorFillAlter,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Text type="secondary">Subtotal ({totalItemsCount} items)</Text>
              <Text>₹{(subtotalPaise / 100).toLocaleString("en-IN")}</Text>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Text type="secondary">GST (3%)</Text>
              <Text>₹{(gstPaise / 100).toLocaleString("en-IN")}</Text>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text type="secondary">Discount (₹)</Text>
              <InputNumber
                min={0}
                value={discountPaise / 100}
                onChange={(val) => setDiscountPaise(Math.round((val || 0) * 100))}
                style={{ width: 110 }}
                size="small"
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: 8,
                borderTop: `1px dashed ${token.colorBorderSecondary}`,
              }}
            >
              <Text strong style={{ fontSize: 15 }}>Grand Total</Text>
              <Text strong style={{ fontSize: 16, color: token.colorPrimary }}>
                ₹{(grandTotalPaise / 100).toLocaleString("en-IN")}
              </Text>
            </div>
          </div>

          {/* 2x2 Payment Method Tiles */}
          <div>
            <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
              Select Payment Mode
            </Text>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {paymentModes.map((mode) => {
                const Icon = mode.icon;
                const isSelected = paymentMode === mode.key;
                return (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => setPaymentMode(mode.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 12px",
                      borderRadius: 10,
                      backgroundColor: isSelected ? token.colorPrimaryBg : token.colorBgElevated,
                      border: `1.5px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Icon size={18} color={isSelected ? token.colorPrimary : mode.color} />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? token.colorPrimary : token.colorText,
                      }}
                    >
                      {mode.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Tendered Calculator if Cash is Selected */}
          {paymentMode === "CASH" && (
            <div
              style={{
                padding: "12px",
                borderRadius: 10,
                backgroundColor: token.colorFillAlter,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 12 }}>Cash Tendered (₹)</Text>
                <InputNumber
                  placeholder={grandTotalRs.toString()}
                  value={cashTendered}
                  onChange={(val) => setCashTendered(val)}
                  style={{ width: 130 }}
                  min={0}
                />
              </div>
              {changeDueRs > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Text strong style={{ fontSize: 12, color: token.colorSuccess }}>
                    Change to Return:
                  </Text>
                  <Text strong style={{ fontSize: 14, color: token.colorSuccess }}>
                    ₹{changeDueRs.toLocaleString("en-IN")}
                  </Text>
                </div>
              )}
            </div>
          )}

          {/* Complete Sale CTA */}
          <Button
            type="primary"
            loading={submitting}
            onClick={handleCompleteSale}
            style={{
              height: 48,
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 15,
              marginTop: 6,
            }}
          >
            Confirm & Generate Bill (₹{(grandTotalPaise / 100).toLocaleString("en-IN")})
          </Button>
        </div>
      </Drawer>
    </div>
  );
};
