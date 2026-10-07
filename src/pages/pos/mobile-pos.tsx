import React, { useState, useMemo } from "react";
import {
  useList,
  useCreate,
  useCreateMany,
  useGetIdentity,
} from "@refinedev/core";
import { useNavigate } from "react-router";
import {
  Typography,
  Input,
  Button,
  Tag,
  Avatar,
  Drawer,
  Radio,
  InputNumber,
  message,
  theme,
  Spin,
  Empty,
  Badge,
} from "antd";
import {
  Search,
  ShoppingCart,
  User,
  Plus,
  Minus,
  Trash2,
  ChevronRight,
  ArrowLeft,
  CheckCircle,
  Gem,
  Sparkles,
} from "lucide-react";
import dayjs from "dayjs";
import { useShopCheck } from "../../hooks/use-shop-check";
import type {
  ICustomer,
  IInvoice,
  IInvoiceItem,
  IMetalRate,
  IOrnamentWithDetails,
} from "../../libs/interfaces";

const { Title, Text } = Typography;

interface CartItem {
  ornament: IOrnamentWithDetails;
  quantity: number;
  weightGrams: number;
  ratePerGram: number; // in paise
  makingChargePaise: number;
  totalPaise: number;
}

export const MobilePOS: React.FC<{
  mode?: "create" | "clone";
  existingInvoice?: any;
}> = () => {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const { shops } = useShopCheck();
  const shopId = shops?.[0]?.id;
  const { data: user } = useGetIdentity<{ id: string; email?: string }>();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMetalFilter, setSelectedMetalFilter] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);
  const [checkoutDrawerOpen, setCheckoutDrawerOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<string>("CASH");
  const [discountPaise, setDiscountPaise] = useState<number>(0);
  const [paidPaise, setPaidPaise] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Queries
  const { query: ornamentsQuery } = useList<IOrnamentWithDetails>({
    resource: "ornaments",
    meta: {
      select: "*, metal_type:metal_types(id,name), purity_level:purity_levels(id,purity_value,display_name)",
    },
    filters: [
      ...(shopId ? [{ field: "shop_id", operator: "eq" as const, value: shopId }] : []),
      { field: "is_active", operator: "eq" as const, value: true },
    ],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!shopId },
  });

  const { query: customersQuery } = useList<ICustomer>({
    resource: "customers",
    filters: shopId ? [{ field: "shop_id", operator: "eq" as const, value: shopId }] : [],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!shopId },
  });

  const today = dayjs().format("YYYY-MM-DD");
  const { query: ratesQuery } = useList<IMetalRate>({
    resource: "ornament_rates",
    filters: [
      { field: "shop_id", operator: "eq" as const, value: shopId },
      { field: "rate_date", operator: "eq" as const, value: today },
    ],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!shopId },
  });

  const { mutateAsync: createInvoice } = useCreate<IInvoice>();
  const { mutateAsync: createItems } = useCreateMany<IInvoiceItem>();

  const ornaments = ornamentsQuery?.data?.data ?? [];
  const customers = customersQuery?.data?.data ?? [];
  const rates = ratesQuery?.data?.data ?? [];

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  // Filter ornaments by search and metal
  const filteredOrnaments = useMemo(() => {
    return ornaments.filter((orn) => {
      const matchSearch =
        !searchTerm ||
        orn.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orn.item_code?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchMetal =
        selectedMetalFilter === "all" ||
        orn.metal_type?.name?.toLowerCase() === selectedMetalFilter.toLowerCase();

      return matchSearch && matchMetal;
    });
  }, [ornaments, searchTerm, selectedMetalFilter]);

  // Cart calculation helper
  const calculateItemTotal = (orn: IOrnamentWithDetails, qty: number) => {
    const weight = (orn.net_weight_grams || orn.gross_weight_grams || 1) * qty;
    // Default fallback rate: 7000/g in paise (700000)
    const rateItem = rates.find(
      (r) =>
        r.metal_type_id === orn.metal_type_id &&
        (!orn.purity_level_id || r.purity_level_id === orn.purity_level_id)
    );
    const ratePerGram = rateItem?.rate_per_gram_paise || 700000;
    const metalVal = weight * ratePerGram;
    const makingPaise = (orn.making_charge_value_paise || 35000) * qty;
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
            ? { ...item, quantity: newQty, ...calc }
            : item
        );
      } else {
        const calc = calculateItemTotal(orn, 1);
        return [...prev, { ornament: orn, quantity: 1, ...calc }];
      }
    });
    message.success(`${orn.name} added to cart!`);
  };

  const handleUpdateQty = (ornId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.ornament.id === ornId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            const calc = calculateItemTotal(item.ornament, newQty);
            return { ...item, quantity: newQty, ...calc };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveItem = (ornId: string) => {
    setCart((prev) => prev.filter((item) => item.ornament.id !== ornId));
  };

  // Totals
  const subtotalPaise = cart.reduce((sum, item) => sum + item.totalPaise, 0);
  const gstPaise = Math.round(subtotalPaise * 0.03); // 3% GST
  const grandTotalPaise = Math.max(0, subtotalPaise + gstPaise - discountPaise);
  const effectivePaid = paidPaise !== null ? paidPaise : grandTotalPaise;
  const balancePaise = Math.max(0, grandTotalPaise - effectivePaid);

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      message.error("Please add at least one ornament to checkout.");
      return;
    }
    if (!shopId) {
      message.error("Shop not found.");
      return;
    }

    setSubmitting(true);
    try {
      const invNumber = `INV-${dayjs().format("YYMMDD")}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Create Invoice
      const invRes = await createInvoice({
        resource: "invoices",
        values: {
          shop_id: shopId,
          customer_id: selectedCustomerId || null,
          invoice_number: invNumber,
          invoice_date: today,
          subtotal_paise: subtotalPaise,
          tax_amount_paise: gstPaise,
          discount_paise: discountPaise,
          total_amount_paise: grandTotalPaise,
          paid_amount_paise: effectivePaid,
          balance_amount_paise: balancePaise,
          payment_method: paymentMode,
          payment_status: balancePaise === 0 ? "PAID" : effectivePaid > 0 ? "PARTIAL" : "UNPAID",
          created_by: user?.id || null,
        },
      });

      const newInvId = (invRes?.data as any)?.id;

      // 2. Create Invoice Items
      if (newInvId && cart.length > 0) {
        const itemsToCreate = cart.map((item) => ({
          invoice_id: newInvId,
          ornament_id: item.ornament.id,
          item_name: item.ornament.name,
          quantity: item.quantity,
          gross_weight_grams: item.ornament.gross_weight_grams || item.weightGrams,
          net_weight_grams: item.weightGrams,
          rate_per_gram_paise: item.ratePerGram,
          making_charge_paise: item.makingChargePaise,
          total_price_paise: item.totalPaise,
        }));

        await createItems({
          resource: "invoice_items",
          values: itemsToCreate,
        });
      }

      message.success("Sale completed successfully!");
      setCheckoutDrawerOpen(false);
      setCart([]);
      if (newInvId) {
        navigate(`/invoices/show/${newInvId}`);
      } else {
        navigate("/invoices");
      }
    } catch (err: any) {
      console.error("Sale creation error:", err);
      message.error(err.message || "Failed to create invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="mobile-pos"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        paddingBottom: 90, // safe space for sticky bottom checkout dock
      }}
    >
      {/* Top Header bar with Customer and Back button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
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
            POS Sale
          </Title>
        </div>

        {/* Customer Selector Badge */}
        <button
          type="button"
          onClick={() => setCustomerDrawerOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 20,
            background: token.colorFillAlter,
            border: `1px solid ${token.colorBorderSecondary}`,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            color: token.colorText,
          }}
        >
          <User size={14} color={token.colorPrimary} />
          <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedCustomer ? selectedCustomer.name : "Walk-in Client"}
          </span>
          <ChevronRight size={12} />
        </button>
      </div>

      {/* Search Input & Category Pills */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Input
          prefix={<Search size={16} color={token.colorTextPlaceholder} />}
          placeholder="Search ornaments or item code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
          style={{
            height: 44,
            borderRadius: 12,
            fontSize: 14,
            background: token.colorBgElevated,
          }}
        />

        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 4,
            scrollbarWidth: "none",
          }}
        >
          {["all", "gold", "silver", "diamond"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedMetalFilter(cat)}
              style={{
                padding: "6px 14px",
                borderRadius: 16,
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
                backgroundColor:
                  selectedMetalFilter === cat
                    ? token.colorPrimary
                    : token.colorFillAlter,
                color:
                  selectedMetalFilter === cat ? "#fff" : token.colorTextSecondary,
              }}
            >
              {cat === "all" ? "All Items" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Cart Items (if any in cart) */}
      {cart.length > 0 && (
        <div
          style={{
            backgroundColor: token.colorBgElevated,
            borderRadius: 14,
            padding: 12,
            border: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <Text strong style={{ fontSize: 13 }}>
              Cart ({cart.reduce((s, i) => s + i.quantity, 0)} items)
            </Text>
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
                  padding: "8px 10px",
                  borderRadius: 10,
                  backgroundColor: token.colorFillAlter,
                }}
              >
                <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <Text strong style={{ fontSize: 13, display: "block" }} ellipsis>
                    {item.ornament.name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {item.weightGrams.toFixed(2)}g • ₹{(item.totalPaise / 100).toLocaleString("en-IN")}
                  </Text>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: token.colorBgContainer,
                      borderRadius: 8,
                      padding: "2px 6px",
                      border: `1px solid ${token.colorBorderSecondary}`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.ornament.id, -1)}
                      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 2 }}
                    >
                      <Minus size={12} />
                    </button>
                    <span style={{ fontSize: 12, fontWeight: 600, minWidth: 16, textAlign: "center" }}>
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.ornament.id, 1)}
                      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 2 }}
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.ornament.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: token.colorError,
                      padding: 4,
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

      {/* Ornament Product Catalog Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Text strong style={{ fontSize: 14 }}>
          Available Ornaments ({filteredOrnaments.length})
        </Text>

        {ornamentsQuery?.isLoading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spin />
          </div>
        ) : filteredOrnaments.length === 0 ? (
          <Empty description="No ornaments found" style={{ margin: "24px 0" }} />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {filteredOrnaments.map((orn) => {
              const weight = orn.net_weight_grams || orn.gross_weight_grams || 1;
              const calc = calculateItemTotal(orn, 1);
              const inCartItem = cart.find((i) => i.ornament.id === orn.id);

              return (
                <div
                  key={orn.id}
                  style={{
                    backgroundColor: token.colorBgElevated,
                    borderRadius: 14,
                    padding: 12,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
                      <Tag color="gold" style={{ margin: 0, fontSize: 10, padding: "0 6px", borderRadius: 6 }}>
                        {orn.purity_level?.display_name || "22K"}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 10 }}>
                        {weight}g
                      </Text>
                    </div>

                    <Text strong style={{ fontSize: 13, display: "block", marginTop: 4 }} ellipsis>
                      {orn.name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      #{orn.item_code || "ORN"}
                    </Text>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                    <Text strong style={{ fontSize: 13, color: token.colorPrimary }}>
                      ₹{(calc.totalPaise / 100).toLocaleString("en-IN")}
                    </Text>

                    <Button
                      data-testid="mobile-pos-add-item"
                      type={inCartItem ? "default" : "primary"}
                      size="small"
                      icon={<Plus size={14} />}
                      onClick={() => handleAddToCart(orn)}
                      style={{
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 11,
                        height: 28,
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
      <div
        data-testid="mobile-pos-checkout-dock"
        style={{
          position: "fixed",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 64px)", // sits above mobile tab bar
          left: 0,
          right: 0,
          padding: "10px 16px",
          backgroundColor: token.colorBgElevated,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: "0 -4px 12px rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 1000,
        }}
      >
        <div>
          <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
            {cart.reduce((s, i) => s + i.quantity, 0)} items in cart
          </Text>
          <Text strong style={{ fontSize: 17, color: token.colorPrimary }}>
            ₹{(grandTotalPaise / 100).toLocaleString("en-IN")}
          </Text>
        </div>

        <Button
          type="primary"
          size="large"
          disabled={cart.length === 0}
          onClick={() => setCheckoutDrawerOpen(true)}
          style={{
            height: 44,
            padding: "0 20px",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>Checkout</span>
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* Customer Selection Drawer */}
      <Drawer
        title="Select Customer"
        placement="bottom"
        height="70%"
        open={customerDrawerOpen}
        onClose={() => setCustomerDrawerOpen(false)}
        styles={{ body: { padding: "16px 16px" } }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Walk-in Option */}
          <div
            onClick={() => {
              setSelectedCustomerId(null);
              setCustomerDrawerOpen(false);
            }}
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: !selectedCustomerId ? token.colorPrimaryBg : token.colorFillAlter,
              border: `1px solid ${!selectedCustomerId ? token.colorPrimary : token.colorBorderSecondary}`,
              cursor: "pointer",
            }}
          >
            <Text strong>Walk-in Customer</Text>
            <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
              Standard counter sale without customer profile
            </Text>
          </div>

          <Text strong style={{ fontSize: 13, marginTop: 4 }}>
            Saved Customers ({customers.length})
          </Text>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "40vh", overflowY: "auto" }}>
            {customers.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  setSelectedCustomerId(c.id);
                  setCustomerDrawerOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: 10,
                  backgroundColor: selectedCustomerId === c.id ? token.colorPrimaryBg : token.colorFillAlter,
                  border: `1px solid ${selectedCustomerId === c.id ? token.colorPrimary : token.colorBorderSecondary}`,
                  cursor: "pointer",
                }}
              >
                <div>
                  <Text strong style={{ fontSize: 13 }}>
                    {c.name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    {c.phone || c.customer_code}
                  </Text>
                </div>
                {selectedCustomerId === c.id && <CheckCircle size={16} color={token.colorPrimary} />}
              </div>
            ))}
          </div>
        </div>
      </Drawer>

      {/* Checkout & Payment Drawer */}
      <Drawer
        title="Order Summary & Payment"
        placement="bottom"
        height="85%"
        open={checkoutDrawerOpen}
        onClose={() => setCheckoutDrawerOpen(false)}
        styles={{ body: { padding: "16px 16px 24px" } }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Price Breakdown */}
          <div
            style={{
              backgroundColor: token.colorFillAlter,
              borderRadius: 12,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Text type="secondary">Subtotal (Gold & Making)</Text>
              <Text strong>₹{(subtotalPaise / 100).toLocaleString("en-IN")}</Text>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Text type="secondary">GST (3%)</Text>
              <Text>₹{(gstPaise / 100).toLocaleString("en-IN")}</Text>
            </div>
            {discountPaise > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: token.colorSuccess }}>
                <Text type="success">Discount</Text>
                <Text type="success">-₹{(discountPaise / 100).toLocaleString("en-IN")}</Text>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: `1px solid ${token.colorBorderSecondary}`,
                paddingTop: 8,
              }}
            >
              <Text strong style={{ fontSize: 15 }}>
                Net Amount
              </Text>
              <Text strong style={{ fontSize: 17, color: token.colorPrimary }}>
                ₹{(grandTotalPaise / 100).toLocaleString("en-IN")}
              </Text>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
              Payment Mode
            </Text>
            <Radio.Group
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              buttonStyle="solid"
              style={{ width: "100%", display: "flex" }}
            >
              <Radio.Button value="CASH" style={{ flex: 1, textAlign: "center" }}>
                Cash
              </Radio.Button>
              <Radio.Button value="UPI" style={{ flex: 1, textAlign: "center" }}>
                UPI
              </Radio.Button>
              <Radio.Button value="CARD" style={{ flex: 1, textAlign: "center" }}>
                Card
              </Radio.Button>
              <Radio.Button value="NET_BANKING" style={{ flex: 1, textAlign: "center" }}>
                Bank
              </Radio.Button>
            </Radio.Group>
          </div>

          {/* Complete Sale CTA */}
          <Button
            type="primary"
            size="large"
            loading={submitting}
            onClick={handleCompleteSale}
            block
            style={{
              height: 48,
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 15,
              marginTop: 10,
            }}
          >
            Confirm & Generate Bill (₹{(grandTotalPaise / 100).toLocaleString("en-IN")})
          </Button>
        </div>
      </Drawer>
    </div>
  );
};
