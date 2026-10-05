import React, { useEffect } from "react";
import { SaveButton } from "@refinedev/antd";
import {
    Alert,
    Button,
    Col,
    DatePicker,
    Divider,
    Drawer,
    Form,
    Grid,
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
import type { IGoldLoan } from "../../libs/interfaces";

interface LoanDrawerProps {
    action: "create" | "edit" | "clone";
    drawerProps: DrawerProps;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formProps: FormProps<any>;
    onFinish: (values: Partial<IGoldLoan>) => Promise<unknown> | void;
    close: () => void;
    loading?: boolean;
    saveButtonProps?: React.ComponentProps<typeof SaveButton>;
}

const actionTitles: Record<string, string> = {
    create: "New Gold Loan",
    edit: "Edit Gold Loan",
    clone: "Duplicate Gold Loan",
};

export const LoanDrawer: React.FC<LoanDrawerProps> = ({
    action,
    drawerProps,
    formProps,
    onFinish,
    close,
    saveButtonProps,
}) => {
    const screens = Grid.useBreakpoint();
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

    return (
        <Drawer
            {...drawerProps}
            title={actionTitles[action] ?? "Gold Loan"}
            width={screens.sm ? 680 : "100%"}
            extra={
                <Space>
                    <Button onClick={close}>Cancel</Button>
                    <SaveButton
                        {...saveButtonProps}
                        htmlType="submit"
                        onClick={() => form?.submit()}
                    >
                        {action === "edit" ? "Update Loan" : "Create Loan Record"}
                    </SaveButton>
                </Space>
            }
            destroyOnClose
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
                {/* ── Section 1: Borrower Details ───────────────────────── */}
                <Typography.Title level={5} style={{ marginBottom: 12 }}>
                    Borrower Details
                </Typography.Title>

                <Row gutter={[16, 0]}>
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
                            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" allowClear />
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <Form.Item
                            name="address"
                            label="Residential Address"
                            rules={[{ required: true, message: "Enter customer address" }]}
                        >
                            <Input.TextArea rows={2} placeholder="Complete postal address..." />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider style={{ margin: "8px 0 16px" }} />

                {/* ── Section 2: Pledged Collateral ─────────────────────── */}
                <Typography.Title level={5} style={{ marginBottom: 12 }}>
                    Pledged Collateral
                </Typography.Title>

                <Row gutter={[16, 0]}>
                    <Col xs={24} sm={12}>
                        <Form.Item
                            name="metal_type"
                            label="Metal Category"
                            rules={[{ required: true, message: "Select metal category" }]}
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
                            rules={[{ required: true, message: "Select purity standard" }]}
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
                    <Col span={24}>
                        <Form.Item
                            name="ornament_details"
                            label="Ornament Description & Weight"
                            rules={[{ required: true, message: "Describe pledged items with weight" }]}
                        >
                            <Input.TextArea
                                rows={2}
                                placeholder="e.g. Gold Necklace 24.5g, 22K hallmarked, 1 pair earrings"
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider style={{ margin: "8px 0 16px" }} />

                {/* ── Section 3: Loan Terms & Interest ──────────────────── */}
                <Typography.Title level={5} style={{ marginBottom: 12 }}>
                    Loan Terms & Interest
                </Typography.Title>

                <Row gutter={[16, 0]}>
                    <Col xs={24} sm={8}>
                        <Form.Item
                            name="loan_amount"
                            label="Principal Amount"
                            rules={[{ required: true, message: "Enter principal" }]}
                        >
                            <InputNumber
                                style={{ width: "100%" }}
                                min={1}
                                step={1000}
                                precision={2}
                                placeholder="50000"
                                addonBefore="₹"
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Form.Item
                            name="duration_months"
                            label="Duration"
                            rules={[{ required: true, message: "Enter duration" }]}
                        >
                            <InputNumber
                                style={{ width: "100%" }}
                                min={1}
                                max={120}
                                step={1}
                                placeholder="12"
                                addonAfter="mo"
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Form.Item
                            name="interest_rate"
                            label="Interest Rate"
                            rules={[{ required: true, message: "Enter rate" }]}
                        >
                            <InputNumber
                                style={{ width: "100%" }}
                                min={0}
                                max={100}
                                step={0.5}
                                precision={2}
                                placeholder="18"
                                addonAfter="% p.a."
                            />
                        </Form.Item>
                    </Col>

                    {action === "edit" && (
                        <>
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
                                        <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" allowClear />
                                    </Form.Item>
                                </Col>
                            )}
                        </>
                    )}
                </Row>

                {/* ── Cost/Interest Summary Alert (matching ornament-drawer style) ── */}
                <Alert
                    style={{ marginTop: 8 }}
                    type="info"
                    showIcon
                    message={
                        <Row gutter={16}>
                            <Col xs={8}>
                                <Statistic
                                    title="Principal"
                                    value={loanAmount ? Number(loanAmount).toLocaleString("en-IN") : "0"}
                                    prefix="₹"
                                    valueStyle={{ fontSize: 14 }}
                                />
                            </Col>
                            <Col xs={8}>
                                <Statistic
                                    title={`Interest (${durationMonths || 0}m @ ${interestRate || 0}%)`}
                                    value={interestAmount ? Number(interestAmount).toLocaleString("en-IN") : "0"}
                                    prefix="₹"
                                    valueStyle={{ fontSize: 14 }}
                                />
                            </Col>
                            <Col xs={8}>
                                <Statistic
                                    title="Total Payable"
                                    value={totalAmount ? Number(totalAmount).toLocaleString("en-IN") : "0"}
                                    prefix="₹"
                                    valueStyle={{ fontSize: 14, fontWeight: 700 }}
                                />
                            </Col>
                        </Row>
                    }
                />
            </Form>
        </Drawer>
    );
};
