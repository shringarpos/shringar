import React from "react";
import { useGo } from "@refinedev/core";
import {
    Badge,
    Button,
    Col,
    Descriptions,
    Modal,
    Row,
    Space,
    Tag,
    Typography,
} from "antd";
import {
    FileTextOutlined,
    MailOutlined,
    PhoneOutlined,
    UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { ICustomer } from "../../libs/interfaces";

interface CustomerShowModalProps {
    record: ICustomer | null;
    open: boolean;
    onClose: () => void;
    onEdit?: () => void;
}

export const CustomerShowModal: React.FC<CustomerShowModalProps> = ({
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
                filters: [
                    { field: "customer_id", operator: "eq", value: record.id },
                ],
            },
            type: "push",
        });
    };

    const handleViewReferredCustomers = () => {
        onClose();
        const id = encodeURIComponent(record.id);
        window.location.href =
            `/customers` +
            `?filters[0][field]=reference_by&filters[0][operator]=in&filters[0][value][0]=${id}` +
            `&filters[1][field]=reference_by&filters[1][operator]=eq&filters[1][value]=${id}` +
            `&sorters[0][field]=created_at&sorters[0][order]=desc&currentPage=1&pageSize=10`;
    };

    const referredLabel = record.referred_customer
        ? `${record.referred_customer.name} (${record.referred_customer.customer_code})`
        : record.reference_by
        ? "Loading…"
        : "—";

    return (
        <Modal
            title={
                <Space>
                    <UserOutlined />
                    <span>Customer Details</span>
                    <Tag
                        color={record.is_active ? "success" : "default"}
                        style={{ marginLeft: 4 }}
                    >
                        {record.is_active ? "Active" : "Inactive"}
                    </Tag>
                </Space>
            }
            open={open}
            onCancel={onClose}
            footer={
                <Row justify="space-between" align="middle">
                    <Col>
                        <Space>
                            <Button
                                icon={<FileTextOutlined />}
                                onClick={handleViewInvoices}
                            >
                                View Invoices
                            </Button>
                            <Button
                                icon={<UserOutlined />}
                                onClick={handleViewReferredCustomers}
                            >
                                Referred Customers
                            </Button>
                        </Space>
                    </Col>
                    <Col>
                        <Space>
                            {onEdit && (
                                <Button type="primary" onClick={() => { onClose(); onEdit?.(); }}>
                                    Edit
                                </Button>
                            )}
                            <Button onClick={onClose}>Close</Button>
                        </Space>
                    </Col>
                </Row>
            }
            width={600}
            destroyOnHidden
        >
            {/* Customer Code Badge */}
            <div style={{ marginBottom: 20 }}>
                <Badge
                    count={record.customer_code}
                    style={{
                        backgroundColor: "#1677ff",
                        fontSize: 14,
                        padding: "0 12px",
                        height: 28,
                        lineHeight: "28px",
                        borderRadius: 14,
                    }}
                />
            </div>

            <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Full Name">
                    <Typography.Text strong>{record.name}</Typography.Text>
                </Descriptions.Item>

                <Descriptions.Item
                    label={
                        <Space size={4}>
                            <PhoneOutlined />
                            Phone
                        </Space>
                    }
                >
                    {record.phone}
                    {record.alternate_phone && (
                        <Typography.Text
                            type="secondary"
                            style={{ display: "block", fontSize: 12 }}
                        >
                            Alt: {record.alternate_phone}
                        </Typography.Text>
                    )}
                </Descriptions.Item>

                <Descriptions.Item
                    label={
                        <Space size={4}>
                            <MailOutlined />
                            Email
                        </Space>
                    }
                >
                    {record.email || <Typography.Text type="secondary">—</Typography.Text>}
                </Descriptions.Item>

                <Descriptions.Item label="Address">
                    {record.address}
                </Descriptions.Item>

                <Descriptions.Item label="Referred By">
                    {referredLabel}  
                </Descriptions.Item>

                <Descriptions.Item label="Joined">
                    {dayjs(record.created_at).format("DD MMM YYYY")}
                </Descriptions.Item>

                <Descriptions.Item label="Last Updated">
                    {dayjs(record.updated_at).format("DD MMM YYYY, HH:mm")}
                </Descriptions.Item>
            </Descriptions>
        </Modal>
    );
};
