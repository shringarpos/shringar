import React from "react";
import {
    Button,
    Card,
    Col,
    Descriptions,
    Divider,
    Drawer,
    Popconfirm,
    Row,
    Space,
    Statistic,
    Tag,
    Typography,
    theme,
} from "antd";
import { CheckCircleOutlined, EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Banknote, Clock, Coins, ShieldCheck, User } from "lucide-react";
import type { IGoldLoan } from "../../libs/interfaces";

interface LoanShowDrawerProps {
    record: IGoldLoan | null;
    open: boolean;
    onClose: () => void;
    onEdit?: () => void;
    onCloseLoan?: (record: IGoldLoan) => void;
}

export const LoanShowDrawer: React.FC<LoanShowDrawerProps> = ({
    record,
    open,
    onClose,
    onEdit,
    onCloseLoan,
}) => {
    const { token } = theme.useToken();
    if (!record) return null;

    const isRunning = record.status === "running";

    return (
        <Drawer
            open={open}
            onClose={onClose}
            width={Math.min(560, typeof window !== "undefined" ? window.innerWidth - 32 : 560)}
            destroyOnClose
            title={
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Space size="middle">
                        <Coins size={20} style={{ color: token.colorPrimary }} />
                        <div>
                            <Typography.Title level={5} style={{ margin: 0, color: token.colorText }}>
                                {record.customer_name}
                            </Typography.Title>
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                Loan Account Details
                            </Typography.Text>
                        </div>
                    </Space>
                    <Tag
                        color={isRunning ? "blue" : "green"}
                        style={{ textTransform: "capitalize", padding: "2px 10px", borderRadius: 12 }}
                    >
                        {record.status}
                    </Tag>
                </div>
            }
            styles={{
                body: {
                    padding: "20px 24px",
                    background: token.colorBgLayout,
                },
                footer: {
                    padding: "12px 24px",
                    borderTop: `1px solid ${token.colorBorderSecondary}`,
                    background: token.colorBgContainer,
                },
            }}
            footer={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        {isRunning && onCloseLoan && (
                            <Popconfirm
                                title="Close this loan account?"
                                description="Mark loan as settled? The closure date will be set to today."
                                onConfirm={() => {
                                    onClose();
                                    onCloseLoan(record);
                                }}
                                okText="Yes, Close Loan"
                                cancelText="Cancel"
                                okButtonProps={{ type: "primary" }}
                            >
                                <Button
                                    icon={<CheckCircleOutlined />}
                                    style={{
                                        color: token.colorWarning,
                                        borderColor: token.colorWarning,
                                    }}
                                >
                                    Settle & Close Loan
                                </Button>
                            </Popconfirm>
                        )}
                    </div>
                    <Space>
                        {onEdit && (
                            <Button icon={<EditOutlined />} onClick={onEdit}>
                                Edit
                            </Button>
                        )}
                        <Button type="primary" onClick={onClose}>
                            Done
                        </Button>
                    </Space>
                </div>
            }
        >
            {/* Financial Overview Card */}
            <div
                style={{
                    background: token.colorBgContainer,
                    padding: "16px 20px",
                    borderRadius: token.borderRadiusLG,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    marginBottom: 16,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                    <Banknote size={16} style={{ color: token.colorSuccess, marginRight: 8 }} />
                    <Typography.Text strong style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: token.colorTextSecondary }}>
                        Financial Summary
                    </Typography.Text>
                </div>

                <Row gutter={[16, 12]}>
                    <Col span={8}>
                        <Statistic
                            title={<span style={{ fontSize: 11, color: token.colorTextSecondary }}>Principal Amount</span>}
                            value={record.loan_amount}
                            formatter={(val) => `₹${Number(val).toLocaleString("en-IN")}`}
                            valueStyle={{ color: token.colorText, fontWeight: 700, fontSize: 18 }}
                        />
                    </Col>
                    <Col span={8}>
                        <Statistic
                            title={
                                <span style={{ fontSize: 11, color: token.colorTextSecondary }}>
                                    Interest ({record.duration_months}m @ {record.interest_rate}%)
                                </span>
                            }
                            value={record.interest_amount}
                            formatter={(val) => `₹${Number(val).toLocaleString("en-IN")}`}
                            valueStyle={{ color: token.colorWarning, fontWeight: 700, fontSize: 18 }}
                        />
                    </Col>
                    <Col span={8}>
                        <Statistic
                            title={<span style={{ fontSize: 11, color: token.colorTextSecondary }}>Total Settlement</span>}
                            value={record.total_amount}
                            formatter={(val) => `₹${Number(val).toLocaleString("en-IN")}`}
                            valueStyle={{ color: token.colorSuccess, fontWeight: 700, fontSize: 18 }}
                        />
                    </Col>
                </Row>
            </div>

            {/* Borrower Details Card */}
            <div
                style={{
                    background: token.colorBgContainer,
                    padding: "16px 20px",
                    borderRadius: token.borderRadiusLG,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    marginBottom: 16,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                    <User size={16} style={{ color: token.colorPrimary, marginRight: 8 }} />
                    <Typography.Text strong style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: token.colorTextSecondary }}>
                        Borrower Profile
                    </Typography.Text>
                </div>

                <Descriptions size="small" column={1}>
                    <Descriptions.Item label={<span style={{ color: token.colorTextSecondary }}>Customer Name</span>}>
                        <Typography.Text strong style={{ color: token.colorText }}>{record.customer_name}</Typography.Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: token.colorTextSecondary }}>Contact Phone</span>}>
                        <Typography.Text copyable style={{ color: token.colorText }}>{record.contact_no}</Typography.Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: token.colorTextSecondary }}>Nominee</span>}>
                        <Typography.Text style={{ color: token.colorText }}>{record.nominee}</Typography.Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: token.colorTextSecondary }}>Residential Address</span>}>
                        <Typography.Text style={{ color: token.colorText }}>{record.address}</Typography.Text>
                    </Descriptions.Item>
                </Descriptions>
            </div>

            {/* Collateral Card */}
            <div
                style={{
                    background: token.colorBgContainer,
                    padding: "16px 20px",
                    borderRadius: token.borderRadiusLG,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    marginBottom: 16,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                    <ShieldCheck size={16} style={{ color: token.colorWarning, marginRight: 8 }} />
                    <Typography.Text strong style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: token.colorTextSecondary }}>
                        Pledged Collateral
                    </Typography.Text>
                </div>

                <Descriptions size="small" column={2}>
                    <Descriptions.Item label={<span style={{ color: token.colorTextSecondary }}>Metal Type</span>}>
                        <Tag color={record.metal_type === "Gold" ? "gold" : "default"}>
                            {record.metal_type}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: token.colorTextSecondary }}>Purity</span>}>
                        <Tag color="cyan">{record.purity}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: token.colorTextSecondary }}>Ornament Details</span>} span={2}>
                        <Typography.Paragraph style={{ margin: 0, color: token.colorText }}>
                            {record.ornament_details}
                        </Typography.Paragraph>
                    </Descriptions.Item>
                </Descriptions>
            </div>

            {/* Timeline Card */}
            <div
                style={{
                    background: token.colorBgContainer,
                    padding: "16px 20px",
                    borderRadius: token.borderRadiusLG,
                    border: `1px solid ${token.colorBorderSecondary}`,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                    <Clock size={16} style={{ color: token.colorPrimary, marginRight: 8 }} />
                    <Typography.Text strong style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: token.colorTextSecondary }}>
                        Account Timeline
                    </Typography.Text>
                </div>

                <Descriptions size="small" column={1}>
                    <Descriptions.Item label={<span style={{ color: token.colorTextSecondary }}>Loan Issue Date</span>}>
                        <Typography.Text style={{ color: token.colorText }}>
                            {dayjs(record.loan_date).format("DD MMMM YYYY")}
                        </Typography.Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: token.colorTextSecondary }}>Settlement Date</span>}>
                        <Typography.Text style={{ color: token.colorText }}>
                            {record.closure_date ? dayjs(record.closure_date).format("DD MMMM YYYY") : "Still Active"}
                        </Typography.Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: token.colorTextSecondary }}>Recorded On</span>}>
                        <Typography.Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>
                            {dayjs(record.created_at).format("DD MMM YYYY, hh:mm A")}
                        </Typography.Text>
                    </Descriptions.Item>
                </Descriptions>
            </div>
        </Drawer>
    );
};
