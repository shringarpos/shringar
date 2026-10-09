import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  InputNumber,
  DatePicker,
  Radio,
  Input,
  Button,
  Space,
  Typography,
  App,
} from "antd";
import dayjs from "dayjs";
import { recordInstallment } from "../../services/payment-ledger";

const { Text } = Typography;

interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice: {
    id: string;
    shop_id: string;
    invoice_number: string;
    total_amount_paise: number;
    notes?: string | null;
  };
  balancePaise: number;
  userId?: string;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  open,
  onClose,
  onSuccess,
  invoice,
  balancePaise,
  userId,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { notification } = App.useApp();

  const balanceRs = Math.round(balancePaise / 100);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        amountRs: balanceRs > 0 ? balanceRs : undefined,
        paymentDate: dayjs(),
        paymentMode: "CASH",
        notes: "",
      });
    }
  }, [open, balanceRs, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const amountPaise = Math.round((values.amountRs || 0) * 100);

      if (amountPaise <= 0) {
        notification.error({ message: "Payment amount must be greater than zero" });
        return;
      }

      if (amountPaise > balancePaise) {
        notification.error({
          message: "Payment amount cannot exceed remaining balance due",
        });
        return;
      }

      setSubmitting(true);
      await recordInstallment(invoice, {
        amountPaise,
        paymentMode: values.paymentMode,
        paymentDate: values.paymentDate
          ? values.paymentDate.format("YYYY-MM-DD")
          : dayjs().format("YYYY-MM-DD"),
        notes: values.notes?.trim() || null,
        userId: userId || null,
      });

      notification.success({
        message: "Payment recorded successfully",
        description: `₹${(amountPaise / 100).toLocaleString("en-IN")} credited via ${values.paymentMode}`,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errorFields" in err) {
        return; // Ant Design form validation error
      }
      notification.error({
        message: "Failed to record payment",
        description: err instanceof Error ? err.message : "Unexpected error occurred",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={
        <div style={{ paddingBottom: 6 }}>
          <Text strong style={{ fontSize: 16 }}>
            Record Payment Installment
          </Text>
          <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
            Invoice #{invoice.invoice_number} • Remaining Due: ₹
            {(balancePaise / 100).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </Text>
        </div>
      }
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText="Record Payment"
      destroyOnClose
      centered
      width={480}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item
          label={
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
              <span>Payment Amount (₹)</span>
              <Space size={4}>
                <Button
                  size="small"
                  type="link"
                  onClick={() => form.setFieldsValue({ amountRs: balanceRs })}
                  style={{ padding: 0, height: "auto", fontSize: 12 }}
                >
                  Full Due
                </Button>
                {balanceRs > 1 && (
                  <>
                    <span style={{ color: "#d9d9d9" }}>|</span>
                    <Button
                      size="small"
                      type="link"
                      onClick={() =>
                        form.setFieldsValue({ amountRs: Math.round(balanceRs * 0.5) })
                      }
                      style={{ padding: 0, height: "auto", fontSize: 12 }}
                    >
                      50%
                    </Button>
                  </>
                )}
              </Space>
            </div>
          }
          name="amountRs"
          rules={[
            { required: true, message: "Please enter payment amount" },
            {
              type: "number",
              min: 1,
              message: "Amount must be at least ₹1",
            },
            {
              type: "number",
              max: balanceRs,
              message: `Amount cannot exceed balance due of ₹${balanceRs.toLocaleString("en-IN")}`,
            },
          ]}
        >
          <InputNumber
            prefix="₹"
            placeholder="0"
            precision={0}
            min={1}
            max={balanceRs}
            style={{ width: "100%" }}
            size="large"
          />
        </Form.Item>

        <Form.Item
          label="Payment Mode"
          name="paymentMode"
          rules={[{ required: true, message: "Please select payment mode" }]}
        >
          <Radio.Group buttonStyle="solid" style={{ width: "100%", display: "flex" }}>
            <Radio.Button value="CASH" style={{ flex: 1, textAlign: "center" }}>
              Cash
            </Radio.Button>
            <Radio.Button value="UPI" style={{ flex: 1, textAlign: "center" }}>
              UPI
            </Radio.Button>
            <Radio.Button value="CARD" style={{ flex: 1, textAlign: "center" }}>
              Card
            </Radio.Button>
            <Radio.Button value="NET_BANKING" style={{ flex: 1, textAlign: "center" }}>
              Bank
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label="Payment Date"
          name="paymentDate"
          rules={[{ required: true, message: "Please select payment date" }]}
        >
          <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
        </Form.Item>

        <Form.Item label="Reference Notes / Transaction ID" name="notes">
          <Input.TextArea
            rows={2}
            placeholder="e.g. UPI ref #987654, cheque clearance, etc."
            maxLength={300}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
