import React, { useState, useMemo, useEffect, useRef } from "react";
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
  Tag,
  Scale,
  Package,
} from "lucide-react";
import dayjs from "dayjs";
import { useShopCheck } from "../../../hooks/use-shop-check";
import type { ICategory, IMetalType, IOrnament, IPurityLevel } from "../../../libs/interfaces";

const { Text, Title } = Typography;

const generateSku = (name: string): string => {
  const words = name.trim().split(/\s+/);
  const prefix = words
    .slice(0, 3)
    .map((w) => w.slice(0, 2).toUpperCase())
    .join("");
  const rand = Math.floor(100 + Math.random() * 900);
  return `${prefix || "ORN"}-${rand}`;
};

interface MobileOrnamentFormProps {
  action: "create" | "edit";
  id?: string;
}

export const MobileOrnamentForm: React.FC<MobileOrnamentFormProps> = ({ action, id }) => {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { shops } = useShopCheck();
  const shopId = shops?.[0]?.id;
  const { data: identity } = useGetIdentity<{ id: string }>();
  const userId = identity?.id;

  const [skuManuallyEdited, setSkuManuallyEdited] = useState(action === "edit");
  const [debouncedSku, setDebouncedSku] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Fetch record if editing
  const { query: recordQuery } = useOne<IOrnament>({
    resource: "ornaments",
    id: id || "",
    queryOptions: { enabled: action === "edit" && !!id },
  });
  const ornament = recordQuery?.data?.data;
  const isRecordLoading = recordQuery?.isLoading;

  // Form watchers for dynamic calculations
  const weightG: number | undefined = Form.useWatch("weight_g", form);
  const metalRateRs: number | undefined = Form.useWatch("purchase_metal_rate_rs", form);
  const makingChargeRs: number | undefined = Form.useWatch("purchase_making_charge_rs", form);
  const selectedMetalTypeId: string | undefined = Form.useWatch("metal_type_id", form);
  const selectedPurityLevelId: string | undefined = Form.useWatch("purity_level_id", form);
  const nameValue: string | undefined = Form.useWatch("name", form);
  const skuValue: string | undefined = Form.useWatch("sku", form);
  const quantityValue: number = Form.useWatch("quantity", form) ?? 1;

  // Metal Types list
  const { query: metalTypesQuery } = useList<IMetalType>({
    resource: "metal_types",
    filters: [{ field: "is_active", operator: "eq", value: true }],
    sorters: [{ field: "name", order: "asc" }],
  });
  const metalTypes = (metalTypesQuery?.data?.data ?? []) as IMetalType[];

  // Purity Levels
  const { query: purityQuery } = useList<IPurityLevel>({
    resource: "purity_levels",
    filters: [{ field: "is_active", operator: "eq", value: true }],
    pagination: { pageSize: 100 },
  });
  const allPurityLevels = (purityQuery?.data?.data ?? []) as IPurityLevel[];

  // Categories
  const { selectProps: categorySelectProps, query: categoriesQuery } = useSelect<ICategory>({
    resource: "ornament_categories",
    optionLabel: "name",
    optionValue: "id",
    filters: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
    sorters: [{ field: "name", order: "asc" }],
    queryOptions: { enabled: !!shopId },
  });

  // Rates for auto-defaulting purchase rate
  const { query: ratesQuery } = useList({
    resource: "ornament_rates",
    filters: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
    sorters: [{ field: "effective_date", order: "desc" }],
    pagination: { pageSize: 5 },
    queryOptions: { enabled: !!shopId },
  });

  // Auto-default gold/silver rate when metal type is selected
  useEffect(() => {
    if (action === "edit" || !ratesQuery?.data?.data?.length || !metalTypes.length) return;
    const selectedMetal = metalTypes.find((m) => m.id === selectedMetalTypeId);
    if (!selectedMetal) return;

    const latest = ratesQuery.data.data[0];
    const metalName = selectedMetal.name?.toLowerCase();
    if (metalName?.includes("gold") && latest.gold_rate_24k) {
      const gRate = (latest.gold_rate_24k || 0) / 100;
      if (!form.getFieldValue("purchase_metal_rate_rs")) {
        form.setFieldValue("purchase_metal_rate_rs", Math.round(gRate));
      }
    } else if (metalName?.includes("silver") && latest.silver_rate_1kg) {
      const sRate = (latest.silver_rate_1kg || 0) / 100000;
      if (!form.getFieldValue("purchase_metal_rate_rs")) {
        form.setFieldValue("purchase_metal_rate_rs", Math.round(sRate));
      }
    }
  }, [selectedMetalTypeId, metalTypes, ratesQuery?.data, action, form]);

  // Set default metal type to Gold on load if create
  useEffect(() => {
    if (action === "create" && metalTypes.length && !form.getFieldValue("metal_type_id")) {
      const gold = metalTypes.find((m) => m.name.toLowerCase().includes("gold")) || metalTypes[0];
      form.setFieldValue("metal_type_id", gold.id);
    }
  }, [metalTypes, action, form]);

  // Available purity levels for selected metal
  const filteredPurityLevels = useMemo(() => {
    if (!selectedMetalTypeId) return allPurityLevels;
    return allPurityLevels.filter((p) => p.metal_type_id === selectedMetalTypeId);
  }, [allPurityLevels, selectedMetalTypeId]);

  // Auto-select first purity level if none selected or changed
  const prevMetalRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevMetalRef.current && prevMetalRef.current !== selectedMetalTypeId) {
      const first = filteredPurityLevels[0];
      form.setFieldValue("purity_level_id", first?.id);
    }
    prevMetalRef.current = selectedMetalTypeId;
  }, [selectedMetalTypeId, filteredPurityLevels, form]);

  // Populate form in edit mode
  useEffect(() => {
    if (action === "edit" && ornament) {
      form.setFieldsValue({
        name: ornament.name,
        sku: ornament.sku,
        description: ornament.description,
        category_id: ornament.category_id,
        metal_type_id: ornament.metal_type_id,
        purity_level_id: ornament.purity_level_id,
        weight_g: ornament.weight_mg != null ? ornament.weight_mg / 1000 : undefined,
        quantity: ornament.quantity ?? 1,
        purchase_metal_rate_rs:
          ornament.purchase_metal_rate_paise != null
            ? ornament.purchase_metal_rate_paise / 100
            : undefined,
        purchase_making_charge_rs:
          ornament.purchase_making_charge_paise != null
            ? ornament.purchase_making_charge_paise / 100
            : undefined,
        purchase_date: ornament.purchase_date ? dayjs(ornament.purchase_date) : dayjs(),
      });
      setSkuManuallyEdited(true);
    }
  }, [action, ornament, form]);

  // Auto SKU generation from name
  useEffect(() => {
    if (action === "create" && !skuManuallyEdited && nameValue) {
      const sku = generateSku(nameValue);
      form.setFieldValue("sku", sku);
    }
  }, [nameValue, skuManuallyEdited, action, form]);

  // Debounce SKU check
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSku(skuValue ?? ""), 400);
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
        backgroundColor: "#f8fafc",
        paddingBottom: "calc(100px + env(safe-area-inset-bottom, 16px))",
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
          backgroundColor: "rgba(255, 255, 255, 0.90)",
          borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
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
              border: "1px solid rgba(15, 23, 42, 0.12)",
              backgroundColor: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#0f172a",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              transition: "transform 0.1s ease",
            }}
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <div>
            <Title level={5} style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px" }}>
              {action === "create" ? "Add New Piece" : "Edit Piece"}
            </Title>
            <Text style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>
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
            backgroundColor: "#ffffff",
            borderRadius: 18,
            padding: "16px",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: "rgba(217, 119, 6, 0.12)",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Gem size={15} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: "0.02em" }}>
              1. METAL TYPE & KARAT PURITY
            </span>
          </div>

          {/* Metal Type Segmented Pills */}
          <Form.Item name="metal_type_id" rules={[{ required: true, message: "Please select metal" }]} style={{ marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(metalTypes.length, 2)}, 1fr)`, gap: 10 }}>
              {metalTypes.map((metal) => {
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
                        ? `2.5px solid ${isGold ? "#d97706" : isSilver ? "#334155" : "#2563eb"}`
                        : "1px solid rgba(15, 23, 42, 0.12)",
                      backgroundColor: isSelected
                        ? isGold
                          ? "rgba(217, 119, 6, 0.12)"
                          : isSilver
                          ? "rgba(100, 116, 139, 0.12)"
                          : "rgba(37, 99, 235, 0.1)"
                        : "#ffffff",
                      color: isSelected
                        ? isGold
                          ? "#b45309"
                          : isSilver
                          ? "#0f172a"
                          : "#1d4ed8"
                        : "#475569",
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Icon size={18} strokeWidth={isSelected ? 2.5 : 2} />
                    <span>{metal.name}</span>
                  </button>
                );
              })}
            </div>
          </Form.Item>

          {/* Karat Purity One-Tap Chips (horizontal scrollable) */}
          <Form.Item
            label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Purity Level</span>}
            name="purity_level_id"
            rules={[{ required: true, message: "Select purity level" }]}
            style={{ marginBottom: 0 }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                paddingBottom: 4,
                scrollbarWidth: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {filteredPurityLevels.map((p) => {
                const isSelected = selectedPurityLevelId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => form.setFieldValue("purity_level_id", p.id)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 22,
                      minHeight: 40,
                      border: isSelected ? "2px solid #2563eb" : "1px solid rgba(15, 23, 42, 0.14)",
                      backgroundColor: isSelected ? "#eff6ff" : "#f8fafc",
                      color: isSelected ? "#1d4ed8" : "#334155",
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
            backgroundColor: "#ffffff",
            borderRadius: 18,
            padding: "16px",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: "rgba(37, 99, 235, 0.12)",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Tag size={15} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: "0.02em" }}>
              2. BASIC PIECE DETAILS
            </span>
          </div>

          <Form.Item
            label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Piece Name</span>}
            name="name"
            rules={[{ required: true, message: "Name is required" }]}
            style={{ marginBottom: 14 }}
          >
            <Input
              placeholder="e.g. Traditional Antique Choker"
              style={{ height: 48, borderRadius: 14, fontSize: 15, border: "1px solid rgba(15, 23, 42, 0.12)" }}
            />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Category with Quick Add */}
            <Form.Item
              label={
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Category</span>
                  <button
                    type="button"
                    onClick={() => setNewCategoryModalOpen(true)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2563eb",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Plus size={13} strokeWidth={2.5} /> New
                  </button>
                </div>
              }
              name="category_id"
              rules={[{ required: true, message: "Category required" }]}
              style={{ marginBottom: 14 }}
            >
              <Select
                {...categorySelectProps}
                placeholder="Select category"
                style={{ height: 48, width: "100%" }}
              />
            </Form.Item>

            {/* SKU with warning */}
            <Form.Item
              label={
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>SKU Code</span>
                  {!skuManuallyEdited && (
                    <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 700 }}>AUTO</span>
                  )}
                </div>
              }
              name="sku"
              validateStatus={skuTaken ? "error" : ""}
              help={skuTaken ? "SKU already in use" : undefined}
              style={{ marginBottom: 14 }}
            >
              <Input
                placeholder="SKU Code"
                onChange={() => setSkuManuallyEdited(true)}
                style={{ height: 48, borderRadius: 14, fontSize: 14, fontFamily: "monospace", border: "1px solid rgba(15, 23, 42, 0.12)" }}
              />
            </Form.Item>
          </div>

          <Form.Item label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Description (Optional)</span>} name="description" style={{ marginBottom: 0 }}>
            <Input.TextArea
              rows={2}
              placeholder="Design hallmarks, stones, certificate notes..."
              style={{ borderRadius: 14, fontSize: 14, border: "1px solid rgba(15, 23, 42, 0.12)" }}
            />
          </Form.Item>
        </div>

        {/* ── Card 3: Weight & Pricing Calculator ── */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 18,
            padding: "16px",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: "rgba(5, 150, 105, 0.12)",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Scale size={15} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: "0.02em" }}>
              3. WEIGHT & PURCHASE COST
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item
              label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Gross Weight (g)</span>}
              name="weight_g"
              rules={[{ required: true, message: "Enter weight" }]}
              style={{ marginBottom: 14 }}
            >
              <InputNumber
                min={0}
                step={0.01}
                placeholder="0.00"
                style={{ width: "100%", height: 48, borderRadius: 14, fontSize: 15, border: "1px solid rgba(15, 23, 42, 0.12)" }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Metal Rate (₹/g)</span>}
              name="purchase_metal_rate_rs"
              rules={[{ required: true, message: "Enter metal rate" }]}
              style={{ marginBottom: 14 }}
            >
              <InputNumber
                min={0}
                placeholder="₹/g"
                style={{ width: "100%", height: 48, borderRadius: 14, fontSize: 15, border: "1px solid rgba(15, 23, 42, 0.12)" }}
              />
            </Form.Item>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <Form.Item
              label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Making Charge (₹)</span>}
              name="purchase_making_charge_rs"
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                min={0}
                placeholder="₹0"
                style={{ width: "100%", height: 48, borderRadius: 14, fontSize: 15, border: "1px solid rgba(15, 23, 42, 0.12)" }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Purchase Date</span>}
              name="purchase_date"
              style={{ marginBottom: 0 }}
            >
              <DatePicker
                format="YYYY-MM-DD"
                style={{ width: "100%", height: 48, borderRadius: 14, border: "1px solid rgba(15, 23, 42, 0.12)" }}
              />
            </Form.Item>
          </div>

          {/* High-Contrast Live Total Cost Estimation Banner (10/10 Contrast) */}
          <div
            style={{
              borderRadius: 14,
              padding: "14px 16px",
              background: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 14px rgba(5, 150, 105, 0.25)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: "#a7f3d0", display: "block" }}>
                CALCULATED PURCHASE COST
              </span>
              <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500 }}>
                {weightG ? `${weightG}g @ ₹${metalRateRs || 0}` : "Enter weight & metal rate"}
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", display: "block", letterSpacing: "-0.5px" }}>
                ₹{totalCostRs.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* ── Card 4: Inventory Quantity ── */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 18,
            padding: "16px",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: "rgba(124, 58, 237, 0.12)",
                color: "#7c3aed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Package size={15} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: "0.02em" }}>
              4. STOCK INVENTORY
            </span>
          </div>

          <Form.Item name="quantity" label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Stock Quantity</span>} style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button
                type="button"
                onClick={() => form.setFieldValue("quantity", Math.max(0, (quantityValue || 1) - 1))}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  border: "1px solid rgba(15, 23, 42, 0.14)",
                  backgroundColor: "#f8fafc",
                  fontSize: 22,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#0f172a",
                }}
              >
                -
              </button>

              <InputNumber
                min={0}
                value={quantityValue}
                onChange={(val) => form.setFieldValue("quantity", val ?? 0)}
                style={{ width: 84, height: 48, borderRadius: 14, fontSize: 17, fontWeight: 700, textAlign: "center", border: "1px solid rgba(15, 23, 42, 0.14)" }}
              />

              <button
                type="button"
                onClick={() => form.setFieldValue("quantity", (quantityValue || 0) + 1)}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  border: "1px solid rgba(15, 23, 42, 0.14)",
                  backgroundColor: "#f8fafc",
                  fontSize: 22,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#0f172a",
                }}
              >
                +
              </button>

              <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>
                {quantityValue === 1 ? "1 piece" : `${quantityValue} pieces`}
              </span>
            </div>
          </Form.Item>
        </div>
      </Form>

      {/* ── Native Sticky Bottom Action Dock with Translucent Frosted Glass ── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          backgroundColor: "rgba(255, 255, 255, 0.92)",
          borderTop: "1px solid rgba(15, 23, 42, 0.08)",
          padding: "12px 16px",
          paddingBottom: "max(env(safe-area-inset-bottom), 14px)",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
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
            backgroundColor: "#f1f5f9",
            color: "#334155",
            border: "1px solid rgba(15, 23, 42, 0.08)",
          }}
        >
          Cancel
        </Button>

        <Button
          type="primary"
          icon={<Save size={17} />}
          loading={isSubmitting}
          onClick={() => form.submit()}
          style={{
            height: 50,
            borderRadius: 14,
            fontWeight: 700,
            fontSize: 15,
            flex: 2,
            backgroundColor: "#2563eb",
            boxShadow: "0 3px 12px rgba(37, 99, 235, 0.35)",
          }}
        >
          {action === "create" ? "Save to Inventory" : "Update Piece"}
        </Button>
      </div>

      {/* ── Quick Add Category Modal ── */}
      <Modal
        title="Add Category"
        open={newCategoryModalOpen}
        onCancel={() => setNewCategoryModalOpen(false)}
        onOk={handleQuickAddCategory}
        confirmLoading={creatingCategory}
        okText="Create"
      >
        <Input
          placeholder="e.g. Bangles, Necklaces, Rings"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onPressEnter={handleQuickAddCategory}
          style={{ height: 46, borderRadius: 12, marginTop: 8 }}
        />
      </Modal>
    </div>
  );
};
