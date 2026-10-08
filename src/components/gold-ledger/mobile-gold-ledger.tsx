import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useList, useGetIdentity, useCreate, useUpdate } from "@refinedev/core";
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
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity<{ id: string }>();
  const userId = identity?.id;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showRecord, setShowRecord] = useState<IGoldLoan | null>(null);
  const [editingLoan, setEditingLoan] = useState<IGoldLoan | null>(null);

  const { mutateAsync: createLoan } = useCreate<IGoldLoan>();
  const { mutateAsync: updateLoan } = useUpdate<IGoldLoan>();

  // Refine Drawer Form for Loan create & edit (retained as backup for edit)
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
    navigate("/gold-ledger/new");
  };

  const handleEdit = (loan: IGoldLoan, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingLoan(loan);
    showFormDrawer(loan.id);
  };

  const handleFinishLoan = async (values: Partial<IGoldLoan>) => {
    try {
      if (editingLoan) {
        await updateLoan({
          resource: "gold_loans",
          id: editingLoan.id,
          values: {
            ...values,
            user_id: userId,
          },
        });
        message.success(`Loan for ${values.customer_name || ""} updated`);
      } else {
        await createLoan({
          resource: "gold_loans",
          values: {
            ...values,
            user_id: userId,
          },
        });
        message.success(`Gold loan for ${values.customer_name || ""} created`);
      }
      setEditingLoan(null);
      closeFormDrawer();
      query?.refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save loan";
      message.error(msg);
    }
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
          user_id: userId,
        },
      });
      message.success(`Loan for ${loan.customer_name} settled and closed!`);
      query?.refetch();
    } catch {
      message.error("Failed to settle loan");
    }
  };

  const handleWhatsAppReminder = (e: React.MouseEvent, loan: IGoldLoan) => {
    e.stopPropagation();
    const cleanNum = loan.contact_no?.replace(/\D/g, "");
    if (!cleanNum) return;
    const msg = encodeURIComponent(
      `Dear ${loan.customer_name}, gentle reminder regarding your gold loan (#${loan.id?.slice(0, 6)}). Outstanding principal: ₹${loan.loan_amount?.toLocaleString("en-IN")}. Regards, Shringar Jewellers.`
    );
    window.open(`https://wa.me/91${cleanNum}?text=${msg}`, "_blank");
  };

  return (
    <div
      data-testid="mobile-gold-ledger"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Header */}
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
            {runningLoans.length} active pledges • {formatRs(totalReceivable)}
          </Text>
        </div>

        <Button
          data-testid="mobile-new-loan-btn"
          type="primary"
          icon={<Plus size={16} />}
          onClick={handleCreateNew}
          style={{
            height: 44,
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

      {/* Aggregate Balance Mini-Card */}
      <div
        style={{
          borderRadius: 14,
          padding: "12px 14px",
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          color: token.colorTextLightSolid,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
        }}
      >
        <div>
          <span style={{ fontSize: 11, opacity: 0.7, display: "block" }}>TOTAL PRINCIPAL</span>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>
            {formatRs(totalPrincipal)}
          </span>
        </div>
        <div>
          <span style={{ fontSize: 11, opacity: 0.7, display: "block" }}>ACCRUED INTEREST</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#facc15", letterSpacing: -0.2 }}>
            {formatRs(totalInterest)}
          </span>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          backgroundColor: token.colorBgLayout,
          padding: 4,
          borderRadius: 12,
          border: `1px solid ${token.colorBorderSecondary}`,
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {[
          { key: "ALL", label: `All (${loans.length})` },
          { key: "ACTIVE", label: `Active (${runningLoans.length})` },
          { key: "OVERDUE", label: "Overdue" },
          { key: "CLOSED", label: "Closed" },
        ].map((tab) => {
          const isSelected = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              style={{
                flexShrink: 0,
                padding: "8px 14px",
                minHeight: 44,
                borderRadius: 8,
                border: "none",
                fontSize: 12,
                fontWeight: isSelected ? 600 : 500,
                backgroundColor: isSelected ? token.colorBgElevated : "transparent",
                color: isSelected ? token.colorPrimary : token.colorTextSecondary,
                boxShadow: isSelected ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <Input
        prefix={<Search size={16} color={token.colorTextPlaceholder} style={{ marginRight: 4 }} />}
        placeholder="Search borrower or collateral..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        allowClear
        inputMode="search"
        style={{
          height: 42,
          borderRadius: 12,
          fontSize: 14,
          backgroundColor: token.colorBgElevated,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      />

      {/* Loans List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                backgroundColor: token.colorBgElevated,
                borderRadius: 14,
                padding: 14,
                border: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <Skeleton active paragraph={{ rows: 2 }} />
            </div>
          ))
        ) : filteredLoans.length === 0 ? (
          <Empty
            description={
              <div style={{ padding: "16px 0" }}>
                <Text type="secondary">No loan records match filter</Text>
                {searchTerm && (
                  <div style={{ marginTop: 8 }}>
                    <Button size="small" onClick={() => setSearchTerm("")}>
                      Clear Search
                    </Button>
                  </div>
                )}
              </div>
            }
          />
        ) : (
          filteredLoans.map((loan) => {
            const isClosed = loan.status === "closed";
            const dueDate = dayjs(loan.loan_date).add(loan.duration_months || 1, "month");
            const isOverdue = !isClosed && dueDate.isBefore(dayjs(), "day");
            const totalDue = Number(loan.loan_amount || 0) + Number(loan.interest_amount || 0);

            return (
              <div
                key={loan.id}
                onClick={() => setShowRecord(loan)}
                style={{
                  backgroundColor: token.colorBgElevated,
                  borderRadius: 14,
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  border: `1px solid ${isOverdue ? "#fecaca" : token.colorBorderSecondary}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  cursor: "pointer",
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
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "1px 8px",
                    }}
                  >
                    {isClosed ? "Settled" : isOverdue ? "Overdue" : "Active"}
                  </Tag>
                </div>

                {/* Card Middle: Borrower Name & Amount */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <Title level={5} style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                      {loan.customer_name}
                    </Title>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                      <Scale size={12} color={token.colorTextSecondary} />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {loan.ornament_details || "Collateral"}
                      </Text>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: token.colorText,
                        display: "block",
                      }}
                    >
                      {formatRs(Number(loan.loan_amount || 0))}
                    </span>
                    <span style={{ fontSize: 11, color: token.colorTextSecondary, whiteSpace: "nowrap" }}>
                      Due: {formatRs(totalDue)}
                    </span>
                  </div>
                </div>

                {/* Card Bottom: Quick Actions */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    paddingTop: 8,
                    borderTop: `1px dashed ${token.colorBorderSecondary}`,
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
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: token.colorPrimaryBg,
                        color: token.colorPrimary,
                        border: `1px solid ${token.colorPrimaryBorder}`,
                        textDecoration: "none",
                      }}
                      aria-label="Call borrower"
                    >
                      <Phone size={14} />
                    </a>
                  )}

                  {/* WhatsApp Reminder Direct Action */}
                  {loan.contact_no && !isClosed && (
                    <button
                      type="button"
                      onClick={(e) => handleWhatsAppReminder(e, loan)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 44,
                        height: 44,
                        borderRadius: 22,
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
                      height: 44,
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
                          height: 44,
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
                        height: 44,
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

      {/* Show Drawer */}
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

      {/* Create / Edit Drawer */}
      <LoanDrawer
        action={editingLoan ? "edit" : "create"}
        drawerProps={drawerProps}
        formProps={formProps}
        initialRecord={editingLoan}
        close={() => {
          setEditingLoan(null);
          closeFormDrawer();
        }}
        onFinish={handleFinishLoan}
      />
    </div>
  );
};
