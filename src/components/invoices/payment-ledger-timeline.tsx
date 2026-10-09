import React from "react";
import {
  Card,
  Timeline,
  Tag,
  Typography,
  Space,
  Empty,
  Button,
  theme,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  BankOutlined,
  DollarOutlined,
  MobileOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { IInvoicePayment } from "../../libs/interfaces";

const { Text } = Typography;

interface PaymentLedgerTimelineProps {
  payments: IInvoicePayment[];
  totalAmountPaise: number;
  balancePaise: number;
  onRecordPaymentClick?: () => void;
  isCancelled?: boolean;
}

const getPaymentModeConfig = (mode: string) => {
  switch (mode?.toUpperCase()) {
    case "UPI":
      return { label: "UPI", color: "purple", icon: <MobileOutlined /> };
    case "CARD":
      return { label: "Card", color: "blue", icon: <CreditCardOutlined /> };
    case "NET_BANKING":
    case "BANK":
    case "BANK_TRANSFER":
      return { label: "Bank Transfer", color: "cyan", icon: <BankOutlined /> };
    case "CASH":
    default:
      return { label: "Cash", color: "green", icon: <DollarOutlined /> };
  }
};

export const PaymentLedgerTimeline: React.FC<PaymentLedgerTimelineProps> = ({
  payments,
  totalAmountPaise: _totalAmountPaise,
  balancePaise,
  onRecordPaymentClick,
  isCancelled = false,
}) => {
  const { token } = theme.useToken();

  return (
    <Card
      title={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Space size={8}>
            <ClockCircleOutlined style={{ color: token.colorPrimary }} />
            <span style={{ fontSize: 15, fontWeight: 600 }}>Payment Ledger & History</span>
          </Space>
          <Tag color={balancePaise <= 0 ? "success" : "warning"}>
            {balancePaise <= 0
              ? "All Dues Cleared"
              : `Pending: ₹${(balancePaise / 100).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}`}
          </Tag>
        </div>
      }
      extra={
        !isCancelled &&
        balancePaise > 0 &&
        onRecordPaymentClick && (
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={onRecordPaymentClick}
          >
            Record Payment
          </Button>
        )
      }
      style={{ marginTop: 24, borderRadius: 12 }}
    >
      {payments.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No payments recorded for this invoice yet."
        >
          {!isCancelled && balancePaise > 0 && onRecordPaymentClick && (
            <Button
              type="primary"
              size="middle"
              icon={<PlusOutlined />}
              onClick={onRecordPaymentClick}
            >
              Record Initial Payment
            </Button>
          )}
        </Empty>
      ) : (
        <Timeline
          style={{ marginTop: 12, paddingLeft: 4 }}
          items={payments.map((p, index) => {
            const mode = getPaymentModeConfig(p.payment_mode);
            const isLast = index === payments.length - 1;
            const isSettled = p.balance_snapshot_paise <= 0;

            return {
              color: isSettled ? "green" : token.colorPrimary,
              dot: isSettled ? (
                <CheckCircleOutlined style={{ fontSize: 16, color: token.colorSuccess }} />
              ) : undefined,
              children: (
                <div
                  style={{
                    backgroundColor: token.colorFillAlter,
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <Space size={8} wrap>
                      <Tag color={mode.color} icon={mode.icon} style={{ margin: 0, fontWeight: 600 }}>
                        {mode.label}
                      </Tag>
                      <Text strong style={{ fontSize: 15, color: token.colorSuccess }}>
                        + ₹{(p.amount_paise / 100).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                      {index === 0 && (
                        <Tag color="default" style={{ fontSize: 11 }}>
                          Initial
                        </Tag>
                      )}
                    </Space>

                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(p.payment_date).format("DD MMM YYYY")}
                      {p.created_at && ` • ${dayjs(p.created_at).format("hh:mm A")}`}
                    </Text>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 4,
                    }}
                  >
                    {p.notes ? (
                      <Text type="secondary" style={{ fontSize: 12, fontStyle: "italic" }}>
                        Note: {p.notes}
                      </Text>
                    ) : (
                      <span />
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Balance Snapshot:
                      </Text>
                      <Tag color={isSettled ? "success" : "error"} style={{ margin: 0 }}>
                        {isSettled
                          ? "Fully Paid (₹0.00)"
                          : `₹${(p.balance_snapshot_paise / 100).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })} Due`}
                      </Tag>
                    </div>
                  </div>

                  {isLast && !isSettled && (
                    <div style={{ marginTop: 8, textAlign: "right" }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Current Outstanding Balance:{" "}
                        <span style={{ color: token.colorError, fontWeight: 700 }}>
                          ₹{(balancePaise / 100).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </Text>
                    </div>
                  )}
                </div>
              ),
            };
          })}
        />
      )}
    </Card>
  );
};
