import React, { useEffect, useState } from "react";
import { useCreate, useGetIdentity } from "@refinedev/core";
import { useSelect } from "@refinedev/antd";
import {
    Button,
    Col,
    Form,
    Input,
    Modal,
    Row,
    Select,
    Typography,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { FormProps, ModalProps } from "antd";
import type { ICustomer } from "../../libs/interfaces";

interface CustomerModalProps {
    action: "create" | "edit" | "clone";
    modalProps: ModalProps;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formProps: FormProps<any>;
    onFinish: (values: Partial<ICustomer>) => Promise<unknown> | void;
    close: () => void;
    shopId?: string;
    excludeCustomerId?: string;
}

const actionTitles: Record<string, string> = {
    create: "Add Customer",
    edit: "Edit Customer",
    clone: "Clone Customer",
};

export const CustomerModal: React.FC<CustomerModalProps> = ({
    action,
    modalProps,
    formProps,
    onFinish,
    close: _close,
    shopId,
    excludeCustomerId,
}) => {
    const [showQuickCreate, setShowQuickCreate] = useState(false);
    const [quickForm] = Form.useForm();

    const { data: identity } = useGetIdentity<{ id: string }>();
    const userId = identity?.id;

    // Close quick-create whenever the main modal closes
    useEffect(() => {
        if (!modalProps.open) {
            setShowQuickCreate(false);
            quickForm.resetFields();
        }
    }, [modalProps.open, quickForm]);

    const {
        selectProps: refSelectProps,
        query: refQuery,
    } = useSelect<ICustomer>({
        resource: "customers",
        optionLabel: (item) => `${item.name} (${item.customer_code})`,
        optionValue: "id",
        filters: [
            ...(shopId ? [{ field: "shop_id", operator: "eq" as const, value: shopId }] : []),
            ...(excludeCustomerId
                ? [{ field: "id", operator: "ne" as const, value: excludeCustomerId }]
                : []),
        ],
        onSearch: (value) => [
            // search by name; code is visible in label so users can still identify
            { field: "name", operator: "contains" as const, value },
        ],
        queryOptions: { enabled: !!shopId && !!modalProps.open },
    });

    const { mutate: quickCreate, mutation: quickMutation } = useCreate<ICustomer>();
    const quickCreateLoading = quickMutation.isPending;

    const handleFinish = async (values: Partial<ICustomer>) => {
        await onFinish(values);
    };

    const handleQuickCreate = (values: Partial<ICustomer>) => {
        quickCreate(
            {
                resource: "customers",
                values: {
                    name: values.name,
                    phone: values.phone,
                    address: values.address ?? "",
                    email: values.email ?? null,
                    alternate_phone: values.alternate_phone ?? null,
                    shop_id: shopId,
                    created_by: userId,
                    updated_by: userId,
                    is_active: true,
                },
                successNotification: () => ({
                    message: `Customer "${values.name}" created`,
                    description: "You can now select them as the referral.",
                    type: "success",
                }),
            },
            {
                onSuccess: (data) => {
                    const newId = data.data.id;
                    formProps.form?.setFieldsValue({ reference_by: newId });
                    refQuery.refetch();
                    setShowQuickCreate(false);
                    quickForm.resetFields();
                },
            }
        );
    };

    const referralDropdownRender = (menu: React.ReactNode) => (
        <>
            {menu}
            <div
                style={{
                    padding: "6px 12px",
                    borderTop: "1px solid #f0f0f0",
                }}
            >
                <Button
                    type="link"
                    icon={<PlusOutlined />}
                    size="small"
                    onClick={(e) => {
                        e.preventDefault();
                        setShowQuickCreate(true);
                    }}
                >
                    New Customer
                </Button>
            </div>
        </>
    );

    return (
        <>
            <Modal
                {...modalProps}
                title={actionTitles[action] ?? "Customer"}
                destroyOnHidden
                width={700}
            >
                <Form {...formProps} layout="vertical" onFinish={handleFinish}>
                    <Row gutter={[16, 0]}>
                        {/* Name */}
                        <Col xs={24} sm={12}>
                            <Form.Item
                                label="Full Name"
                                name="name"
                                rules={[{ required: true, message: "Name is required" }]}
                            >
                                <Input placeholder="e.g. Priya Sharma" />
                            </Form.Item>
                        </Col>

                        {/* Phone */}
                        <Col xs={24} sm={12}>
                            <Form.Item
                                label="Phone"
                                name="phone"
                                rules={[{ required: true, message: "Phone number is required" }]}
                            >
                                <Input placeholder="+91 98765 43210" />
                            </Form.Item>
                        </Col>

                        {/* Alternate Phone */}
                        <Col xs={24} sm={12}>
                            <Form.Item label="Alternate Phone" name="alternate_phone">
                                <Input placeholder="Optional alternate number" />
                            </Form.Item>
                        </Col>

                        {/* Email */}
                        <Col xs={24} sm={12}>
                            <Form.Item
                                label="Email"
                                name="email"
                                rules={[{ type: "email", message: "Enter a valid email" }]}
                            >
                                <Input placeholder="customer@email.com" />
                            </Form.Item>
                        </Col>

                        {/* Address */}
                        <Col span={24}>
                            <Form.Item
                                label="Address"
                                name="address"
                                rules={[{ required: true, message: "Address is required" }]}
                            >
                                <Input.TextArea rows={2} placeholder="Full street address" />
                            </Form.Item>
                        </Col>

                        {/* Referred By */}
                        <Col span={24}>
                            <Form.Item
                                label={
                                    <Typography.Text>
                                        Referred By{" "}
                                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                            (search by name or code)
                                        </Typography.Text>
                                    </Typography.Text>
                                }
                                name="reference_by"
                            >
                                <Select
                                    {...refSelectProps}
                                    allowClear
                                    showSearch
                                    placeholder="Search customer by name or code…"
                                    dropdownRender={referralDropdownRender}
                                    filterOption={false}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            {/* Quick-create customer for reference_by */}
            <Modal
                title="Quick Add Customer (Referral)"
                open={showQuickCreate}
                onCancel={() => {
                    setShowQuickCreate(false);
                    quickForm.resetFields();
                }}
                onOk={() => quickForm.submit()}
                okText="Create & Select"
                confirmLoading={quickCreateLoading}
                destroyOnHidden
                width={460}
                zIndex={1001}
            >
                <Typography.Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                    Create a new customer to use as referral. They will be immediately selectable.
                </Typography.Text>
                <Form form={quickForm} layout="vertical" onFinish={handleQuickCreate}>
                    <Form.Item
                        label="Full Name"
                        name="name"
                        rules={[{ required: true, message: "Name is required" }]}
                    >
                        <Input placeholder="Referral customer name" />
                    </Form.Item>
                    <Form.Item
                        label="Phone"
                        name="phone"
                        rules={[{ required: true, message: "Phone is required" }]}
                    >
                        <Input placeholder="+91 98765 43210" />
                    </Form.Item>
                    <Form.Item
                        label="Address"
                        name="address"
                        rules={[{ required: true, message: "Address is required" }]}
                    >
                        <Input.TextArea rows={2} placeholder="Full address" />
                    </Form.Item>
                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[{ type: "email", message: "Enter a valid email" }]}
                    >
                        <Input placeholder="Optional email" />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};
