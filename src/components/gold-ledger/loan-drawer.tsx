import React, { useEffect } from "react";
import {
    Button,
    Col,
    DatePicker,
    Drawer,
    Form,
    Input,
    InputNumber,
    Row,
    Select,
    Space,
    Tag,
    Typography,
    theme,
} from "antd";
import type { DrawerProps, FormProps } from "antd";
import dayjs from "dayjs";
import { Banknote, Coins, User } from "lucide-react";
import type { IGoldLoan } from "../../libs/interfaces";

interface LoanDrawerProps {
    action: "create" | "edit" | "clone";
    drawerProps: DrawerProps;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formProps: FormProps<any>;
    onFinish: (values: Partial<IGoldLoan>) => Promise<unknown> | void;
    close: () => void;
    loading?: boolean;
    saveButtonProps?: React.ComponentProps<typeof Button>;
}

const actionTitles: Record<string, { title: string; tag: string; color: string }> = {
    create: { title: "New Gold Loan", tag: "Create", color: "blue" },
    edit: { title: "Edit Gold Loan", tag: "Editing", color: "orange" },
    clone: { title: "Duplicate Gold Loan", tag: "Clone", color: "purple" },
};

export const LoanDrawer: React.FC<LoanDrawerProps> = ({
    action,
    drawerProps,
    formProps,
    onFinish,
    close,
    loading,
    saveButtonProps,
}) => {
    const { token } = theme.useToken();
    const form = formProps.form;

    // Watch fields for live simple-interest calculation
    const loanAmount = Form.useWatch("loan_amount", form) || 0;
    const durationMonths = Form.useWatch("duration_months", form) || 0;
    const interestRate = Form.useWatch("interest_rate", form) || 0;
    const metalType = Form.useWatch("metal_type", form) || "Gold";
    const status = Form.useWatch("status", form) || "running";

    // Recalculate interest and total
    const interestAmount = Math.round(((loanAmount * interestRate * durationMonths) / 1200) * 100) / 100;
    const totalAmount = Math.round((Number(loanAmount) + Number(interestAmount)) * 100) / 100;

    // Initialize or format dates on open
    useEffect(() => {
        if (drawerProps.open && form) {
            const rawDate = form.getFieldValue("loan_date");
            if (!rawDate && action === "create") {
                form.setFieldsValue({
                    loan_date: dayjs(),
                    metal_type: "Gold",
                    purity: "22K",
                    duration_months: 12,
                    interest_rate: 18,
                    status: "running",
                });
            } else if (rawDate && typeof rawDate === "string") {
                form.setFieldValue("loan_date", dayjs(rawDate));
            }

            const rawClosureDate = form.getFieldValue("closure_date");
            if (rawClosureDate && typeof rawClosureDate === "string") {
                form.setFieldValue("closure_date", dayjs(rawClosureDate));
            }
        }
    }, [drawerProps.open, form, action]);

    const handleSubmit = async (values: any) => {
        const payload: Partial<IGoldLoan> = {
            ...values,
            loan_date: values.loan_date ? dayjs(values.loan_date).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
            closure_date: values.status === "closed"
                ? (values.closure_date ? dayjs(values.closure_date).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"))
                : null,
            loan_amount: Number(values.loan_amount),
            duration_months: Number(values.duration_months),
            interest_rate: Number(values.interest_rate),
            interest_amount: interestAmount,
            total_amount: totalAmount,
            status: values.status || "running",
        };

        await onFinish(payload);
    };

    const actionInfo = actionTitles[action] || actionTitles.create;

    return (
        <Drawer
            {...drawerProps}
            title={
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Space size="middle">
                        <Coins size={20} style={{ color: token.colorPrimary }} />
                        <Typography.Title level={5} style={{ margin: 0, color: token.colorText }}>
                            {actionInfo.title}
                        </Typography.Title>
                        <Tag color={actionInfo.color}>{actionInfo.tag}</Tag>
                    </Space>
                </div>
            }
            width={Math.min(580, typeof window !== "undefined" ? window.innerWidth - 32 : 580)}
            destroyOnClose
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
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Space>
                        <Button onClick={close}>Cancel</Button>
                        <Button
                            type="primary"
                            loading={loading || saveButtonProps?.loading}
                            onClick={() => form?.submit()}
                        >
                            {action === "edit" ? "Update Loan" : "Create Loan Record"}
                        </Button>
                    </Space>
                </div>
            }
        >
            <Form
                {...formProps}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                    metal_type: "Gold",
                    purity: "22K",
                    duration_months: 12,
                    interest_rate: 18,
                    status: "running",
                }}
            >
                {/* 1. Borrower Information Section */}
                <div
                    style={{
                        background: token.colorBgContainer,
                        padding: "16px 20px",
                        borderRadius: token.borderRadiusLG,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        marginBottom: 16,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
                        <User size={16} style={{ color: token.colorPrimary, marginRight: 8 }} />
                        <Typography.Text strong style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em", color: token.colorTextSecondary }}>
                            Borrower Details
                        </Typography.Text>
                    </div>

                    <Row gutter={12}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="customer_name"
                                label="Customer Full Name"
                                rules={[{ required: true, message: "Enter customer name" }]}
                            >
                                <Input placeholder="e.g. Ramesh Sharma" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="contact_no"
                                label="Contact Phone"
                                rules={[{ required: true, message: "Enter contact phone" }]}
                            >
                                <Input placeholder="e.g. 9876543210" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={12}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="nominee"
                                label="Nominee Name"
                                rules={[{ required: true, message: "Enter nominee name" }]}
                            >
                                <Input placeholder="e.g. Suresh Sharma" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="loan_date"
                                label="Date Pledged"
                                rules={[{ required: true, message: "Select loan date" }]}
                            >
                                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="address"
                        label="Residential Address"
                        rules={[{ required: true, message: "Enter customer address" }]}
                        style={{ marginBottom: 0 }}
                    >
                        <Input.TextArea rows={2} placeholder="Complete postal address..." />
                    </Form.Item>
                </div>

                {/* 2. Collateral Details Section */}
                <div
                    style={{
                        background: token.colorBgContainer,
                        padding: "16px 20px",
                        borderRadius: token.borderRadiusLG,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        marginBottom: 16,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
                        <Coins size={16} style={{ color: token.colorWarning, marginRight: 8 }} />
                        <Typography.Text strong style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em", color: token.colorTextSecondary }}>
                            Pledged Collateral
                        </Typography.Text>
                    </div>

                    <Row gutter={12}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="metal_type"
                                label="Metal Category"
                                rules={[{ required: true }]}
                            >
                                <Select
                                    options={[
                                        { label: "Gold", value: "Gold" },
                                        { label: "Silver", value: "Silver" },
                                    ]}
                                />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="purity"
                                label="Purity Standard"
                                rules={[{ required: true, message: "Select purity" }]}
                            >
                                <Select
                                    options={
                                        metalType === "Silver"
                                            ? [
                                                  { label: "99.9%", value: "99.9%" },
                                                  { label: "92.5%", value: "92.5%" },
                                                  { label: "80%", value: "80%" },
                                                  { label: "Custom", value: "Custom" },
                                              ]
                                            : [
                                                  { label: "24K", value: "24K" },
                                                  { label: "22K", value: "22K" },
                                                  { label: "18K", value: "18K" },
                                                  { label: "14K", value: "14K" },
                                                  { label: "Custom", value: "Custom" },
                                              ]
                                    }
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="ornament_details"
                        label="Ornament Description & Weight"
                        rules={[{ required: true, message: "Describe pledged items with weight" }]}
                        style={{ marginBottom: 0 }}
                    >
                        <Input.TextArea
                            rows={2}
                            placeholder="e.g. Gold Necklace 24.5g, 22K hallmarked, 1 pair earrings"
                        />
                    </Form.Item>
                </div>

                {/* 3. Financials & Terms Section */}
                <div
                    style={{
                        background: token.colorBgContainer,
                        padding: "16px 20px",
                        borderRadius: token.borderRadiusLG,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        marginBottom: 16,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
                        <Banknote size={16} style={{ color: token.colorSuccess, marginRight: 8 }} />
                        <Typography.Text strong style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em", color: token.colorTextSecondary }}>
                            Loan Terms & Interest
                        </Typography.Text>
                    </div>

                    <Row gutter={12}>
                        <Col xs={24} sm={8}>
                            <Form.Item
                                name="loan_amount"
                                label="Principal (₹)"
                                rules={[{ required: true, message: "Enter principal" }]}
                            >
                                <InputNumber
                                    style={{ width: "100%" }}
                                    min={1}
                                    step={1000}
                                    placeholder="50000"
                                    formatter={(val) => `₹ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                    parser={(val) => val!.replace(/₹\s?|(,*)/g, "") as any}
                                />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={8}>
                            <Form.Item
                                name="duration_months"
                                label="Duration (Mo)"
                                rules={[{ required: true, message: "Enter duration" }]}
                            >
                                <InputNumber
                                    style={{ width: "100%" }}
                                    min={1}
                                    max={120}
                                    placeholder="12"
                                />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={8}>
                            <Form.Item
                                name="interest_rate"
                                label="Interest Rate (% p.a.)"
                                rules={[{ required: true, message: "Enter rate" }]}
                            >
                                <InputNumber
                                    style={{ width: "100%" }}
                                    min={0}
                                    max={100}
                                    step={0.5}
                                    placeholder="18"
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    {action === "edit" && (
                        <Row gutter={12}>
                            <Col xs={24} sm={12}>
                                <Form.Item name="status" label="Loan Status">
                                    <Select
                                        options={[
                                            { label: "Running", value: "running" },
                                            { label: "Closed", value: "closed" },
                                        ]}
                                    />
                                </Form.Item>
                            </Col>
                            {status === "closed" && (
                                <Col xs={24} sm={12}>
                                    <Form.Item name="closure_date" label="Closure Date">
                                        <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
                                    </Form.Item>
                                </Col>
                            )}
                        </Row>
                    )}

                    {/* Dynamic Calculation Live Box */}
                    <div
                        style={{
                            background: token.colorFillAlter,
                            borderRadius: token.borderRadius,
                            border: `1px solid ${token.colorBorderSecondary}`,
                            padding: "12px 14px",
                            marginTop: 4,
                        }}
                    >
                        <Row gutter={12}>
                            <Col span={8}>
                                <div style={{ fontSize: 11, color: token.colorTextSecondary }}>
                                    Principal
                                </div>
                                <div style={{ fontWeight: 600, fontSize: 14, color: token.colorText }}>
                                    ₹{Number(loanAmount || 0).toLocaleString("en-IN")}
                                </div>
                            </Col>
                            <Col span={8}>
                                <div style={{ fontSize: 11, color: token.colorTextSecondary }}>
                                    Interest ({durationMonths}m @ {interestRate}%)
                                </div>
                                <div style={{ fontWeight: 600, fontSize: 14, color: token.colorWarning }}>
                                    ₹{interestAmount.toLocaleString("en-IN")}
                                </div>
                            </Col>
                            <Col span={8}>
                                <div style={{ fontSize: 11, color: token.colorTextSecondary }}>
                                    Total Payable
                                </div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: token.colorSuccess }}>
                                    ₹{totalAmount.toLocaleString("en-IN")}
                                </div>
                            </Col>
                        </Row>
                    </div>
                </div>
            </Form>
        </Drawer>
    );
};
