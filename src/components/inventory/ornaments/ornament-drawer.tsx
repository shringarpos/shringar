import React, { useEffect, useMemo, useRef, useState } from "react";
import { useList, useGetIdentity } from "@refinedev/core";
import { SaveButton, useSelect } from "@refinedev/antd";
import {
    Alert,
    Col,
    DatePicker,
    Divider,
    Drawer,
    Form,
    Input,
    InputNumber,
    Row,
    Select,
    Space,
    Statistic,
    Typography,
} from "antd";
import type { DrawerProps, FormProps } from "antd";
import dayjs from "dayjs";
import type { ICategory, IMetalType, IOrnament, IPurityLevel } from "../../../libs/interfaces";

// ─── Props ────────────────────────────────────────────────────────────────────

interface OrnamentDrawerProps {
    action: "create" | "edit" | "clone";
    drawerProps: DrawerProps;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formProps: FormProps<any>;
    onFinish: (values: Partial<IOrnament>) => Promise<unknown> | void;
    close: () => void;
    shopId?: string;
    saveButtonProps?: React.ComponentProps<typeof SaveButton>;
}

const actionTitles: Record<string, string> = {
    create: "Add Ornament",
    edit: "Edit Ornament",
    clone: "Clone Ornament",
};

// ─── Component ────────────────────────────────────────────────────────────────

// ─── SKU helpers ─────────────────────────────────────────────────────────────

const generateSku = (name: string): string => {
    return name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, ""))
        .filter(Boolean)
        .join("-");
};

// ─── Component ───────────────────────────────────────────────────────────────

export const OrnamentDrawer: React.FC<OrnamentDrawerProps> = ({
    action,
    drawerProps,
    formProps,
    onFinish,
    shopId,
    saveButtonProps,
}) => {
    const { data: identity } = useGetIdentity<{ id: string }>();
    const userId = identity?.id;

    // Watch form values for live calculation
    const form = formProps.form;
    const weightG: number | undefined = Form.useWatch("weight_g", form);
    const metalRateRs: number | undefined = Form.useWatch("purchase_metal_rate_rs", form);
    const makingChargeRs: number | undefined = Form.useWatch("purchase_making_charge_rs", form);
    const selectedMetalTypeId: string | undefined = Form.useWatch("metal_type_id", form);
    const nameValue: string | undefined = Form.useWatch("name", form);
    const skuValue: string | undefined = Form.useWatch("sku", form);

    // Track whether user has manually edited SKU (stops auto-gen)
    const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);
    // Debounced SKU for uniqueness check
    const [debouncedSku, setDebouncedSku] = useState("");

    const rawInitialValues = formProps.initialValues as Partial<IOrnament> | undefined;

    // ── Data fetching ─────────────────────────────────────────────────────────

    const { selectProps: categorySelectProps } = useSelect<ICategory>({
        resource: "ornament_categories",
        optionLabel: "name",
        optionValue: "id",
        defaultValue: rawInitialValues?.category_id,
        filters: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
        onSearch: (value) => [{ field: "name", operator: "contains" as const, value }],
        sorters: [{ field: "name", order: "asc" }],
        queryOptions: { enabled: !!shopId && !!drawerProps.open },
    });

    const { selectProps: metalTypeSelectProps } = useSelect<IMetalType>({
        resource: "metal_types",
        optionLabel: "name",
        optionValue: "id",
        defaultValue: rawInitialValues?.metal_type_id,
        filters: [{ field: "is_active", operator: "eq", value: true }],
        sorters: [{ field: "name", order: "asc" }],
        queryOptions: { enabled: !!drawerProps.open },
    });

    // All purity levels fetched once; filtered client-side by selected metal type
    const { query: purityQuery } = useList<IPurityLevel>({
        resource: "purity_levels",
        filters: [{ field: "is_active", operator: "eq", value: true }],
        pagination: { pageSize: 100 },
        queryOptions: { enabled: !!drawerProps.open },
    });

    const purityOptions = useMemo(() => {
        const levels: IPurityLevel[] = purityQuery?.data?.data ?? [];
        if (!selectedMetalTypeId) return levels.map((p) => ({ label: p.display_name, value: p.id }));
        return levels
            .filter((p) => p.metal_type_id === selectedMetalTypeId)
            .map((p) => ({ label: `${p.display_name} (${p.purity_value}%)`, value: p.id }));
    }, [purityQuery?.data?.data, selectedMetalTypeId]);

    // ── Purity reset – only when user actively changes metal (not on initial load) ──
    const prevMetalTypeIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (!drawerProps.open) return;
        // Skip reset when this is the initial population of the field
        if (prevMetalTypeIdRef.current !== undefined) {
            form?.setFieldValue("purity_level_id", undefined);
        }
        prevMetalTypeIdRef.current = selectedMetalTypeId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMetalTypeId]);

    // Reset tracking ref when drawer opens/closes
    useEffect(() => {
        if (drawerProps.open) {
            prevMetalTypeIdRef.current = undefined;
            // For edit: mark SKU as manually edited so auto-gen never fires
            setSkuManuallyEdited(action === "edit");
        } else {
            setSkuManuallyEdited(false);
            setDebouncedSku("");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [drawerProps.open]);

    // ── SKU auto-generation from name ─────────────────────────────────────────
    useEffect(() => {
        if (!drawerProps.open || skuManuallyEdited || !nameValue) return;
        const base = generateSku(nameValue);
        // For clone: append a short random suffix to avoid collision with the original
        const suffix = action === "clone" ? `-${Math.random().toString(36).slice(2, 6).toUpperCase()}` : "";
        form?.setFieldValue("sku", base + suffix);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nameValue]);

    // Debounce SKU for uniqueness check
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSku(skuValue ?? ""), 500);
        return () => clearTimeout(timer);
    }, [skuValue]);

    // Uniqueness check
    const currentId = rawInitialValues?.id;
    const { query: skuCheckQuery } = useList<IOrnament>({
        resource: "ornaments",
        filters: [
            { field: "sku", operator: "eq", value: debouncedSku },
            ...(shopId ? [{ field: "shop_id", operator: "eq" as const, value: shopId }] : []),
        ],
        pagination: { pageSize: 1 },
        queryOptions: { enabled: !!(debouncedSku && shopId) },
    });
    const skuTaken = (skuCheckQuery?.data?.data ?? []).some((r) => r.id !== currentId);

    // ── Live cost calculation ─────────────────────────────────────────────────

    const metalCostRs = useMemo(() => {
        if (!weightG || !metalRateRs) return 0;
        return weightG * metalRateRs;
    }, [weightG, metalRateRs]);

    const totalCostRs = useMemo(() => {
        return metalCostRs + (makingChargeRs ?? 0);
    }, [metalCostRs, makingChargeRs]);

    // Keep total cost field in sync
    useEffect(() => {
        form?.setFieldValue("purchase_total_cost_rs", totalCostRs || undefined);
    }, [form, totalCostRs]);

    // ── Submit handler ────────────────────────────────────────────────────────

    const handleFinish = async (values: Record<string, unknown>) => {
        if (skuTaken) return; // block if SKU taken

        const wG = values.weight_g as number | undefined;
        const mRateRs = values.purchase_metal_rate_rs as number | undefined;
        const mkChargeRs = values.purchase_making_charge_rs as number | undefined;
        const totalRs = values.purchase_total_cost_rs as number | undefined;

        // purchase_date comes as a dayjs object from DatePicker
        const purchaseDateRaw = values.purchase_date;
        const purchaseDate = purchaseDateRaw && dayjs.isDayjs(purchaseDateRaw)
            ? purchaseDateRaw.format("YYYY-MM-DD")
            : (purchaseDateRaw as string) || null;

        const payload: Partial<IOrnament> = {
            name: values.name as string,
            sku: (values.sku as string) || null,
            description: (values.description as string) || null,
            category_id: values.category_id as string,
            metal_type_id: values.metal_type_id as string,
            purity_level_id: values.purity_level_id as string,
            weight_mg: wG != null ? Math.round(wG * 1000) : 0,
            quantity: (values.quantity as number) ?? 0,
            purchase_metal_rate_paise: mRateRs != null ? Math.round(mRateRs * 100) : null,
            purchase_making_charge_paise: mkChargeRs != null ? Math.round(mkChargeRs * 100) : null,
            purchase_total_cost_paise: totalRs != null ? Math.round(totalRs * 100) : null,
            purchase_date: purchaseDate,
            is_active: true,
            updated_by: userId,
            ...(action !== "edit" && { created_by: userId, shop_id: shopId }),
        };

        await onFinish(payload);
    };

    // ── Normalise incoming record values (mg → g, paise → ₹) ─────────────────────

    const normalisedInitialValues = useMemo(() => {
        const raw = formProps.initialValues as Partial<IOrnament> | undefined;
        if (!raw) return { purchase_date: dayjs() }; // default date = today for create
        return {
            ...raw,
            // Clear SKU for clone so user gets a fresh auto-generated one
            sku: action === "clone" ? undefined : raw.sku,
            weight_g: raw.weight_mg != null ? raw.weight_mg / 1000 : undefined,
            purchase_metal_rate_rs:
                raw.purchase_metal_rate_paise != null
                    ? raw.purchase_metal_rate_paise / 100
                    : undefined,
            purchase_making_charge_rs:
                raw.purchase_making_charge_paise != null
                    ? raw.purchase_making_charge_paise / 100
                    : undefined,
            purchase_total_cost_rs:
                raw.purchase_total_cost_paise != null
                    ? raw.purchase_total_cost_paise / 100
                    : undefined,
            // Convert stored date string to dayjs; default empty to today
            purchase_date: raw.purchase_date ? dayjs(raw.purchase_date) : dayjs(),
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formProps.initialValues]);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <Drawer
            {...drawerProps}
            title={actionTitles[action] ?? "Ornament"}
            width={680}
            extra={
                <Space>
                    <SaveButton {...saveButtonProps} htmlType="submit" onClick={() => form?.submit()} />
                </Space>
            }
            destroyOnClose
        >
            <Form
                {...formProps}
                layout="vertical"
                initialValues={normalisedInitialValues}
                onFinish={handleFinish}
            >
                {/* ── Section 1: Basic Details ───────────────────────────── */}
                <Typography.Title level={5} style={{ marginBottom: 12 }}>
                    Basic Details
                </Typography.Title>

                <Row gutter={[16, 0]}>
                    {/* Name + SKU */}
                    <Col xs={24} sm={16}>
                        <Form.Item
                            label="Name"
                            name="name"
                            rules={[{ required: true, message: "Name is required" }]}
                        >
                            <Input placeholder="e.g. Kundan Necklace" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Form.Item
                            label="SKU"
                            name="sku"
                            validateStatus={skuTaken ? "error" : ""}
                            help={
                                skuTaken
                                    ? "SKU already exists. Choose a different one."
                                    : "Auto-generated from name. Edit to customise."
                            }
                        >
                            <Input
                                placeholder="e.g. GLD-001"
                                onChange={() => setSkuManuallyEdited(true)}
                            />
                        </Form.Item>
                    </Col>

                    {/* Description */}
                    <Col span={24}>
                        <Form.Item label="Description" name="description">
                            <Input.TextArea rows={2} placeholder="Optional notes or description…" />
                        </Form.Item>
                    </Col>

                    {/* Category + Metal Type + Purity Level */}
                    <Col xs={24} sm={8}>
                        <Form.Item
                            label="Category"
                            name="category_id"
                            rules={[{ required: true, message: "Category is required" }]}
                        >
                            <Select
                                {...categorySelectProps}
                                placeholder="Select category"
                                showSearch
                                filterOption={false}
                                allowClear
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Form.Item
                            label="Metal Type"
                            name="metal_type_id"
                            rules={[{ required: true, message: "Metal type is required" }]}
                        >
                            <Select
                                {...metalTypeSelectProps}
                                placeholder="Gold / Silver…"
                                showSearch
                                filterOption={false}
                                allowClear
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Form.Item
                            label="Purity Level"
                            name="purity_level_id"
                            rules={[{ required: true, message: "Purity is required" }]}
                        >
                            <Select
                                options={purityOptions}
                                placeholder={selectedMetalTypeId ? "Select purity…" : "Select metal first"}
                                disabled={!selectedMetalTypeId}
                                allowClear
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider style={{ margin: "8px 0 16px" }} />

                {/* ── Section 2: Physical Details ───────────────────────── */}
                <Typography.Title level={5} style={{ marginBottom: 12 }}>
                    Physical Details
                </Typography.Title>

                <Row gutter={[16, 0]}>
                    <Col xs={24} sm={12}>
                        <Form.Item
                            label="Weight (grams)"
                            name="weight_g"
                            rules={[{ required: true, message: "Weight is required" }]}
                            extra="Enter in grams (e.g. 5.5 for 5500 mg)"
                        >
                            <InputNumber
                                min={0.001}
                                step={0.1}
                                precision={3}
                                placeholder="e.g. 5.5"
                                style={{ width: "100%" }}
                                addonAfter="g"
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item
                            label="Quantity"
                            name="quantity"
                            rules={[{ required: true, message: "Quantity is required" }]}
                        >
                            <InputNumber
                                min={0}
                                step={1}
                                placeholder="e.g. 3"
                                style={{ width: "100%" }}
                                addonAfter="pcs"
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider style={{ margin: "8px 0 16px" }} />

                {/* ── Section 3: Purchase Details ───────────────────────── */}
                <Typography.Title level={5} style={{ marginBottom: 12 }}>
                    Purchase Details
                </Typography.Title>

                <Row gutter={[16, 0]}>
                    <Col xs={24} sm={12}>
                        <Form.Item
                            label="Metal Rate per gram (₹)"
                            name="purchase_metal_rate_rs"
                            extra="Rate when you bought/made it"
                        >
                            <InputNumber
                                min={0}
                                step={10}
                                precision={2}
                                placeholder="e.g. 6500.00"
                                style={{ width: "100%" }}
                                addonBefore="₹"
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item
                            label="Making Charge (₹)"
                            name="purchase_making_charge_rs"
                            extra="Total making charge paid"
                        >
                            <InputNumber
                                min={0}
                                step={10}
                                precision={2}
                                placeholder="e.g. 800.00"
                                style={{ width: "100%" }}
                                addonBefore="₹"
                            />
                        </Form.Item>
                    </Col>

                    <Col xs={24} sm={12}>
                        <Form.Item
                            label="Total Purchase Cost (₹)"
                            name="purchase_total_cost_rs"
                            extra="Auto-calculated: (weight × rate) + making"
                        >
                            <InputNumber
                                min={0}
                                step={1}
                                precision={2}
                                style={{ width: "100%" }}
                                addonBefore="₹"
                                readOnly
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item label="Purchase Date" name="purchase_date">
                            <DatePicker
                                style={{ width: "100%" }}
                                format="DD/MM/YYYY"
                                allowClear
                            />
                        </Form.Item>
                    </Col>
                </Row>

                {/* ── Cost Summary ────────────────────────────────────────── */}
                {(!!weightG || !!metalRateRs || !!makingChargeRs) && (
                    <Alert
                        style={{ marginTop: 8 }}
                        type="info"
                        showIcon
                        message={
                            <Row gutter={16}>
                                <Col xs={8}>
                                    <Statistic
                                        title="Metal Cost"
                                        value={metalCostRs}
                                        precision={2}
                                        prefix="₹"
                                        valueStyle={{ fontSize: 14 }}
                                    />
                                </Col>
                                <Col xs={8}>
                                    <Statistic
                                        title="Making Charge"
                                        value={makingChargeRs ?? 0}
                                        precision={2}
                                        prefix="₹"
                                        valueStyle={{ fontSize: 14 }}
                                    />
                                </Col>
                                <Col xs={8}>
                                    <Statistic
                                        title="Total Cost"
                                        value={totalCostRs}
                                        precision={2}
                                        prefix="₹"
                                        valueStyle={{ fontSize: 14, fontWeight: 700 }}
                                    />
                                </Col>
                            </Row>
                        }
                    />
                )}
            </Form>
        </Drawer>
    );
};
