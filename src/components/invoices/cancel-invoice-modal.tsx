import { CloseCircleOutlined } from "@ant-design/icons";
import { Alert, Form, Input, Modal, Typography } from "antd";
import React, { useEffect } from "react";

const { Text } = Typography;

interface CancelInvoiceModalProps {
  open: boolean;
  invoiceNumber: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const CancelInvoiceModal: React.FC<CancelInvoiceModalProps> = ({
  open,
  invoiceNumber,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onConfirm(values.reason as string);
    } catch {
      // validation failed
    }
  };

  return (
    <Modal
      open={open}
      title={
        <span>
          <CloseCircleOutlined style={{ color: "#ff4d4f", marginRight: 8 }} />
          Cancel Invoice
        </span>
      }
      okText="Yes, Cancel Invoice"
      okButtonProps={{ danger: true, loading }}
      cancelText="Go Back"
      onOk={handleOk}
      onCancel={onCancel}
      width={480}
    >
      <Alert
        type="warning"
        message={
          <>
            You are about to cancel invoice <Text strong>{invoiceNumber}</Text>. This will restore
            stock for all items but the invoice record will be kept for audit.
          </>
        }
        style={{ marginBottom: 16 }}
        showIcon
      />
      <Form form={form} layout="vertical">
        <Form.Item
          name="reason"
          label="Reason for Cancellation"
          rules={[
            { required: true, message: "Please provide a reason" },
            { min: 5, message: "Reason must be at least 5 characters" },
          ]}
        >
          <Input.TextArea
            rows={3}
            placeholder="e.g. Customer changed mind, incorrect item selected..."
            maxLength={500}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
