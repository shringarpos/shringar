import {
  ExportButton,
  List as RefineList,
  getDefaultSortOrder,
  useTable,
} from "@refinedev/antd";
import { useExport, useGetIdentity } from "@refinedev/core";
import type { HttpError } from "@refinedev/core";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  EyeOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { DownloadInvoiceButton } from "../../components/invoices/download-invoice-button";
import type { FilterDropdownProps } from "antd/es/table/interface";
import {
  App,
  Button,
  Card,
  Col,
  Input,
  Radio,
  Row,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { CancelInvoiceModal } from "../../components/invoices/cancel-invoice-modal";
import type { ICustomer, IInvoice } from "../../../src/libs/interfaces";
import { useShopCheck } from "../../../src/hooks/use-shop-check";
import { supabaseClient } from "../../../src/providers/supabase-client";

dayjs.extend(relativeTime);

const { Text } = Typography;

interface IInvoiceRow extends IInvoice {
  customer?: Pick<ICustomer, "id" | "name" | "customer_code" | "phone"> | null;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const p2Rs = (p: number) => (p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });

export default function Invoices() {
  return <InvoiceList />;
}

// ─── main component ───────────────────────────────────────────────────────────

const InvoiceList: React.FC = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { notification } = App.useApp();
  const { shops } = useShopCheck();
  const shopId = shops?.[0]?.id;

  const { data: identity } = useGetIdentity<{ id: string }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (identity as any)?.id as string | undefined;

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "cancelled">("all");

  // Cancel modal state
  const [cancelTarget, setCancelTarget] = useState<IInvoiceRow | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // ── useTable ──────────────────────────────────────────────────────────────

  // Detect ornament filter from URL so we can inner-join invoice_items
  const hasOrnamentFilter = search.includes("invoice_items.ornament_id");

  const { tableProps, sorters, filters, setFilters, tableQuery } = useTable<IInvoiceRow, HttpError>({
    resource: "invoices",
    meta: {
      select: hasOrnamentFilter
        ? "*, customer:customers(id,name,customer_code,phone), invoice_items!inner(ornament_id)"
        : "*, customer:customers(id,name,customer_code,phone)",
    },
    filters: {
      permanent: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
    },
    sorters: {
      initial: [{ field: "invoice_date", order: "desc" }],
    },
    pagination: { mode: "server", pageSize: 20 },
    syncWithLocation: true,
    queryOptions: { enabled: !!shopId },
  });

  // All records (for stats cards) — derived from current page data
  const pageData = (tableQuery?.data?.data ?? []) as IInvoiceRow[];
  const total = tableQuery?.data?.total ?? 0;

  // ── Export ─────────────────────────────────────────────────────────────────

  const { triggerExport, isLoading: exportLoading } = useExport<IInvoiceRow>({
    resource: "invoices",
    meta: { select: "*, customer:customers(id,name,customer_code,phone)" },
    filters: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
    sorters: [{ field: "invoice_date", order: "desc" }],
    mapData: (item) => ({
      "Invoice #": item.invoice_number,
      "Date": dayjs(item.invoice_date).format("D MMM YYYY"),
      "Customer": (item as IInvoiceRow).customer?.name ?? "",
      "Customer Code": (item as IInvoiceRow).customer?.customer_code ?? "",
      "Metal Subtotal (₹)": p2Rs(item.subtotal_amount_paise),
      "Making Charges (₹)": p2Rs(item.total_making_charges_paise),
      "Discount (₹)": p2Rs(item.discount_amount_paise),
      "Total (₹)": p2Rs(item.total_amount_paise),
      "Status": item.is_cancelled ? "Cancelled" : "Active",
      "Cancelled Reason": item.cancelled_reason ?? "",
    }),
  });

  // ── Toolbar filter helpers ─────────────────────────────────────────────────

  const applyFilters = (
    text: string,
    status: "all" | "active" | "cancelled",
  ) => {
    const next = [];
    if (text.trim()) {
      next.push({ field: "invoice_number", operator: "contains" as const, value: text.trim() });
      next.push({ field: "customers.name", operator: "contains" as const, value: text.trim() });
    }
    if (status !== "all")
      next.push({ field: "is_cancelled", operator: "eq" as const, value: status === "cancelled" });
    setFilters(next, "replace");
  };

  // Generic column-level filter dropdown (mirrors ornaments page)
  const makeColumnFilter =
    (field: string, placeholder: string) =>
    ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) =>
      (
        <div style={{ padding: 8, minWidth: 220 }}>
          <Input
            autoFocus
            placeholder={placeholder}
            value={selectedKeys[0] as string}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => {
              setFilters(
                [{ field, operator: "contains" as const, value: selectedKeys[0] || undefined }],
                "merge",
              );
              confirm();
            }}
            style={{ marginBottom: 8, display: "block" }}
          />
          <Space>
            <Button
              type="primary"
              size="small"
              onClick={() => {
                setFilters(
                  [{ field, operator: "contains" as const, value: selectedKeys[0] || undefined }],
                  "merge",
                );
                confirm();
              }}
            >
              Filter
            </Button>
            <Button
              size="small"
              onClick={() => {
                clearFilters?.();
                setFilters([{ field, operator: "contains" as const, value: undefined }], "merge");
                confirm();
              }}
            >
              Reset
            </Button>
          </Space>
        </div>
      );

  // ── Cancel handler ────────────────────────────────────────────────────────

  const handleCancelConfirm = async (reason: string) => {
    if (!cancelTarget || !userId) return;
    setCancelling(true);
    try {
      const { error: invErr } = await supabaseClient
        .from("invoices")
        .update({
          is_cancelled: true,
          cancelled_at: new Date().toISOString(),
          cancelled_by: userId,
          cancelled_reason: reason,
          updated_by: userId,
        })
        .eq("id", cancelTarget.id);
      if (invErr) throw invErr;

      const { data: itemsData } = await supabaseClient
        .from("invoice_items")
        .select("ornament_id, quantity")
        .eq("invoice_id", cancelTarget.id);

      if (itemsData) {
        for (const item of itemsData) {
          const { data: ornData } = await supabaseClient
            .from("ornaments")
            .select("quantity")
            .eq("id", item.ornament_id)
            .single();
          if (ornData) {
            await supabaseClient
              .from("ornaments")
              .update({ quantity: ornData.quantity + item.quantity })
              .eq("id", item.ornament_id);
          }
        }
      }

      notification.success({ message: `Invoice ${cancelTarget.invoice_number} cancelled` });
      tableQuery?.refetch?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      notification.error({ message: "Failed to cancel invoice", description: msg });
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  // ── Stats (from current page; shown above table) ──────────────────────────

  const activeCount = pageData.filter((i) => !i.is_cancelled).length;
  const cancelledCount = pageData.filter((i) => i.is_cancelled).length;
  const pageRevenue =
    pageData.filter((i) => !i.is_cancelled).reduce((s, i) => s + i.total_amount_paise, 0) / 100;

  const hasActiveFilters =
    searchText !== "" ||
    statusFilter !== "all" ||
    filters.some((f) => "field" in f && f.field !== "shop_id" && f.value != null);

  return (
    <>
      {/* Stats row */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Text type="secondary" style={{ fontSize: 12 }}>Total (this page)</Text>
            <br />
            <Text strong style={{ fontSize: 20 }}>
              {pageData.length}
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>/ {total}</Text>
            </Text>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Text type="secondary" style={{ fontSize: 12 }}>Active</Text>
            <br />
            <Text strong style={{ fontSize: 20, color: "#389e0d" }}>{activeCount}</Text>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Text type="secondary" style={{ fontSize: 12 }}>Cancelled</Text>
            <br />
            <Text strong style={{ fontSize: 20, color: "#ff4d4f" }}>{cancelledCount}</Text>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Text type="secondary" style={{ fontSize: 12 }}>Revenue (page)</Text>
            <br />
            <Text strong style={{ fontSize: 20, color: "#1677ff" }}>
              ₹{pageRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </Text>
          </Card>
        </Col>
      </Row>

      <RefineList
        headerButtons={({ defaultButtons }) => (
          <>
            <ExportButton onClick={triggerExport} loading={exportLoading} />
            {defaultButtons}
          </>
        )}
        createButtonProps={{
          icon: <PlusOutlined />,
          onClick: () => navigate("/create-sale"),
          children: "New Invoice",
        }}
      >
        {/* ── Toolbar ───────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <Space wrap>
            <Input.Search
              prefix={<SearchOutlined />}
              placeholder="Search invoice # or customer..."
              allowClear
              style={{ width: 280 }}
              value={searchText}
              onChange={(e) => {
                const val = e.target.value;
                setSearchText(val);
                if (!val) applyFilters("", statusFilter);
              }}
              onSearch={(val) => {
                setSearchText(val);
                applyFilters(val, statusFilter);
              }}
            />
            <Radio.Group
              value={statusFilter}
              onChange={(e) => {
                const val = e.target.value as "all" | "active" | "cancelled";
                setStatusFilter(val);
                applyFilters(searchText, val);
              }}
              optionType="button"
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="all">All</Radio.Button>
              <Radio.Button value="active">Active</Radio.Button>
              <Radio.Button value="cancelled">Cancelled</Radio.Button>
            </Radio.Group>
          </Space>

          <Tooltip title="Reset all filters">
            <Button
              icon={<ReloadOutlined />}
              size="small"
              type={hasActiveFilters ? "primary" : "default"}
              onClick={() => {
                setSearchText("");
                setStatusFilter("all");
                setFilters([], "replace");
              }}
            >
              Reset Filters
            </Button>
          </Tooltip>
        </div>

        <Table<IInvoiceRow>
          {...tableProps}
          rowKey="id"
          size="small"
          scroll={{ x: 900 }}
          pagination={{
            ...tableProps.pagination,
            pageSizeOptions: ["10", "20", "50"],
            showSizeChanger: true,
            showTotal: (t) => `${t} invoice${t !== 1 ? "s" : ""}`,
          }}
          onRow={(record) => ({
            style: { cursor: "pointer", ...(record.is_cancelled ? { opacity: 0.6 } : {}) },
            onClick: () => navigate(`/invoices/${record.id}`),
          })}
        >
          {/* Invoice # + Date */}
          <Table.Column<IInvoiceRow>
            key="invoice_number"
            dataIndex="invoice_number"
            title="Invoice"
            sorter
            defaultSortOrder={getDefaultSortOrder("invoice_number", sorters)}
            filterDropdown={makeColumnFilter("invoice_number", "Filter by invoice #...")}
            filterIcon={(active: boolean) => (
              <FilterOutlined style={{ color: active ? "#1677ff" : undefined }} />
            )}
            render={(num: string, record: IInvoiceRow) => (
              <Space direction="vertical" size={0}>
                <Text strong style={{ color: "#1677ff" }}>{num}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(record.invoice_date).format("D MMM YYYY")}
                </Text>
              </Space>
            )}
          />

          {/* Customer */}
          <Table.Column<IInvoiceRow>
            key="customer"
            dataIndex="customer"
            title="Customer"
            sorter
            defaultSortOrder={getDefaultSortOrder("customer", sorters)}
            filterDropdown={makeColumnFilter("customers.name", "Filter by customer name...")}
            filterIcon={(active: boolean) => (
              <FilterOutlined style={{ color: active ? "#1677ff" : undefined }} />
            )}
            render={(customer: IInvoiceRow["customer"]) =>
              customer ? (
                <Space direction="vertical" size={0}>
                  <Text strong>{customer.name}</Text>
                  <Tag
                    color="blue"
                    style={{
                      fontFamily: "monospace",
                      fontSize: 10,
                      padding: "0 5px",
                      lineHeight: "18px",
                    }}
                  >
                    {customer.customer_code}
                  </Tag>
                </Space>
              ) : (
                <Text type="secondary">—</Text>
              )
            }
          />

          {/* Metal Subtotal */}
          <Table.Column<IInvoiceRow>
            key="subtotal_amount_paise"
            dataIndex="subtotal_amount_paise"
            title="Metal Subtotal"
            align="right"
            sorter
            defaultSortOrder={getDefaultSortOrder("subtotal_amount_paise", sorters)}
            render={(v: number) => <Text>₹{p2Rs(v)}</Text>}
          />

          {/* Making */}
          <Table.Column<IInvoiceRow>
            key="total_making_charges_paise"
            dataIndex="total_making_charges_paise"
            title="Making Charges"
            align="right"
            sorter
            defaultSortOrder={getDefaultSortOrder("total_making_charges_paise", sorters)}
            render={(v: number) => <Text>₹{p2Rs(v)}</Text>}
          />

          {/* Discount */}
          <Table.Column<IInvoiceRow>
            key="discount_amount_paise"
            dataIndex="discount_amount_paise"
            title="Discount"
            align="right"
            render={(v: number) =>
              v > 0 ? (
                <Text type="danger">−₹{p2Rs(v)}</Text>
              ) : (
                <Text type="secondary">—</Text>
              )
            }
          />

          {/* Total */}
          <Table.Column<IInvoiceRow>
            key="total_amount_paise"
            dataIndex="total_amount_paise"
            title="Total"
            align="right"
            sorter
            defaultSortOrder={getDefaultSortOrder("total_amount_paise", sorters)}
            render={(v: number) => (
              <Text strong style={{ color: "#389e0d" }}>
                ₹{p2Rs(v)}
              </Text>
            )}
          />

          {/* Status */}
          <Table.Column<IInvoiceRow>
            key="is_cancelled"
            dataIndex="is_cancelled"
            title="Status"
            render={(_: unknown, record: IInvoiceRow) =>
              record.is_cancelled ? (
                <Tag icon={<CloseCircleOutlined />} color="error">Cancelled</Tag>
              ) : (
                <Tag icon={<CheckCircleOutlined />} color="success">Active</Tag>
              )
            }
          />

          {/* Actions */}
          <Table.Column<IInvoiceRow>
            key="actions"
            title="Actions"
            width={120}
            fixed="right"
            render={(_: unknown, record: IInvoiceRow) => (
              <Space size={4} onClick={(e) => e.stopPropagation()}>
                <Tooltip title="View">
                  <Button
                    type="text"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/invoices/${record.id}`)}
                  />
                </Tooltip>
                <DownloadInvoiceButton
                  invoiceId={record.id}
                  iconOnly
                  buttonType="text"
                  size="small"
                />
                <Tooltip title="Clone">
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => navigate(`/create-sale?clone=${record.id}`)}
                  />
                </Tooltip>
                {!record.is_cancelled && (
                  <Tooltip title="Cancel Invoice">
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<CloseCircleOutlined />}
                      onClick={() => setCancelTarget(record)}
                    />
                  </Tooltip>
                )}
              </Space>
            )}
          />
        </Table>
      </RefineList>

      <CancelInvoiceModal
        open={!!cancelTarget}
        invoiceNumber={cancelTarget?.invoice_number ?? ""}
        loading={cancelling}
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelTarget(null)}
      />
    </>
  );
};
