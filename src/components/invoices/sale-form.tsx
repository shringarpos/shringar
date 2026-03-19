import {
  useList,
  useGetIdentity,
  useCreate,
  useCreateMany,
  useUpdate,
} from "@refinedev/core";
import {
  useDrawerForm,
  useModalForm,
} from "@refinedev/antd";
import {
  DeleteOutlined,
  PlusOutlined,
  UserAddOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import dayjs from "dayjs";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { MakingChargePopover } from "./making-charge-popover";
import type {
  ICustomer,
  IInvoice,
  IInvoiceItem,
  IMakingCharge,
  IMetalRate,
  IMetalType,
  IOrnament,
  IOrnamentWithDetails,
  IPurityLevel,
} from "../../libs/interfaces";
import { useShopCheck } from "../../hooks/use-shop-check";
import { CustomerModal } from "../customers/customer-modal";
import { OrnamentDrawer } from "../inventory/ornaments/ornament-drawer";
import { RateEditPopover } from "../metal-rates/rate-edit-popover";
import { paiseToDisplay, displayToPaise, rateUnit } from "../metal-rates/utils";

const { Title, Text } = Typography;

// ─── helpers ─────────────────────────────────────────────────────────────────

let _keyCounter = 0;
const newKey = () => `item-${++_keyCounter}-${Date.now()}`;

const isGoldMetal = (name: string) => name.trim().toUpperCase() === "GOLD";
/** paise → rupees for display only */
const p2Rs = (p: number) => p / 100;
/** rupees → paise (for user-typed fields like discount) */
const rs2P = (rs: number) => Math.round(rs * 100);

function adjustedRate(base24kPaise: number, purityValue: number | null, gold: boolean): number {
  if (!gold) return base24kPaise;
  if (!purityValue) return base24kPaise;
  return Math.round(base24kPaise * (purityValue / 100));
}

/** All monetary args and return values are in paise. weightG is grams. */
function calcLine(weightG: number, qty: number, ratePaise: number, makingPaise: number) {
  const metalAmountPaise = Math.round(weightG * qty * ratePaise);
  const makingAmountPaise = Math.round(weightG * qty * makingPaise);
  return { metalAmountPaise, makingAmountPaise, lineTotalPaise: metalAmountPaise + makingAmountPaise };
}

// ─── types ────────────────────────────────────────────────────────────────────

interface SaleItem {
  key: string;
  ornamentId: string;
  ornament: IOrnamentWithDetails;
  itemName: string;
  metalTypeName: string;
  metalTypeId: string;
  isGold: boolean;
  purityValue: number | null;
  purityDisplayName: string | null;
  purityLevelId: string;
  weightG: number;
  quantity: number;
  /** stored in paise/gram */
  ratePerGramPaise: number;
  /** stored in paise/gram */
  makingChargePaise: number;
  rateConfigured: boolean;
  makingConfigured: boolean;
}

export type SaleFormMode = "create" | "edit" | "clone";

interface SaleFormProps {
  mode: SaleFormMode;
  existingInvoice?: IInvoice & { invoice_items?: IInvoiceItem[]; customer?: ICustomer };
}

// ─── component ────────────────────────────────────────────────────────────────

export const SaleForm: React.FC<SaleFormProps> = ({ mode, existingInvoice }) => {
  const navigate = useNavigate();
  const { notification } = App.useApp();
  const { shops } = useShopCheck();
  const shopId = shops?.[0]?.id ?? "";

  const { data: identity } = useGetIdentity<{ id: string }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (identity as any)?.id as string | undefined;

  const [form] = Form.useForm();
  const [items, setItems] = useState<SaleItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedOrnamentId, setSelectedOrnamentId] = useState<string | undefined>();

  const isEdit = mode === "edit";
  const today = dayjs().format("YYYY-MM-DD");

  // ── Refine mutation hooks ─────────────────────────────────────────────────

  const { mutateAsync: createInvoice } = useCreate<IInvoice>();
  const { mutateAsync: createItems } = useCreateMany<IInvoiceItem>();
  const { mutateAsync: patchInvoice } = useUpdate<IInvoice>();
  const { mutateAsync: patchOrnament } = useUpdate();

  // ── Hooks for creating customer & ornament inline ─────────────────────────

  const {
    modalProps: custModalProps,
    formProps: custFormProps,
    show: showCustModal,
    close: closeCustModal,
  } = useModalForm<ICustomer>({
    resource: "customers",
    action: "create",
    redirect: false,
  });

  const {
    drawerProps: ornDrawerProps,
    formProps: ornFormProps,
    show: showOrnDrawer,
    close: closeOrnDrawer,
  } = useDrawerForm<IOrnament>({
    resource: "ornaments",
    action: "create",
    redirect: false,
  });

  // ── Data ──────────────────────────────────────────────────────────────────

  const { query: metalsQuery } = useList<IMetalType>({
    resource: "metal_types",
    filters: [{ field: "is_active", operator: "eq", value: true }],
    pagination: { mode: "off" },
    queryOptions: { staleTime: 5 * 60 * 1000 },
  });

  const { query: purityQuery } = useList<IPurityLevel>({
    resource: "purity_levels",
    filters: [{ field: "is_active", operator: "eq", value: true }],
    pagination: { mode: "off" },
    queryOptions: { staleTime: 5 * 60 * 1000 },
  });

  const { query: ratesQuery } = useList<IMetalRate>({
    resource: "ornament_rates",
    filters: [
      { field: "shop_id", operator: "eq", value: shopId },
      { field: "rate_date", operator: "eq", value: today },
    ],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!shopId, staleTime: 30 * 1000 },
  });

  const { query: chargesQuery } = useList<IMakingCharge>({
    resource: "making_charges",
    filters: [
      { field: "shop_id", operator: "eq", value: shopId },
      { field: "is_active", operator: "eq", value: true },
    ],
    sorters: [{ field: "effective_from", order: "desc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!shopId, staleTime: 30 * 1000 },
  });

  const { query: ornListQuery } = useList<IOrnamentWithDetails>({
    resource: "ornaments",
    meta: {
      select:
        "*, metal_type:metal_types(id,name), purity_level:purity_levels(id,purity_value,display_name)",
    },
    filters: [
      ...(shopId ? [{ field: "shop_id", operator: "eq" as const, value: shopId }] : []),
      { field: "is_active", operator: "eq" as const, value: true },
      { field: "quantity", operator: "gt" as const, value: 0 },
    ],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!shopId },
  });

  const { query: customerListQuery } = useList<ICustomer>({
    resource: "customers",
    filters: shopId ? [{ field: "shop_id", operator: "eq" as const, value: shopId }] : [],
    sorters: [{ field: "name", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!shopId },
  });

  const metals = (metalsQuery?.data?.data ?? []) as IMetalType[];
  const purities = (purityQuery?.data?.data ?? []) as IPurityLevel[];
  const rates = (ratesQuery?.data?.data ?? []) as IMetalRate[];
  const charges = (chargesQuery?.data?.data ?? []) as IMakingCharge[];
  const allOrnaments = (ornListQuery?.data?.data ?? []) as IOrnamentWithDetails[];
  const allCustomers = (customerListQuery?.data?.data ?? []) as ICustomer[];

  // ── Build item helper ─────────────────────────────────────────────────────

  const getTodayRate = useCallback(
    (metalTypeId: string) => rates.find((r) => r.metal_type_id === metalTypeId),
    [rates],
  );

  const getActiveMC = useCallback(
    (metalTypeId: string, purityLevelId: string) =>
      charges
        .filter((c) => c.metal_type_id === metalTypeId && c.purity_level_id === purityLevelId)
        .sort(
          (a, b) =>
            new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime(),
        )[0],
    [charges],
  );

  const buildItem = useCallback(
    (orn: IOrnamentWithDetails, overrides?: Partial<SaleItem>): SaleItem => {
      const metalName = orn.metal_type?.name ?? "";
      const gold = isGoldMetal(metalName);
      const purityValue = orn.purity_level?.purity_value ?? null;

      const todayRate = getTodayRate(orn.metal_type_id);
      const adjPaise = todayRate
        ? adjustedRate(todayRate.rate_per_gram_paise, purityValue, gold)
        : 0;

      const mc = getActiveMC(orn.metal_type_id, orn.purity_level_id);

      return {
        key: newKey(),
        ornamentId: orn.id,
        ornament: orn,
        itemName: orn.name,
        metalTypeName: metalName,
        metalTypeId: orn.metal_type_id,
        isGold: gold,
        purityValue,
        purityDisplayName: orn.purity_level?.display_name ?? null,
        purityLevelId: orn.purity_level_id,
        weightG: orn.weight_mg / 1000,
        quantity: 1,
        ratePerGramPaise: adjPaise,
        makingChargePaise: mc ? mc.charge_per_gram_paise : 0,
        rateConfigured: !!todayRate,
        makingConfigured: !!mc,
        ...overrides,
      };
    },
    [getTodayRate, getActiveMC],
  );

  // ── Pre-fill for clone ────────────────────────────────────────────────────

  const clonePrefilled = React.useRef(false);

  useEffect(() => {
    if (clonePrefilled.current) return;
    if (mode === "clone" && existingInvoice && allOrnaments.length > 0) {
      clonePrefilled.current = true;
      form.setFieldsValue({
        customer_id: existingInvoice.customer_id,
        invoice_date: dayjs(),
        notes: "",
      });
      if (existingInvoice.invoice_items) {
        const cloned = existingInvoice.invoice_items
          .map((it) => {
            const orn = allOrnaments.find((o) => o.id === it.ornament_id);
            return orn
              ? buildItem(orn, { weightG: it.weight_mg / 1000, quantity: it.quantity })
              : null;
          })
          .filter(Boolean) as SaleItem[];
        setItems(cloned);
      }
    }
  }, [mode, existingInvoice, allOrnaments, buildItem, form]);

  // ── Pre-fill for edit ────────────────────────────────────────────────────

  const editPrefilled = React.useRef(false);

  useEffect(() => {
    if (editPrefilled.current) return;
    if (mode === "edit" && existingInvoice && existingInvoice.invoice_items) {
      editPrefilled.current = true;
      form.setFieldsValue({
        customer_id: existingInvoice.customer_id,
        invoice_date: dayjs(existingInvoice.invoice_date),
        notes: existingInvoice.notes ?? "",
        discount: p2Rs(existingInvoice.discount_amount_paise),
      });
      setItems(
        existingInvoice.invoice_items.map((it) => {
          const orn = allOrnaments.find((o) => o.id === it.ornament_id);
          return {
            key: newKey(),
            ornamentId: it.ornament_id,
            ornament: orn ?? ({} as IOrnamentWithDetails),
            itemName: it.item_name,
            metalTypeName: it.metal_type_name,
            metalTypeId: orn?.metal_type_id ?? "",
            isGold: isGoldMetal(it.metal_type_name),
            purityValue: it.purity_value ?? null,
            purityDisplayName: it.purity_display_name ?? null,
            purityLevelId: orn?.purity_level_id ?? "",
            weightG: it.weight_mg / 1000,
            quantity: it.quantity,
            ratePerGramPaise: it.rate_per_gram_paise,
            makingChargePaise: it.making_charge_per_gram_paise,
            rateConfigured: true,
            makingConfigured: true,
          };
        }),
      );
    }
  }, [mode, existingInvoice, form, allOrnaments]);

  // ── Item actions ──────────────────────────────────────────────────────────

  const removeItem = (key: string) =>
    setItems((prev) => prev.filter((i) => i.key !== key));

  const updateItem = (key: string, patch: Partial<SaleItem>) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  // ── Totals ────────────────────────────────────────────────────────────────

  const totals = useMemo(() => {
    let subtotalPaise = 0;
    let makingPaise = 0;
    for (const item of items) {
      const { metalAmountPaise, makingAmountPaise } = calcLine(
        item.weightG,
        item.quantity,
        item.ratePerGramPaise,
        item.makingChargePaise,
      );
      subtotalPaise += metalAmountPaise;
      makingPaise += makingAmountPaise;
    }
    return { subtotalPaise, makingPaise };
  }, [items]);

  const discountPaise: number = rs2P(Form.useWatch("discount", form) ?? 0);
  const grandTotalPaise = totals.subtotalPaise + totals.makingPaise - discountPaise;

  // ── Save (create/clone) ───────────────────────────────────────────────────

  const handleSave = async (addAnother = false) => {
    if (!shopId || !userId) return;
    if (items.length === 0) {
      notification.error({ message: "Add at least one item to the invoice" });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fv: any;
    try {
      fv = await form.validateFields();
    } catch {
      return;
    }

    const discPaise = rs2P(fv.discount ?? 0);
    const invoiceDate = dayjs(fv.invoice_date).format("YYYY-MM-DD");

    // Build line items — all amounts already in paise
    const lineItems = items.map((item) => {
      const { metalAmountPaise, makingAmountPaise, lineTotalPaise } = calcLine(
        item.weightG,
        item.quantity,
        item.ratePerGramPaise,
        item.makingChargePaise,
      );
      return {
        ornament_id: item.ornamentId,
        item_name: item.itemName,
        weight_mg: Math.round(item.weightG * 1000),
        quantity: item.quantity,
        metal_type_name: item.metalTypeName,
        purity_value: item.purityValue,
        purity_display_name: item.purityDisplayName,
        rate_per_gram_paise: item.ratePerGramPaise,
        making_charge_per_gram_paise: item.makingChargePaise,
        metal_amount_paise: metalAmountPaise,
        making_charge_amount_paise: makingAmountPaise,
        line_total_paise: lineTotalPaise,
      };
    });

    const subtotalPaise = lineItems.reduce((s, i) => s + i.metal_amount_paise, 0);
    const makingTotalPaise = lineItems.reduce((s, i) => s + i.making_charge_amount_paise, 0);
    const totalPaise = subtotalPaise + makingTotalPaise - discPaise;

    setSaving(true);
    try {
      // 1. Create the invoice
      const { data: inv } = await createInvoice({
        resource: "invoices",
        values: {
          shop_id: shopId,
          customer_id: fv.customer_id,
          invoice_date: invoiceDate,
          subtotal_amount_paise: subtotalPaise,
          total_making_charges_paise: makingTotalPaise,
          discount_amount_paise: discPaise,
          total_amount_paise: totalPaise,
          notes: fv.notes ?? null,
          created_by: userId,
          updated_by: userId,
        },
        invalidates: [],          // suppress auto-invalidation; we navigate away after
        successNotification: false,
        errorNotification: false,
      });

      const invoiceId = inv?.id as string;
      const invoiceNumber = inv?.invoice_number as string;

      // 2. Create invoice items (batch)
      await createItems({
        resource: "invoice_items",
        values: lineItems.map((li) => ({ ...li, invoice_id: invoiceId })),
        invalidates: [],
        successNotification: false,
        errorNotification: false,
      });

      // 3. Decrement stock for each ornament
      for (const item of items) {
        const orn = allOrnaments.find((o) => o.id === item.ornamentId);
        if (orn) {
          await patchOrnament({
            resource: "ornaments",
            id: item.ornamentId,
            values: { quantity: Math.max(0, orn.quantity - item.quantity) },
            invalidates: [],
            successNotification: false,
            errorNotification: false,
          });
        }
      }

      notification.success({ message: `Invoice ${invoiceNumber} saved successfully` });
      if (addAnother) {
        form.resetFields();
        form.setFieldsValue({ invoice_date: dayjs(), discount: 0 });
        setItems([]);
      } else {
        navigate(`/invoices/${invoiceId}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      notification.error({ message: "Failed to save invoice", description: message });
    } finally {
      setSaving(false);
    }
  };

  // ── Save edit (notes only) ────────────────────────────────────────────────

  const handleEditSave = async () => {
    if (!existingInvoice || !userId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fv: any;
    try {
      fv = await form.validateFields(["notes"]);
    } catch {
      return;
    }
    setSaving(true);
    try {
      await patchInvoice({
        resource: "invoices",
        id: existingInvoice.id,
        values: { notes: fv.notes ?? null, updated_by: userId },
        invalidates: ["detail"],
        successNotification: false,
        errorNotification: false,
      });
      notification.success({ message: "Notes updated" });
      navigate(`/invoices/${existingInvoice.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      notification.error({ message: "Failed to update", description: message });
    } finally {
      setSaving(false);
    }
  };

  const onSave = isEdit ? handleEditSave : () => handleSave(false);
  const onSaveAndAddAnother = () => handleSave(true);

  // ── Render ────────────────────────────────────────────────────────────────

  const pageTitle =
    mode === "create" ? "Create Sale" : mode === "clone" ? "Clone Invoice" : "Edit Invoice";

  const customerOptions = allCustomers.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.customer_code})`,
  }));

  const selectedOrnamentIds = new Set(items.map((i) => i.ornamentId));
  const ornamentOptions = allOrnaments
    .filter((o) => !selectedOrnamentIds.has(o.id))
    .map((o) => ({
      value: o.id,
      label: o.name,
    }));

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          {pageTitle}
        </Title>
        <Space>
          <Button onClick={() => navigate("/invoices")}>Cancel</Button>
          {!isEdit && (
            <Button loading={saving} onClick={onSaveAndAddAnother}>
              Save &amp; Add Another
            </Button>
          )}
          <Button type="primary" loading={saving} onClick={onSave}>
            {isEdit ? "Save Notes" : "Save Invoice"}
          </Button>
        </Space>
      </div>

      {isEdit && (
        <Alert
          type="info"
          showIcon
          message="Only notes can be edited on a saved invoice. To make changes, cancel this invoice and create a new one."
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical" initialValues={{ invoice_date: dayjs(), discount: 0 }}>
        <Row gutter={24}>
          {/* ── Left (8/12) ── */}
          <Col xs={24} lg={16}>
            {/* Customer / Date / Notes card */}
            <Card style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col xs={24} sm={14}>
                  <Form.Item
                    label="Customer"
                    name="customer_id"
                    rules={[{ required: true, message: "Select a customer" }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      options={customerOptions}
                      placeholder="Search customer..."
                      disabled={isEdit}
                      loading={customerListQuery?.isLoading}
                      dropdownRender={(menu) => (
                        <>
                          {menu}
                          <Divider style={{ margin: "8px 0" }} />
                          <Button
                            type="link"
                            icon={<UserAddOutlined />}
                            block
                            onClick={() => showCustModal()}
                          >
                            Create New Customer
                          </Button>
                        </>
                      )}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={10}>
                  <Form.Item
                    label="Invoice Date"
                    name="invoice_date"
                    rules={[{ required: true, message: "Select a date" }]}
                  >
                    <DatePicker style={{ width: "100%" }} disabled={isEdit} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="Notes (optional)" name="notes">
                    <Input.TextArea
                      rows={2}
                      placeholder="Any notes for this invoice..."
                      maxLength={500}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Ornament selector */}
            {!isEdit && (
              <Card style={{ marginBottom: 16 }}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={ornamentOptions}
                  value={selectedOrnamentId}
                  onChange={(val) => {
                    setSelectedOrnamentId(val);
                    const orn = allOrnaments.find((o) => o.id === val);
                    if (orn) {
                      setItems((prev) => [...prev, buildItem(orn)]);
                      setSelectedOrnamentId(undefined);
                    }
                  }}
                  placeholder="Search ornament to add..."
                  style={{ width: "100%" }}
                  loading={ornListQuery?.isLoading}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: "8px 0" }} />
                      <Button
                        type="link"
                        icon={<PlusOutlined />}
                        block
                        onClick={() => showOrnDrawer()}
                      >
                        Create New Ornament
                      </Button>
                    </>
                  )}
                />
              </Card>
            )}

            {/* Items list */}
            {items.length === 0 ? (
              <Card>
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <Text type="secondary">
                    No items yet. Search for an ornament above and click Add.
                  </Text>
                </div>
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {items.map((item) => (
                  <ItemCard
                    key={item.key}
                    item={item}
                    isEdit={isEdit}
                    metals={metals}
                    purities={purities}
                    rates={rates}
                    charges={charges}
                    shopId={shopId}
                    onUpdate={(patch) => updateItem(item.key, patch)}
                    onRemove={() => removeItem(item.key)}
                    onRateConfigured={(base24kPaise) => {
                      // After rate is set, recalculate adjusted rate for all items of same metal
                      setItems((prev) =>
                        prev.map((i) => {
                          if (i.metalTypeId !== item.metalTypeId) return i;
                          const adj = adjustedRate(base24kPaise, i.purityValue, i.isGold);
                          return { ...i, ratePerGramPaise: adj, rateConfigured: true };
                        }),
                      );
                    }}
                    onMakingConfigured={(paise) =>
                      updateItem(item.key, {
                        makingChargePaise: paise,
                        makingConfigured: true,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </Col>

          {/* ── Right (4/12) ── */}
          <Col xs={24} lg={8}>
            <Card title="Invoice Summary" style={{ position: "sticky", top: 80 }}>
              {items.length > 0 && (
                <>
                  {items.map((item) => {
                    const { lineTotalPaise } = calcLine(
                      item.weightG,
                      item.quantity,
                      item.ratePerGramPaise,
                      item.makingChargePaise,
                    );
                    return (
                      <div
                        key={item.key}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 6,
                          alignItems: "center",
                        }}
                      >
                        <Space size={4} style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            ellipsis
                            style={{ maxWidth: 140, display: "inline-block" }}
                          >
                            {item.itemName}
                          </Text>
                          {item.isGold && item.purityDisplayName && (
                            <Tag
                              color="gold"
                              style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px" }}
                            >
                              {item.purityDisplayName}
                            </Tag>
                          )}
                        </Space>
                        <Text style={{ whiteSpace: "nowrap" }}>
                          ₹{p2Rs(lineTotalPaise).toLocaleString("en-IN")}
                        </Text>
                      </div>
                    );
                  })}
                  <Divider style={{ margin: "10px 0" }} />
                </>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <Text type="secondary">Metal Subtotal</Text>
                <Text>₹{p2Rs(totals.subtotalPaise).toLocaleString("en-IN")}</Text>
              </div>
              <div
                style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}
              >
                <Text type="secondary">Making Charges</Text>
                <Text>₹{p2Rs(totals.makingPaise).toLocaleString("en-IN")}</Text>
              </div>

              <Form.Item label="Discount (₹)" name="discount" style={{ marginBottom: 12 }}>
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={2}
                  prefix="₹"
                  disabled={isEdit}
                />
              </Form.Item>

              <Divider style={{ margin: "8px 0" }} />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <Text strong style={{ fontSize: 16 }}>
                  Total
                </Text>
                <Text strong style={{ fontSize: 22, color: "#389e0d" }}>
                  ₹{p2Rs(grandTotalPaise).toLocaleString("en-IN")}
                </Text>
              </div>

              {!isEdit && (
                <Button size="large" block loading={saving} onClick={onSaveAndAddAnother} style={{ marginBottom: 8 }}>
                  Save &amp; Add Another
                </Button>
              )}
              <Button type="primary" size="large" block loading={saving} onClick={onSave}>
                {isEdit ? "Save Notes" : "Save Invoice"}
              </Button>
            </Card>
          </Col>
        </Row>
      </Form>

      {/* Customer create modal */}
      <CustomerModal
        action="create"
        modalProps={custModalProps}
        formProps={custFormProps}
        onFinish={(values) =>
          custFormProps.onFinish?.({
            ...values,
            shop_id: shopId,
            created_by: userId,
            updated_by: userId,
          } as Partial<ICustomer>)
        }
        close={closeCustModal}
        shopId={shopId}
      />

      {/* Ornament create drawer */}
      <OrnamentDrawer
        action="create"
        drawerProps={ornDrawerProps}
        formProps={ornFormProps}
        onFinish={(values) =>
          ornFormProps.onFinish?.({
            ...values,
            shop_id: shopId,
            created_by: userId,
            updated_by: userId,
          } as Partial<IOrnament>)
        }
        close={closeOrnDrawer}
        shopId={shopId}
      />
    </div>
  );
};

// ─── ItemCard subcomponent ────────────────────────────────────────────────────

interface ItemCardProps {
  item: SaleItem;
  isEdit: boolean;
  metals: IMetalType[];
  purities: IPurityLevel[];
  rates: IMetalRate[];
  charges: IMakingCharge[];
  shopId: string;
  onUpdate: (patch: Partial<SaleItem>) => void;
  onRemove: () => void;
  onRateConfigured: (base24kPaise: number) => void;
  onMakingConfigured: (chargePaise: number) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({
  item,
  isEdit,
  metals,
  purities,
  rates,
  charges,
  shopId,
  onUpdate,
  onRemove,
  onRateConfigured,
  onMakingConfigured,
}) => {
  const { metalAmountPaise, makingAmountPaise, lineTotalPaise } = calcLine(
    item.weightG,
    item.quantity,
    item.ratePerGramPaise,
    item.makingChargePaise,
  );

  const metal = metals.find((m) => m.id === item.metalTypeId);
  const purity = purities.find((p) => p.id === item.purityLevelId);
  const todayRate = rates.find((r) => r.metal_type_id === item.metalTypeId);
  const activeMC = charges
    .filter(
      (c) => c.metal_type_id === item.metalTypeId && c.purity_level_id === item.purityLevelId,
    )
    .sort(
      (a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime(),
    )[0];

  return (
    <Card
      size="small"
      styles={{ body: { paddingBottom: 8 } }}
    >
      {/* Row 1: Info (non-editable) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <Space size={6} wrap>
          <Text strong>{item.itemName}</Text>
          <Tag color={item.isGold ? "gold" : "default"}>{item.metalTypeName}</Tag>
          {item.isGold && item.purityDisplayName && (
            <Tag color="gold" bordered={false}>
              {item.purityDisplayName}
            </Tag>
          )}
          {!item.rateConfigured && (
            <Tag color="warning" icon={<WarningOutlined />}>
              Rate not set for today
            </Tag>
          )}
          {!item.makingConfigured && (
            <Tag color="warning" icon={<WarningOutlined />}>
              Making charge not set
            </Tag>
          )}
        </Space>
        {!isEdit && (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={onRemove}
          />
        )}
      </div>

      {/* Row 2: Editable fields */}
      {!isEdit && (
        <Row gutter={[8, 4]} style={{ marginBottom: 10 }}>
          <Col xs={6}>
            <div
              style={{
                fontSize: 12,
                color: "var(--ant-color-text-secondary, #666)",
                marginBottom: 2,
              }}
            >
              Weight (g)
            </div>
            <InputNumber
              size="middle"
              value={item.weightG}
              min={0.001}
              precision={3}
              step={0.1}
              style={{ width: "100%" }}
              onChange={(v) => onUpdate({ weightG: v ?? item.weightG })}
            />
          </Col>
          <Col xs={4}>
            <div
              style={{
                fontSize: 12,
                color: "var(--ant-color-text-secondary, #666)",
                marginBottom: 2,
              }}
            >
              Qty
            </div>
            <InputNumber
              size="middle"
              value={item.quantity}
              min={1}
              max={item.ornament?.quantity ?? 99}
              precision={0}
              style={{ width: "100%" }}
              onChange={(v) => onUpdate({ quantity: v ?? 1 })}
            />
          </Col>
          <Col xs={7}>
            <div
              style={{
                fontSize: 12,
                color: "var(--ant-color-text-secondary, #666)",
                marginBottom: 2,
              }}
            >
              Rate ({rateUnit(item.metalTypeName)})
              {!item.rateConfigured && metal && (
                <RateEditPopover
                  metal={metal}
                  existingRate={todayRate}
                  shopId={shopId}
                  compact
                  trigger={
                    <Tooltip title="No rate configured for today — click to set">
                      <WarningOutlined
                        style={{ color: "#faad14", marginLeft: 4, cursor: "pointer" }}
                      />
                    </Tooltip>
                  }
                  onSuccess={() => {
                    // After saving, the rate will be refetched; pass the updated paise
                    if (todayRate) onRateConfigured(todayRate.rate_per_gram_paise);
                  }}
                />
              )}
            </div>
            <InputNumber
              size="middle"
              value={paiseToDisplay(item.ratePerGramPaise, item.metalTypeName)}
              min={0}
              precision={2}
              style={{ width: "100%" }}
              prefix="₹"
              onChange={(v) =>
                onUpdate({ ratePerGramPaise: displayToPaise(v ?? 0, item.metalTypeName), rateConfigured: true })
              }
            />
          </Col>
          <Col xs={7}>
            <div
              style={{
                fontSize: 12,
                color: "var(--ant-color-text-secondary, #666)",
                marginBottom: 2,
              }}
            >
              Making (₹/g)
              {!item.makingConfigured && metal && (
                <MakingChargePopover
                  metal={metal}
                  purityLevelId={item.purityLevelId}
                  purityLevel={item.isGold ? (purity ?? null) : null}
                  existingCharge={activeMC}
                  shopId={shopId}
                  compact
                  onSuccess={onMakingConfigured}
                />
              )}
            </div>
            <InputNumber
              size="middle"
              value={p2Rs(item.makingChargePaise)}
              min={0}
              precision={2}
              style={{ width: "100%" }}
              prefix="₹"
              onChange={(v) =>
                onUpdate({ makingChargePaise: rs2P(v ?? 0), makingConfigured: true })
              }
            />
          </Col>
        </Row>
      )}

      {/* Row 3: Calculated display */}
      <div style={{ display: "flex", gap: 12, marginTop: 8, padding: "8px 10px", borderRadius: 6, }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 11, color: "var(--ant-color-text-secondary, #666)" }}>Metal Amount</span>
          <Text>₹{p2Rs(metalAmountPaise).toLocaleString("en-IN")}</Text>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 11, color: "var(--ant-color-text-secondary, #666)" }}>Making Charge</span>
          <Text>₹{p2Rs(makingAmountPaise).toLocaleString("en-IN")}</Text>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, borderLeft: "1px solid var(--ant-color-border, #d9d9d9)", paddingLeft: 12 }}>
          <span style={{ fontSize: 11, color: "var(--ant-color-text-secondary, #666)" }}>Line Total</span>
          <Text strong style={{ color: "#1677ff", fontSize: 15 }}>₹{p2Rs(lineTotalPaise).toLocaleString("en-IN")}</Text>
        </div>
      </div>
    </Card>
  );
};
