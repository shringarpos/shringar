import React from "react";
import { useGo } from "@refinedev/core";
import {
    Badge,
    Button,
    Col,
    Descriptions,
    Divider,
    Drawer,
    Row,
    Space,
    Statistic,
    Tag,
    Typography,
} from "antd";
import {
    CalendarOutlined,
    EditOutlined,
    FileTextOutlined,
    GoldOutlined,
    InboxOutlined,
} from "@ant-design/icons";
import type { IOrnamentWithDetails } from "../../../libs/interfaces";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const paise2Rs = (paise?: number | null) =>
    paise != null ? (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—";

const mg2g = (mg?: number | null) =>
    mg != null ? (mg / 1000).toLocaleString("en-IN", { minimumFractionDigits: 3 }) : "—";

// ─── Props ────────────────────────────────────────────────────────────────────

interface OrnamentShowDrawerProps {
    record: IOrnamentWithDetails | null;
    open: boolean;
    onClose: () => void;
    onEdit?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const OrnamentShowDrawer: React.FC<OrnamentShowDrawerProps> = ({
    record,
    open,
    onClose,
    onEdit,
}) => {
    const go = useGo();

    if (!record) return null;

    const handleViewInvoices = () => {
        onClose();
        go({
            to: { resource: "invoices", action: "list" },
            query: {
                filters: [{ field: "invoice_items.ornament_id", operator: "eq", value: record.id }],
            },
            type: "push",
        });
    };

    const weightG = record.weight_mg != null ? record.weight_mg / 1000 : null;
    const metalCostRs =
        weightG != null && record.purchase_metal_rate_paise != null
            ? (weightG * record.purchase_metal_rate_paise) / 100
            : null;
    const makingRs =
        record.purchase_making_charge_paise != null
            ? record.purchase_making_charge_paise / 100
            : null;
    const totalRs =
        record.purchase_total_cost_paise != null
            ? record.purchase_total_cost_paise / 100
            : null;
    const makingPct =
        metalCostRs && makingRs ? ((makingRs / metalCostRs) * 100).toFixed(1) : null;

    return (
        <Drawer
            title={
                <Space>
                    <GoldOutlined />
                    <span>{record.name}</span>
                    <Tag color={record.is_active ? "success" : "default"} style={{ marginLeft: 4 }}>
                        {record.is_active ? "Active" : "Inactive"}
                    </Tag>
                </Space>
            }
            open={open}
            onClose={onClose}
            width={560}
            destroyOnClose
            extra={
                <Space>
                    <Button icon={<FileTextOutlined />} size="small" onClick={handleViewInvoices}>
                        Invoices
                    </Button>
                    {onEdit && (
                        <Button icon={<EditOutlined />} size="small" type="primary" onClick={onEdit}>
                            Edit
                        </Button>
                    )}
                </Space>
            }
        >
            {/* SKU / Identifier */}
            {record.sku && (
                <div style={{ marginBottom: 16 }}>
                    <Badge
                        count={record.sku}
                        style={{
                            backgroundColor: "#1677ff",
                            fontSize: 13,
                            padding: "0 12px",
                            height: 26,
                            lineHeight: "26px",
                            borderRadius: 13,
                            fontFamily: "monospace",
                        }}
                    />
                </div>
            )}

            {/* KPI row */}
            <Row gutter={16} style={{ marginBottom: 20 }}>
                <Col xs={8}>
                    <Statistic
                        title="Weight"
                        value={weightG ?? 0}
                        precision={3}
                        suffix="g"
                        valueStyle={{ fontSize: 18 }}
                    />
                </Col>
                <Col xs={8}>
                    <Statistic
                        title="Quantity"
                        value={record.quantity}
                        suffix="pcs"
                        valueStyle={{
                            fontSize: 18,
                            color: record.quantity <= 2 ? "#ff4d4f" : undefined,
                        }}
                    />
                </Col>
                <Col xs={8}>
                    <Statistic
                        title="Total Cost"
                        value={totalRs ?? 0}
                        precision={2}
                        prefix="₹"
                        valueStyle={{ fontSize: 18, fontWeight: 600 }}
                    />
                </Col>
            </Row>

            <Divider style={{ margin: "0 0 16px" }} />

            {/* Basic Details */}
            <Typography.Title level={5} style={{ marginBottom: 10 }}>
                <InboxOutlined style={{ marginRight: 6 }} />
                Basic Details
            </Typography.Title>
            <Descriptions column={1} bordered size="small" style={{ marginBottom: 20 }}>
                <Descriptions.Item label="Name">{record.name}</Descriptions.Item>
                {record.sku && <Descriptions.Item label="SKU">{record.sku}</Descriptions.Item>}
                <Descriptions.Item label="Category">
                    {record.category?.name ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Metal Type">
                    {record.metal_type?.name ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Purity">
                    {record.purity_level?.display_name
                        ? `${record.purity_level.display_name} (${record.purity_level.purity_value}%)`
                        : "—"}
                </Descriptions.Item>
                {record.description && (
                    <Descriptions.Item label="Description">{record.description}</Descriptions.Item>
                )}
            </Descriptions>

            {/* Purchase Details */}
            {(record.purchase_metal_rate_paise ||
                record.purchase_making_charge_paise ||
                record.purchase_date) && (
                <>
                    <Typography.Title level={5} style={{ marginBottom: 10 }}>
                        <CalendarOutlined style={{ marginRight: 6 }} />
                        Purchase Details
                    </Typography.Title>
                    <Descriptions column={1} bordered size="small">
                        {record.purchase_date && (
                            <Descriptions.Item label="Purchase Date">
                                {new Date(record.purchase_date).toLocaleDateString("en-IN")}
                            </Descriptions.Item>
                        )}
                        {record.purchase_metal_rate_paise != null && (
                            <Descriptions.Item label="Metal Rate / gram">
                                ₹{paise2Rs(record.purchase_metal_rate_paise)}
                            </Descriptions.Item>
                        )}
                        {metalCostRs != null && (
                            <Descriptions.Item label="Metal Cost">
                                ₹{metalCostRs.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                <Typography.Text type="secondary" style={{ marginLeft: 6, fontSize: 11 }}>
                                    ({mg2g(record.weight_mg)} g × ₹{paise2Rs(record.purchase_metal_rate_paise)}/g)
                                </Typography.Text>
                            </Descriptions.Item>
                        )}
                        {record.purchase_making_charge_paise != null && (
                            <Descriptions.Item label="Making Charge">
                                ₹{paise2Rs(record.purchase_making_charge_paise)}
                                {makingPct && (
                                    <Typography.Text type="secondary" style={{ marginLeft: 6, fontSize: 11 }}>
                                        ({makingPct}% of metal cost)
                                    </Typography.Text>
                                )}
                            </Descriptions.Item>
                        )}
                        {record.purchase_total_cost_paise != null && (
                            <Descriptions.Item label="Total Cost">
                                <Typography.Text strong>
                                    ₹{paise2Rs(record.purchase_total_cost_paise)}
                                </Typography.Text>
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                </>
            )}

            {/* Footer timestamps */}
            <Divider />
            <Space direction="vertical" size={2} style={{ fontSize: 11, color: "#8c8c8c" }}>
                <span>Created: {new Date(record.created_at).toLocaleString("en-IN")}</span>
                <span>Updated: {new Date(record.updated_at).toLocaleString("en-IN")}</span>
            </Space>
        </Drawer>
    );
};
