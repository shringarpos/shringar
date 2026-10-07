import React, { useState, useMemo } from "react";
import { useList, useGetIdentity } from "@refinedev/core";
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
} from "antd";
import {
  Search,
  Plus,
  Eye,
  Edit,
  Phone,
  Coins,
  Calendar,
  AlertTriangle,
  Scale,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { IGoldLoan } from "../../libs/interfaces";
import { useShopCheck } from "../../hooks/use-shop-check";
import { LoanDrawer } from "./loan-drawer";
import { LoanShowDrawer } from "./loan-show-drawer";

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const abbrRs = (paise: number): string => {
  const rs = paise / 100;
  return `₹${rs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

export const MobileGoldLedger: React.FC = () => {
  const { token } = theme.useToken();
  const { shops } = useShopCheck();
  const shopId = shops?.[0]?.id;
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
    id: activeDrawerId,
  } = useDrawerForm<IGoldLoan>({
    resource: "gold_loans",
    action: editingLoan ? "edit" : "create",
    id: editingLoan?.id,
    redirect: false,
    meta: {
      select: "*, customer:customers(id,name,customer_code,phone)",
    },
    onMutationSuccess: () => {
      setEditingLoan(null);
      closeFormDrawer();
    },
  });

  const { query } = useList<IGoldLoan>({
    resource: "gold_loans",
    meta: {
      select: "*, customer:customers(id,name,customer_code,phone)",
    },
    filters: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
    sorters: [
      { field: "loan_date", order: "desc" },
      { field: "created_at", order: "desc" },
    ],
    pagination: { mode: "server", pageSize: 50 },
    queryOptions: { enabled: !!shopId },
  });

  const loans = (query?.data?.data ?? []) as IGoldLoan[];
  const isLoading = query?.isLoading;

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      const matchSearch =
        !searchTerm ||
        loan.loan_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.customer?.phone?.includes(searchTerm);

      const isOverdue =
        loan.status === "ACTIVE" &&
        loan.due_date &&
        dayjs(loan.due_date).isBefore(dayjs(), "day");

      let matchStatus = true;
      if (statusFilter === "ACTIVE") matchStatus = loan.status === "ACTIVE";
      else if (statusFilter === "CLOSED") matchStatus = loan.status === "CLOSED";
      else if (statusFilter === "OVERDUE") matchStatus = !!isOverdue;

      return matchSearch && matchStatus;
    });
  }, [loans, searchTerm, statusFilter]);

  const handleCreateNew = () => {
    setEditingLoan(null);
    formProps.form?.resetFields();
    showFormDrawer();
  };

  const handleEdit = (loan: IGoldLoan) => {
    setEditingLoan(loan);
    showFormDrawer(loan.id);
  };

  return (
    <div
      data-testid="mobile-gold-ledger"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        paddingBottom: 40,
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
            {filteredLoans.length} {filteredLoans.length === 1 ? "loan" : "loans"}
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

      {/* Search Input */}
      <Input
        prefix={<Search size={16} color={token.colorTextPlaceholder} />}
        placeholder="Search loan #, customer, phone..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        allowClear
        style={{
          height: 42,
          borderRadius: 12,
          fontSize: 14,
          background: token.colorBgElevated,
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
        }}
      >
        {[
          { key: "ALL", label: "All Loans", testId: "mobile-loan-filter-all" },
          { key: "ACTIVE", label: "Active" },
          { key: "OVERDUE", label: "Overdue" },
          { key: "CLOSED", label: "Closed" },
        ].map((filter) => (
          <button
            key={filter.key}
            data-testid={filter.testId}
            type="button"
            onClick={() => setStatusFilter(filter.key)}
            style={{
              padding: "6px 12px",
              borderRadius: 14,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              backgroundColor:
                statusFilter === filter.key
                  ? token.colorPrimary
                  : token.colorFillAlter,
              color:
                statusFilter === filter.key ? "#fff" : token.colorTextSecondary,
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Loan Cards List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Skeleton active paragraph={{ rows: 2 }} />
            <Skeleton active paragraph={{ rows: 2 }} />
          </div>
        ) : filteredLoans.length === 0 ? (
          <Empty description="No loans found" style={{ margin: "32px 0" }} />
        ) : (
          filteredLoans.map((loan) => {
            const isClosed = loan.status === "CLOSED";
            const isOverdue =
              loan.status === "ACTIVE" &&
              loan.due_date &&
              dayjs(loan.due_date).isBefore(dayjs(), "day");
            const custName = loan.customer?.name || "Customer";
            const phone = loan.customer?.phone;
            const weight = loan.net_weight_grams || loan.gross_weight_grams || 0;

            return (
              <div
                key={loan.id}
                data-testid="mobile-loan-card"
                style={{
                  backgroundColor: token.colorBgElevated,
                  borderRadius: 14,
                  padding: "12px 14px",
                  border: `1px solid ${token.colorBorderSecondary}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                }}
              >
                {/* Card Top: Loan #, Date, Status */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Text strong style={{ fontSize: 13, color: token.colorPrimary }}>
                      #{loan.loan_number}
                    </Text>
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
                    }}
                  >
                    {isOverdue ? "OVERDUE" : loan.status}
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
                  <div>
                    <Text strong style={{ fontSize: 14, display: "block" }}>
                      {custName}
                    </Text>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
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
                        {weight}g Gold
                      </span>
                      {phone && (
                        <a
                          href={`tel:${phone}`}
                          style={{
                            fontSize: 11,
                            color: token.colorTextSecondary,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            textDecoration: "none",
                          }}
                        >
                          <Phone size={10} />
                          {phone}
                        </a>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <Text strong style={{ fontSize: 16, display: "block" }}>
                      {abbrRs(loan.principal_amount_paise || 0)}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      @ {loan.interest_rate_percent}% / mo
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
                    gap: 8,
                  }}
                >
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<Eye size={13} />}
                    onClick={() => setShowRecord(loan)}
                    style={{
                      flex: 1,
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      height: 32,
                    }}
                  >
                    View Details
                  </Button>

                  <Button
                    size="small"
                    icon={<Edit size={13} />}
                    onClick={() => handleEdit(loan)}
                    style={{
                      borderRadius: 8,
                      fontSize: 12,
                      height: 32,
                    }}
                  >
                    Edit
                  </Button>
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
      />

      {/* Create / Edit Drawer */}
      <LoanDrawer
        drawerProps={drawerProps}
        formProps={formProps}
        editingLoan={editingLoan}
        cloningLoan={null}
        userId={userId}
        onClose={() => {
          setEditingLoan(null);
          closeFormDrawer();
        }}
      />
    </div>
  );
};
