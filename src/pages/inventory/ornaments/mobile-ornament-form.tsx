import React, { useState, useMemo, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router";
import { useList, useGetIdentity, useCreate, useUpdate, useOne } from "@refinedev/core";
import { useSelect } from "@refinedev/antd";
import {
  Form,
  Input,
  InputNumber,
  Button,
  DatePicker,
  Select,
  Typography,
  theme,
  Modal,
  notification,
  Spin,
} from "antd";
import {
  ArrowLeft,
  Gem,
  CircleDot,
  Sparkles,
  Plus,
  Save,
  Check,
  Calculator,
  Percent,
  Tag,
  Package,
  FileText,
  Calendar,
  Layers,
} from "lucide-react";
import dayjs from "dayjs";
import { useShopCheck } from "../../../hooks/use-shop-check";
import type { IOrnament, ICategory, IMetalType, IPurityLevel } from "../../../libs/interfaces";
import { ColorModeContext } from "../../../contexts/color-mode";

const { Title, Text } = Typography;

// ─── SKU helper — ported verbatim from desktop
// `src/components/inventory/ornaments/ornament-drawer.tsx` (READ-ONLY origin).
// Keep the two in sync: same name must yield the same SKU on both forms.
const generateSku = (name: string): string => {
    return name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, ""))
        .filter(Boolean)
        .join("-");
};

interface MobileOrnamentFormProps {
  id?: string;
  action: "create" | "edit";
}

export const MobileOrnamentForm: React.FC<MobileOrnamentFormProps> = ({ id, action }) => {
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const { mode } = useContext(ColorModeContext);
  const isDark = mode === "dark";

  const themeStyles = {
    pageBg: isDark ? "#000000" : "#f1f5f9",
    headerBg: isDark ? "rgba(0, 0, 0, 0.88)" : "rgba(255, 255, 255, 0.90)",
    headerBorder: isDark ? "1px solid #27272a" : "1px solid rgba(15, 23, 42, 0.08)",
    cardBg: isDark ? "#141414" : "#ffffff",
    cardBorder: isDark ? "1px solid #27272a" : "1px solid #e2e8f0",
    cardShadow: isDark ? "0 2px 8px rgba(0,0,0,0.4)" : "0 2px 8px -2px rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.02)",
    textPrimary: isDark ? "#f8fafc" : "#0f172a",
    textSecondary: isDark ? "#94a3b8" : "#64748b",
    labelColor: isDark ? "#f1f5f9" : "#1e293b",
    dockBg: isDark ? "#000000" : "#ffffff",
    dockBorder: isDark ? "1px solid #27272a" : "1px solid rgba(15, 23, 42, 0.08)",
    buttonSecondaryBg: isDark ? "#27272a" : "#f1f5f9",
    buttonSecondaryColor: isDark ? "#f8fafc" : "#334155",
    buttonSecondaryBorder: isDark ? "1px solid #3f3f46" : "1px solid #cbd5e1",
    subCardBg: isDark ? "#1a1a1e" : "#f8fafc",
    subCardBorder: isDark ? "1px solid #27272a" : "1px solid rgba(15, 23, 42, 0.08)",
  };

  const { shops } = useShopCheck();
  const shopId = shops?.[0]?.id;
  const { data: identity } = useGetIdentity<{ id: string }>();
  const userId = identity?.id;

  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [debouncedSku, setDebouncedSku] = useState("");

  // Watch form fields for dynamic calculations and conditional styling
  const selectedMetalTypeId = Form.useWatch("metal_type_id", form);
  const selectedPurityId = Form.useWatch("purity_level_id", form);
  const weightG = Form.useWatch("weight_g", form);
  const metalRateRs = Form.useWatch("purchase_metal_rate_rs", form);
  const makingChargeRs = Form.useWatch("purchase_making_charge_rs", form);
  const nameValue = Form.useWatch("name", form);
  const skuValue = Form.useWatch("sku", form);
  const quantityValue = Form.useWatch("quantity", form);

  // Track whether the user has manually edited SKU (stops auto-gen, desktop parity).
  // Edit mode starts manually-edited so auto-gen never fires over a stored SKU.
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(action === "edit");

  // Load existing ornament if editing
  const { query: recordQuery } = useOne<IOrnament>({
    resource: "ornaments",
    id: id || "",
    queryOptions: { enabled: action === "edit" && !!id },
  });
  const ornament = recordQuery?.data?.data;
  const isRecordLoading = recordQuery?.isLoading;

  // Load active metal types
  const { query: metalsQuery } = useList<IMetalType>({
    resource: "metal_types",
    filters: [{ field: "is_active", operator: "eq", value: true }],
    sorters: [{ field: "name", order: "asc" }],
    pagination: { mode: "off" },
  });
  const metalTypes = (metalsQuery?.data?.data ?? []) as IMetalType[];

  // Gold/silver-only scope: the metal pill grid offers only gold/silver even
  // if metal_types carries other rows. An edit-mode record already on another
  // metal keeps its current value so the form stays truthful.
  const visibleMetalTypes = useMemo(() => {
    const scoped = metalTypes.filter((m) => /gold|silver/i.test(m.name));
    if (
      action === "edit" &&
      ornament &&
      !scoped.some((m) => m.id === ornament.metal_type_id)
    ) {
      const current = metalTypes.find((m) => m.id === ornament.metal_type_id);
      return current ? [...scoped, current] : scoped;
    }
    return scoped;
  }, [metalTypes, action, ornament]);

  // Load purity levels
  const { query: puritiesQuery } = useList<IPurityLevel>({
    resource: "purity_levels",
    filters: [{ field: "is_active", operator: "eq", value: true }],
    sorters: [{ field: "purity_value", order: "desc" }],
    pagination: { mode: "off" },
  });
  const allPurities = (puritiesQuery?.data?.data ?? []) as IPurityLevel[];

  // Filter purity levels by selected metal type
  const availablePurities = useMemo(() => {
    if (!selectedMetalTypeId) return allPurities;
    return allPurities.filter((p) => p.metal_type_id === selectedMetalTypeId);
  }, [allPurities, selectedMetalTypeId]);

  // Load categories
  const { selectProps: categorySelectProps, query: categoriesQuery } = useSelect<ICategory>({
    resource: "ornament_categories",
    optionLabel: "name",
    optionValue: "id",
    filters: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
    pagination: { mode: "off" },
  });

  // Default to Gold if creating and not set
  useEffect(() => {
    if (action === "create" && metalTypes.length > 0 && !form.getFieldValue("metal_type_id")) {
      const gold = metalTypes.find((m) => m.name.toLowerCase().includes("gold")) || metalTypes[0];
      form.setFieldValue("metal_type_id", gold.id);
    }
  }, [metalTypes, action, form]);

  // Auto-select first matching purity when metal changes if current purity is invalid
  useEffect(() => {
    if (availablePurities.length > 0) {
      const currentPurity = form.getFieldValue("purity_level_id");
      const isValid = availablePurities.some((p) => p.id === currentPurity);
      if (!isValid) {
        form.setFieldValue("purity_level_id", availablePurities[0].id);
      }
    }
  }, [availablePurities, form]);

  // Populate form in edit mode
  useEffect(() => {
    if (ornament && action === "edit") {
      form.setFieldsValue({
        name: ornament.name,
        sku: ornament.sku,
        description: ornament.description,
        category_id: ornament.category_id,
        metal_type_id: ornament.metal_type_id,
        purity_level_id: ornament.purity_level_id,
        weight_g: ornament.weight_mg ? ornament.weight_mg / 1000 : undefined,
        quantity: ornament.quantity ?? 1,
        purchase_metal_rate_rs: ornament.purchase_metal_rate_paise
          ? ornament.purchase_metal_rate_paise / 100
          : undefined,
        purchase_making_charge_rs: ornament.purchase_making_charge_paise
          ? ornament.purchase_making_charge_paise / 100
          : undefined,
        purchase_date: ornament.purchase_date ? dayjs(ornament.purchase_date) : dayjs(),
      });
    }
  }, [ornament, action, form]);

  // SKU auto-generation from name (desktop parity: stops once manually edited)
  useEffect(() => {
    if (skuManuallyEdited || !nameValue) return;
    form.setFieldValue("sku", generateSku(nameValue));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameValue]);

  // Debounce SKU check
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSku(skuValue ?? ""), 500);
    return () => clearTimeout(timer);
  }, [skuValue]);

  // SKU duplicate query
  const { query: skuCheckQuery } = useList<IOrnament>({
    resource: "ornaments",
    filters: [
      { field: "sku", operator: "eq", value: debouncedSku },
      ...(shopId ? [{ field: "shop_id", operator: "eq" as const, value: shopId }] : []),
    ],
    pagination: { pageSize: 1 },
    queryOptions: { enabled: !!(debouncedSku && shopId) },
  });
  const skuTaken = (skuCheckQuery?.data?.data ?? []).some((r) => r.id !== id);

  // Live total cost calculation
  const metalCostRs = useMemo(() => {
    if (!weightG || !metalRateRs) return 0;
    return weightG * metalRateRs;
  }, [weightG, metalRateRs]);

  const totalCostRs = useMemo(() => {
    return Math.round(metalCostRs + (makingChargeRs ?? 0));
  }, [metalCostRs, makingChargeRs]);

  // Mutations
  const { mutateAsync: createOrnament } = useCreate();
  const { mutateAsync: updateOrnament } = useUpdate();
  const { mutateAsync: createCategory } = useCreate();

  const handleQuickAddCategory = async () => {
    if (!newCategoryName.trim() || !shopId) return;
    try {
      setCreatingCategory(true);
      const res = await createCategory({
        resource: "ornament_categories",
        values: {
          name: newCategoryName.trim(),
          shop_id: shopId,
          created_by: userId,
        },
      });
      const newCat = res.data as ICategory;
      setNewCategoryName("");
      setNewCategoryModalOpen(false);
      categoriesQuery?.refetch();
      if (newCat?.id) {
        form.setFieldValue("category_id", newCat.id);
      }
      notification.success({ message: "Category created successfully" });
    } catch (err: any) {
      notification.error({ message: err?.message || "Failed to create category" });
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleSubmit = async (values: any) => {
    if (skuTaken) {
      notification.error({ message: "This SKU is already taken. Please enter a unique SKU." });
      return;
    }

    try {
      setIsSubmitting(true);
      const wG = values.weight_g as number | undefined;
      const mRateRs = values.purchase_metal_rate_rs as number | undefined;
      const mkChargeRs = values.purchase_making_charge_rs as number | undefined;

      const pDate = values.purchase_date
        ? dayjs.isDayjs(values.purchase_date)
          ? values.purchase_date.format("YYYY-MM-DD")
          : values.purchase_date
        : dayjs().format("YYYY-MM-DD");

      const payload: Partial<IOrnament> = {
        name: values.name.trim(),
        sku: values.sku?.trim() || null,
        description: values.description?.trim() || null,
        category_id: values.category_id,
        metal_type_id: values.metal_type_id,
        purity_level_id: values.purity_level_id,
        weight_mg: wG != null ? Math.round(wG * 1000) : 0,
        quantity: values.quantity ?? 1,
        purchase_metal_rate_paise: mRateRs != null ? Math.round(mRateRs * 100) : null,
        purchase_making_charge_paise: mkChargeRs != null ? Math.round(mkChargeRs * 100) : null,
        purchase_total_cost_paise: totalCostRs > 0 ? totalCostRs * 100 : null,
        purchase_date: pDate,
        is_active: true,
        updated_by: userId,
        ...(action !== "edit" && { created_by: userId, shop_id: shopId }),
      };

      if (action === "create") {
        await createOrnament({
          resource: "ornaments",
          values: payload,
        });
        notification.success({ message: "Ornament added to inventory successfully" });
      } else if (id) {
        await updateOrnament({
          resource: "ornaments",
          id,
          values: payload,
        });
        notification.success({ message: "Ornament updated successfully" });
      }

      navigate("/ornaments");
    } catch (err: any) {
      notification.error({ message: err?.message || "Failed to save ornament" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (action === "edit" && isRecordLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      data-testid="mobile-ornament-form-page"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: themeStyles.pageBg,
        color: themeStyles.textPrimary,
        paddingBottom: "calc(120px + env(safe-area-inset-bottom, 16px))",
      }}
    >
      {/* ── Native Sticky Top App Bar with Frosted Glass Blur ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          backgroundColor: themeStyles.headerBg,
          borderBottom: themeStyles.headerBorder,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          boxShadow: isDark ? "0 1px 3px rgba(0,0,0,0.4)" : "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            data-testid="mobile-form-back-btn"
            onClick={() => navigate(-1)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              border: isDark ? "1px solid #27272a" : "1px solid rgba(15, 23, 42, 0.12)",
              backgroundColor: isDark ? "#18181b" : "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: themeStyles.textPrimary,
              boxShadow: isDark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 2px rgba(0,0,0,0.04)",
              transition: "transform 0.1s ease",
            }}
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <div>
            <Title level={5} style={{ margin: 0, fontSize: 16, fontWeight: 700, color: themeStyles.textPrimary, letterSpacing: "-0.3px" }}>
              {action === "create" ? "Add New Piece" : "Edit Piece"}
            </Title>
            <Text style={{ fontSize: 11, color: themeStyles.textSecondary, fontWeight: 500 }}>
              {action === "create" ? "Catalog & Inventory" : `SKU #${ornament?.sku || id?.slice(0, 6)}`}
            </Text>
          </div>
        </div>

        <Button
          type="primary"
          icon={<Save size={15} />}
          loading={isSubmitting}
          onClick={() => form.submit()}
          style={{
            height: 38,
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 13,
            padding: "0 16px",
            backgroundColor: "#2563eb",
            boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
          }}
        >
          Save
        </Button>
      </header>

      {/* ── Form Body: Standardized 16px Spacing, 14px Card Gaps ── */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ quantity: 1, purchase_date: dayjs() }}
        style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}
      >
        {/* ── Card 1: Metal & Purity Selector ── */}
        <div
          style={{
            backgroundColor: themeStyles.cardBg,
            borderRadius: 18,
            padding: "16px",
            border: themeStyles.cardBorder,
            boxShadow: themeStyles.cardShadow,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: isDark ? "rgba(217, 119, 6, 0.2)" : "rgba(217, 119, 6, 0.12)",
                color: isDark ? "#fbbf24" : "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Gem size={15} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: themeStyles.textPrimary, letterSpacing: "0.02em" }}>
              1. METAL TYPE & KARAT PURITY
            </span>
          </div>

          {/* Metal Type Segmented Pills */}
          <Form.Item name="metal_type_id" rules={[{ required: true, message: "Please select metal" }]} style={{ marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(visibleMetalTypes.length, 2)}, 1fr)`, gap: 10 }}>
              {visibleMetalTypes.map((metal) => {
                const isSelected = selectedMetalTypeId === metal.id;
                const isGold = metal.name.toLowerCase().includes("gold");
                const isSilver = metal.name.toLowerCase().includes("silver");
                const Icon = isGold ? Gem : isSilver ? CircleDot : Sparkles;

                return (
                  <button
                    key={metal.id}
                    type="button"
                    onClick={() => form.setFieldValue("metal_type_id", metal.id)}
                    style={{
                      height: 48,
                      borderRadius: 14,
                      border: isSelected
                        ? "2px solid #2563eb"
                        : isDark
                          ? "1px solid #27272a"
                          : "1px solid rgba(15, 23, 42, 0.14)",
                      backgroundColor: isSelected
                        ? isDark
                          ? "rgba(37, 99, 235, 0.25)"
                          : "#eff6ff"
                        : isDark
                          ? "#1a1a1e"
                          : "#ffffff",
                      color: isSelected
                        ? isDark
                          ? "#60a5fa"
                          : "#1d4ed8"
                        : themeStyles.textPrimary,
                      fontWeight: isSelected ? 700 : 600,
                      fontSize: 14,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      transition: "all 0.15s ease",
                      boxShadow: isSelected
                        ? "0 2px 8px rgba(37, 99, 235, 0.15)"
                        : "none",
                    }}
                  >
                    <Icon size={17} strokeWidth={isSelected ? 2.5 : 2} />
                    <span>{metal.name}</span>
                  </button>
                );
              })}
            </div>
          </Form.Item>

          {/* Purity Level Chip Selector */}
          <Form.Item
            name="purity_level_id"
            label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Karat / Purity Level</span>}
            rules={[{ required: true, message: "Please select purity" }]}
            style={{ marginBottom: 0 }}
          >
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
              {availablePurities.map((p) => {
                const isSelected = selectedPurityId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => form.setFieldValue("purity_level_id", p.id)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 22,
                      minHeight: 40,
                      border: isSelected
                        ? "2px solid #2563eb"
                        : isDark
                          ? "1px solid #27272a"
                          : "1px solid rgba(15, 23, 42, 0.14)",
                      backgroundColor: isSelected
                        ? isDark
                          ? "rgba(37, 99, 235, 0.25)"
                          : "#eff6ff"
                        : isDark
                          ? "#1a1a1e"
                          : "#f8fafc",
                      color: isSelected
                        ? isDark
                          ? "#60a5fa"
                          : "#1d4ed8"
                        : isDark
                          ? "#f8fafc"
                          : "#334155",
                      fontWeight: isSelected ? 700 : 600,
                      fontSize: 13,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isSelected && <Check size={14} strokeWidth={3} />}
                    <span>{p.display_name} ({p.purity_value}%)</span>
                  </button>
                );
              })}
            </div>
          </Form.Item>
        </div>

        {/* ── Card 2: Essential Identity ── */}
        <div
          style={{
            backgroundColor: themeStyles.cardBg,
            borderRadius: 18,
            padding: "16px",
            border: themeStyles.cardBorder,
            boxShadow: themeStyles.cardShadow,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(37, 99, 235, 0.12)",
                color: isDark ? "#60a5fa" : "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Tag size={15} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: themeStyles.textPrimary, letterSpacing: "0.02em" }}>
              2. BASIC PIECE DETAILS
            </span>
          </div>

          <Form.Item
            name="name"
            label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Item / Piece Name</span>}
            rules={[{ required: true, message: "Please enter item name" }]}
            style={{ marginBottom: 14 }}
          >
            <Input
              placeholder="e.g. Traditional Antique Kundan Bridal Set"
              style={{ height: 48, borderRadius: 14, fontSize: 15 }}
            />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <Form.Item
              name="sku"
              label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>SKU Code</span>}
              validateStatus={skuTaken ? "error" : ""}
              help={skuTaken ? "SKU already exists. Choose a different one." : "Auto-generated from name. Edit to customise."}
              style={{ marginBottom: 0 }}
            >
              <Input
                placeholder="e.g. BR-0042"
                style={{ height: 48, borderRadius: 14, fontSize: 15 }}
                onChange={() => setSkuManuallyEdited(true)}
              />
            </Form.Item>

            <Form.Item
              name="category_id"
              label={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor }}>Category</span>
                  <button
                    type="button"
                    onClick={() => setNewCategoryModalOpen(true)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2563eb",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    + Add
                  </button>
                </div>
              }
              rules={[{ required: true, message: "Select category" }]}
              style={{ marginBottom: 0 }}
            >
              <Select
                {...categorySelectProps}
                placeholder="Choose category"
                style={{ height: 48, width: "100%" }}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="description"
            label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Design Details / Notes (Optional)</span>}
            style={{ marginBottom: 0 }}
          >
            <Input.TextArea
              rows={2}
              placeholder="e.g. Includes handcrafted floral carvings, dual-tone polish"
              style={{ borderRadius: 14, fontSize: 14, resize: "none" }}
            />
          </Form.Item>
        </div>

        {/* ── Card 3: Weight & Valuation ── */}
        <div
          style={{
            backgroundColor: themeStyles.cardBg,
            borderRadius: 18,
            padding: "16px",
            border: themeStyles.cardBorder,
            boxShadow: themeStyles.cardShadow,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.12)",
                color: isDark ? "#34d399" : "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Calculator size={15} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: themeStyles.textPrimary, letterSpacing: "0.02em" }}>
              3. WEIGHT & PURCHASE COST
            </span>
          </div>

          <Form.Item
            name="weight_g"
            label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Gross Weight (Grams)</span>}
            rules={[{ required: true, message: "Please enter weight in grams" }]}
            style={{ marginBottom: 14 }}
          >
            <InputNumber
              placeholder="e.g. 14.850"
              precision={3}
              min={0.001}
              step={0.001}
              style={{ width: "100%", height: 48, borderRadius: 14, fontSize: 16, fontWeight: 600 }}
              addonAfter={<span style={{ fontWeight: 600 }}>grams</span>}
            />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <Form.Item
              name="purchase_metal_rate_rs"
              label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Rate / Gram (₹)</span>}
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                placeholder="e.g. 7200"
                min={0}
                style={{ width: "100%", height: 48, borderRadius: 14, fontSize: 15 }}
                prefix="₹"
              />
            </Form.Item>

            <Form.Item
              name="purchase_making_charge_rs"
              label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Making Charge (₹)</span>}
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                placeholder="e.g. 3500"
                min={0}
                style={{ width: "100%", height: 48, borderRadius: 14, fontSize: 15 }}
                prefix="₹"
              />
            </Form.Item>
          </div>

          {/* Dynamic Total Cost Banner */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              background: isDark
                ? "linear-gradient(135deg, #064e3b 0%, #065f46 100%)"
                : "linear-gradient(135deg, #064e3b 0%, #047857 100%)",
              color: "#ffffff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 4px 12px rgba(6, 78, 59, 0.25)",
            }}
          >
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#a7f3d0", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
                Total Purchase Cost
              </span>
              <span style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.8)", fontWeight: 500 }}>
                {weightG && metalRateRs
                  ? `${weightG}g @ ₹${metalRateRs} + ₹${makingChargeRs || 0}`
                  : "Based on metal rate & making charges"}
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", display: "block", letterSpacing: "-0.5px" }}>
                ₹{totalCostRs.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* ── Card 4: Inventory & Date ── */}
        <div
          style={{
            backgroundColor: themeStyles.cardBg,
            borderRadius: 18,
            padding: "16px",
            border: themeStyles.cardBorder,
            boxShadow: themeStyles.cardShadow,
            scrollMarginBottom: "calc(120px + env(safe-area-inset-bottom, 16px))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: isDark ? "rgba(147, 51, 234, 0.2)" : "rgba(147, 51, 234, 0.12)",
                color: isDark ? "#c084fc" : "#7e22ce",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Package size={15} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: themeStyles.textPrimary, letterSpacing: "0.02em" }}>
              4. STOCK INVENTORY
            </span>
          </div>

          <Form.Item
            name="purchase_date"
            label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Purchase / Inward Date</span>}
            style={{ marginBottom: 14 }}
          >
            <DatePicker
              style={{ width: "100%", height: 48, borderRadius: 14, fontSize: 15 }}
              format="DD MMM YYYY"
            />
          </Form.Item>

          <Form.Item name="quantity" label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Stock Quantity</span>} style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button
                type="button"
                onClick={() => form.setFieldValue("quantity", Math.max(0, (quantityValue || 1) - 1))}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  border: themeStyles.buttonSecondaryBorder,
                  backgroundColor: themeStyles.buttonSecondaryBg,
                  fontSize: 22,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: themeStyles.textPrimary,
                }}
              >
                -
              </button>

              <div data-testid="mobile-stock-input" style={{ display: "contents" }}>
              {/* Scoped fix: center the inner input text with even padding.
                  A wrapper-level textAlign never reaches
                  .ant-input-number-input, and this antd InputNumber exposes
                  no `styles.input` prop — so a scoped rule is required. */}
              <style>{`.mobile-stock-centered .ant-input-number-input { text-align: center; padding: 0 8px; }`}</style>
              <InputNumber
                className="mobile-stock-centered"
                min={0}
                value={quantityValue}
                onChange={(val) => form.setFieldValue("quantity", val ?? 0)}
                style={{ width: 84, height: 48, borderRadius: 14, fontSize: 17, fontWeight: 700 }}
              />
              </div>

              <button
                type="button"
                onClick={() => form.setFieldValue("quantity", (quantityValue || 0) + 1)}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  border: themeStyles.buttonSecondaryBorder,
                  backgroundColor: themeStyles.buttonSecondaryBg,
                  fontSize: 22,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: themeStyles.textPrimary,
                }}
              >
                +
              </button>

              <span style={{ fontSize: 13, color: themeStyles.textSecondary, fontWeight: 600 }}>
                {quantityValue === 1 ? "1 piece" : `${quantityValue} pieces`}
              </span>
            </div>
          </Form.Item>
        </div>
      </Form>

      {/* ── Native Sticky Bottom Action Dock with Opaque Solid Background ── */}
      <div
        data-testid="mobile-form-dock"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          backgroundColor: themeStyles.dockBg,
          borderTop: themeStyles.dockBorder,
          padding: "12px 16px",
          paddingBottom: "max(env(safe-area-inset-bottom), 14px)",
          boxShadow: isDark ? "0 -4px 20px rgba(0,0,0,0.5)" : "0 -4px 20px rgba(0,0,0,0.06)",
          display: "flex",
          gap: 12,
        }}
      >
        <Button
          onClick={() => navigate(-1)}
          style={{
            height: 50,
            borderRadius: 14,
            fontWeight: 700,
            fontSize: 14,
            flex: 1,
            backgroundColor: themeStyles.buttonSecondaryBg,
            color: themeStyles.buttonSecondaryColor,
            border: themeStyles.buttonSecondaryBorder,
          }}
        >
          Cancel
        </Button>
        <Button
          type="primary"
          onClick={() => form.submit()}
          loading={isSubmitting}
          style={{
            height: 50,
            borderRadius: 14,
            fontWeight: 700,
            fontSize: 15,
            flex: 2,
            backgroundColor: "#2563eb",
            boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
          }}
        >
          {action === "create" ? "Add to Stock" : "Save Changes"}
        </Button>
      </div>

      {/* Quick Add Category Modal */}
      <Modal
        title="Quick Add Category"
        open={newCategoryModalOpen}
        onCancel={() => setNewCategoryModalOpen(false)}
        onOk={handleQuickAddCategory}
        confirmLoading={creatingCategory}
        okText="Create"
      >
        <div style={{ paddingTop: 10 }}>
          <Input
            placeholder="e.g. Mangalsutra, Bangles, Solitaires"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onPressEnter={handleQuickAddCategory}
            autoFocus
            style={{ height: 44, borderRadius: 12 }}
          />
        </div>
      </Modal>
    </div>
  );
};
