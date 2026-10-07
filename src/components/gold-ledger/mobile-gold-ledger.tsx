import React, { useState, useMemo } from "react";
import { useList, useGetIdentity, useUpdate } from "@refinedev/core";
import { useDrawerForm } from "@refinedev/antd";
import {
  Typography,
  Input,
  Button,
  Tag,
  Skeleton,
  theme,
  Empty,
  message,
  Popconfirm,
} from "antd";
import {
  Search,
  Plus,
  Eye,
  Edit,
  Phone,
  MessageCircle,
  Coins,
  Scale,
  Calendar,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { IGoldLoan } from "../../libs/interfaces";
import { LoanDrawer } from "./loan-drawer";
import { LoanShowDrawer } from "./loan-show-drawer";

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const formatRs = (val: number): string => {
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
};

export const MobileGoldLedger: React.FC = () => {
  const { token } = theme.useToken();
  const { data: identity } = useGetIdentity<{ id: string }>();
  const userId = identity?.id;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showRecord, setShowRecord] = useState<IGoldLoan | null>(null);
  const [editingLoan, setEditingLoan] = useState<IGoldLoan | null>(null);

  // Refine Drawer Form for Loan create & edit
  const {
    drawerProps,
    formProps,
    show: showFormDrawer,
    close: closeFormDrawer,
  } = useDrawerForm<IGoldLoan>({
    resource: "gold_loans",
    action: editingLoan ? "edit" : "create",
    id: editingLoan?.id,
    redirect: false,
    onMutationSuccess: () => {
      setEditingLoan(null);
      closeFormDrawer();
    },
  });

  const { query } = useList<IGoldLoan>({
    resource: "gold_loans",
    filters: userId ? [{ field: "user_id", operator: "eq", value: userId }] : [],
    sorters: [
      { field: "loan_date", order: "desc" },
      { field: "created_at", order: "desc" },
    ],
    pagination: { mode: "server", pageSize: 50 },
    queryOptions: { enabled: !!userId },
  });

  const { mutateAsync: updateLoan } = useUpdate<IGoldLoan>();

  const loans = (query?.data?.data ?? []) as IGoldLoan[];
  const isLoading = query?.isLoading;

  // Key aggregate financial metrics
  const runningLoans = useMemo(() => loans.filter((l) => l.status === "running"), [loans]);
  const totalPrincipal = useMemo(
    () => runningLoans.reduce((sum, l) => sum + Number(l.loan_amount || 0), 0),
    [runningLoans]
  );
  const totalInterest = useMemo(
    () => runningLoans.reduce((sum, l) => sum + Number(l.interest_amount || 0), 0),
    [runningLoans]
  );
  const totalReceivable = totalPrincipal + totalInterest;

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      const matchSearch =
        !searchTerm ||
        loan.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.contact_no?.includes(searchTerm) ||
        loan.ornament_details?.toLowerCase().includes(searchTerm.toLowerCase());

      const dueDate = dayjs(loan.loan_date).add(loan.duration_months || 1, "month");
      const isOverdue =
        loan.status === "running" && dueDate.isBefore(dayjs(), "day");

      let matchStatus = true;
      if (statusFilter === "ACTIVE") matchStatus = loan.status === "running";
      else if (statusFilter === "CLOSED") matchStatus = loan.status === "closed";
      else if (statusFilter === "OVERDUE") matchStatus = !!isOverdue;

      return matchSearch && matchStatus;
    });
  }, [loans, searchTerm, statusFilter]);

  const handleCreateNew = () => {
    setEditingLoan(null);
    formProps.form?.resetFields();
    showFormDrawer();
  };

  const handleEdit = (loan: IGoldLoan, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingLoan(loan);
    showFormDrawer(loan.id);
  };

  const handleSettleLoan = async (loan: IGoldLoan, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await updateLoan({
        resource: "gold_loans",
        id: loan.id,
        values: {
          status: "closed",
          closure_date: dayjs().format("YYYY-MM-DD"),
        },
      });
      message.success(`Loan for ${loan.customer_name} marked as closed & settled!`);
      if (showRecord?.id === loan.id) {
        setShowRecord(null);
      }
      query.refetch();
    } catch (err: any) {
      message.error(err.message || "Failed to settle loan.");
    }
  };

  const handleWhatsAppReminder = (e: React.MouseEvent, loan: IGoldLoan) => {
    e.stopPropagation();
    const dueDate = dayjs(loan.loan_date).add(loan.duration_months || 1, "month").format("D MMM YYYY");
    const msg = `Hello ${loan.customer_name}, this is a gentle reminder regarding your pledged gold loan with Shringar Jewellers. Principal: ${formatRs(loan.loan_amount)}, Interest: ${formatRs(loan.interest_amount)}. Due Date: ${dueDate}.`;
    const digits = loan.contact_no?.replace(/\D/g, "") || "";
    const waNumber = digits.length === 10 ? `91${digits}` : digits;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div
      data-testid="mobile-gold-ledger"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        paddingBottom: "calc(88px + env(safe-area-inset-bottom, 16px))",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "2px 0",
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            Gold Loan Ledger
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {filteredLoans.length} {filteredLoans.length === 1 ? "entry" : "entries"} active
          </Text>
        </div>

        <Button
          data-testid="mobile-new-loan-btn"
          type="primary"
          icon={<Plus size={16} />}
          onClick={handleCreateNew}
          style={{
            height: 38,
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          New Loan
        </Button>
      </div>

      {/* 3-Column Financial Summary Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          backgroundColor: token.colorBgElevated,
          borderRadius: 14,
          padding: "12px 10px",
          border: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div>
          <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
            Principal
          </Text>
          <Text strong style={{ fontSize: 14, display: "block", marginTop: 2, color: token.colorText }}>
            {formatRs(totalPrincipal)}
          </Text>
          <Text type="secondary" style={{ fontSize: 10 }}>
            {runningLoans.length} running
          </Text>
        </div>

        <div style={{ borderLeft: `1px solid ${token.colorBorderSecondary}`, paddingLeft: 8 }}>
          <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
            Interest
          </Text>
          <Text strong style={{ fontSize: 14, display: "block", marginTop: 2, color: token.colorWarning }}>
            {formatRs(totalInterest)}
          </Text>
          <Text type="secondary" style={{ fontSize: 10 }}>
            Accrued
          </Text>
        </div>

        <div style={{ borderLeft: `1px solid ${token.colorBorderSecondary}`, paddingLeft: 8 }}>
          <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
            Total Due
          </Text>
          <Text strong style={{ fontSize: 14, display: "block", marginTop: 2, color: token.colorPrimary }}>
            {formatRs(totalReceivable)}
          </Text>
          <Text type="secondary" style={{ fontSize: 10 }}>
            Settlement
          </Text>
        </div>
      </div>

      {/* Search Input */}
      <Input
        prefix={<Search size={16} color={token.colorTextPlaceholder} />}
        placeholder="Search customer, phone or ornament..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        allowClear
        inputMode="search"
        style={{
          height: 44,
          borderRadius: 12,
          fontSize: 14,
          background: token.colorBgElevated,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      />

      {/* Status Filter Chips */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 4,
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {[
          { key: "ALL", label: "All Loans", testId: "mobile-loan-filter-all" },
          { key: "ACTIVE", label: "Running" },
          { key: "OVERDUE", label: "Overdue" },
          { key: "CLOSED", label: "Closed" },
        ].map((filter) => {
          const isSelected = statusFilter === filter.key;
          return (
            <button
              key={filter.key}
              data-testid={filter.testId}
              type="button"
              onClick={() => setStatusFilter(filter.key)}
              style={{
                padding: "8px 16px",
                minHeight: 38,
                borderRadius: 20,
                border: isSelected ? "none" : `1px solid ${token.colorBorderSecondary}`,
                fontSize: 12,
                fontWeight: isSelected ? 600 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                backgroundColor: isSelected ? token.colorPrimary : token.colorBgElevated,
                color: isSelected ? "#fff" : token.colorTextSecondary,
                boxShadow: isSelected ? "0 2px 6px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Loan Cards List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Skeleton active paragraph={{ rows: 2 }} />
            <Skeleton active paragraph={{ rows: 2 }} />
          </div>
        ) : filteredLoans.length === 0 ? (
          <Empty description="No gold loans found" style={{ margin: "32px 0" }} />
        ) : (
          filteredLoans.map((loan) => {
            const isClosed = loan.status === "closed";
            const dueDate = dayjs(loan.loan_date).add(loan.duration_months || 1, "month");
            const isOverdue = !isClosed && dueDate.isBefore(dayjs(), "day");
            const digits = loan.contact_no?.replace(/\D/g, "") || "";
            const waNumber = digits.length === 10 ? `91${digits}` : digits;

            return (
              <div
                key={loan.id}
                data-testid="mobile-loan-card"
                role="button"
                tabIndex={0}
                onClick={() => setShowRecord(loan)}
                style={{
                  backgroundColor: token.colorBgElevated,
                  borderRadius: 14,
                  padding: "12px 14px",
                  border: `1px solid ${token.colorBorderSecondary}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                  cursor: "pointer",
                  transition: "transform 0.1s ease",
                  WebkitTapHighlightColor: "transparent",
                  opacity: isClosed ? 0.75 : 1,
                }}
              >
                {/* Card Top: Purity, Date, Status */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Tag
                      color="gold"
                      style={{
                        margin: 0,
                        borderRadius: 6,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                      }}
                    >
                      {loan.metal_type || "Gold"} {loan.purity || "22K"}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      • {dayjs(loan.loan_date).format("D MMM YYYY")}
                    </Text>
                  </div>

                  <Tag
                    color={
                      isClosed
                        ? "default"
                        : isOverdue
                        ? "error"
                        : "processing"
                    }
                    style={{
                      margin: 0,
                      borderRadius: 8,
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "1px 6px",
                      border: "none",
                    }}
                  >
                    {isClosed ? "CLOSED" : isOverdue ? "OVERDUE" : "RUNNING"}
                  </Tag>
                </div>

                {/* Card Middle: Customer info, Pledged gold weight & Principal */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                    <Text strong style={{ fontSize: 14, display: "block" }} ellipsis>
                      {loan.customer_name}
                    </Text>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                      <span
                        style={{
                          fontSize: 11,
                          color: "#d97706",
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                          fontWeight: 600,
                        }}
                      >
                        <Scale size={11} />
                        {loan.ornament_details || "Gold Ornaments"}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <Text strong style={{ fontSize: 16, display: "block", color: token.colorPrimary }}>
                      {formatRs(loan.loan_amount)}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      @ {loan.interest_rate}% / mo
                    </Text>
                  </div>
                </div>

                {/* Card Bottom: Actions */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTop: `1px solid ${token.colorFillAlter}`,
                    paddingTop: 8,
                    gap: 6,
                  }}
                >
                  {/* Phone Dial Trigger */}
                  {loan.contact_no && (
                    <a
                      href={`tel:${loan.contact_no}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: token.colorPrimaryBg,
                        color: token.colorPrimary,
                        border: `1px solid ${token.colorPrimaryBorder}`,
                        textDecoration: "none",
                      }}
                      aria-label="Call customer"
                    >
                      <Phone size={14} />
                    </a>
                  )}

                  {/* WhatsApp Reminder Trigger */}
                  {loan.contact_no && !isClosed && (
                    <button
                      type="button"
                      onClick={(e) => handleWhatsAppReminder(e, loan)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: "#f0fdf4",
                        color: "#16a34a",
                        border: "1px solid #bbf7d0",
                        cursor: "pointer",
                      }}
                      aria-label="WhatsApp reminder"
                    >
                      <MessageCircle size={14} />
                    </button>
                  )}

                  {/* View Details CTA */}
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<Eye size={13} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRecord(loan);
                    }}
                    style={{
                      flex: 1,
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      height: 34,
                    }}
                  >
                    Details
                  </Button>

                  {/* 1-Tap Settle Loan Action */}
                  {!isClosed ? (
                    <Popconfirm
                      title="Settle this loan?"
                      description="Mark loan as closed and pledged gold returned to client."
                      onConfirm={(e) => handleSettleLoan(loan, e)}
                      onCancel={(e) => e?.stopPropagation()}
                      okText="Yes, Settle"
                      cancelText="No"
                    >
                      <Button
                        size="small"
                        icon={<CheckCircle2 size={13} />}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          borderRadius: 8,
                          fontSize: 12,
                          height: 34,
                          color: token.colorSuccess,
                          borderColor: token.colorSuccess,
                        }}
                      >
                        Settle
                      </Button>
                    </Popconfirm>
                  ) : (
                    <Button
                      size="small"
                      icon={<Edit size={13} />}
                      onClick={(e) => handleEdit(loan, e)}
                      style={{
                        borderRadius: 8,
                        fontSize: 12,
                        height: 34,
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Show Drawer (Proper props passed: record, open, onClose, onEdit, onCloseLoan) */}
      <LoanShowDrawer
        open={!!showRecord}
        record={showRecord}
        onClose={() => setShowRecord(null)}
        onEdit={() => {
          const rec = showRecord;
          setShowRecord(null);
          if (rec) handleEdit(rec);
        }}
        onCloseLoan={(loan) => handleSettleLoan(loan)}
      />

      {/* Create / Edit Drawer (Proper props: action, drawerProps, formProps, onFinish, close) */}
      <LoanDrawer
        action={editingLoan ? "edit" : "create"}
        drawerProps={drawerProps}
        formProps={formProps}
        initialRecord={editingLoan}
        close={() => {
          setEditingLoan(null);
          closeFormDrawer();
        }}
        onFinish={formProps.onFinish as any}
      />
    </div>
  );
};
