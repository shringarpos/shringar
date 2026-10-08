import React, { useState } from "react";
import {
    ExportButton,
    List as RefineList,
    getDefaultSortOrder,
    useDrawerForm,
    useTable,
} from "@refinedev/antd";
import {
    useDelete,
    useExport,
    useGetIdentity,
    useUpdate,
} from "@refinedev/core";
import type { HttpError } from "@refinedev/core";
import {
    CheckCircleOutlined,
    CopyOutlined,
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    FilterOutlined,
    PlusOutlined,
    ReloadOutlined,
} from "@ant-design/icons";
import type { FilterDropdownProps } from "antd/es/table/interface";
import {
    App,
    Button,
    Input,
    Popconfirm,
    Radio,
    Select,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
    theme,
    Grid,
} from "antd";
import dayjs from "dayjs";
import { MobileGoldLedger } from "../../components/gold-ledger/mobile-gold-ledger";
import { LoanDrawer } from "../../components/gold-ledger/loan-drawer";
import { LoanShowDrawer } from "../../components/gold-ledger/loan-show-drawer";
import { LoanStatsCards } from "../../components/gold-ledger/loan-stats-cards";
import type { IGoldLoan } from "../../libs/interfaces";

export default function GoldLedger() {
    const screens = Grid.useBreakpoint();
    if (!screens.md) {
        return <MobileGoldLedger />;
    }
    return <DesktopGoldLedger />;
}

function DesktopGoldLedger() {
    const { token } = theme.useToken();
    const { notification } = App.useApp();
    const { data: identity } = useGetIdentity<{ id: string }>();
    const userId = identity?.id;

    // Show drawer state
    const [showRecord, setShowRecord] = useState<IGoldLoan | null>(null);

    // Toolbar filters state
    const [searchText, setSearchText] = useState("");
    const [metalFilter, setMetalFilter] = useState<string>("all");
    const [purityFilter, setPurityFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const { tableProps, sorters, filters, setFilters, tableQuery } = useTable<IGoldLoan, HttpError>({
        resource: "gold_loans",
        filters: {
            permanent: userId
                ? [{ field: "user_id", operator: "eq", value: userId }]
                : [],
        },
        sorters: {
            initial: [{ field: "loan_date", order: "desc" }],
        },
        syncWithLocation: true,
        queryOptions: { enabled: !!userId },
    });

    const allLoans = (tableQuery?.data?.data || []) as IGoldLoan[];
    const isLoansLoading = tableQuery?.isLoading;

    const { mutate: deleteLoan } = useDelete();
    const { mutate: updateLoan } = useUpdate<IGoldLoan>();

    // Slide-over Drawer Forms (replacing heavy modals to keep UX smooth and within screen bounds)
    const {
        drawerProps: createDrawerProps,
        formProps: createFormProps,
        show: showCreate,
        close: closeCreate,
    } = useDrawerForm<IGoldLoan>({
        action: "create",
        resource: "gold_loans",
        warnWhenUnsavedChanges: true,
        syncWithLocation: { key: "create-loan", syncId: false },
    });

    const {
        drawerProps: editDrawerProps,
        formProps: editFormProps,
        show: showEdit,
        close: closeEdit,
    } = useDrawerForm<IGoldLoan>({
        action: "edit",
        resource: "gold_loans",
        warnWhenUnsavedChanges: true,
        syncWithLocation: { key: "edit-loan", syncId: true },
    });

    const {
        drawerProps: cloneDrawerProps,
        formProps: cloneFormProps,
        show: showClone,
        close: closeClone,
    } = useDrawerForm<IGoldLoan>({
        action: "clone",
        resource: "gold_loans",
        warnWhenUnsavedChanges: true,
        syncWithLocation: { key: "clone-loan", syncId: true },
    });

    // Export CSV
    const { triggerExport, isLoading: exportLoading } = useExport<IGoldLoan>({
        resource: "gold_loans",
        filters: userId ? [{ field: "user_id", operator: "eq", value: userId }] : [],
        mapData: (item) => ({
            "Customer Name": item.customer_name,
            "Contact No": item.contact_no,
            "Address": item.address,
            "Nominee": item.nominee,
            "Metal Type": item.metal_type,
            "Purity": item.purity,
            "Ornament Details": item.ornament_details,
            "Loan Date": item.loan_date,
            "Closure Date": item.closure_date || "—",
            "Loan Amount (₹)": item.loan_amount,
            "Duration (Months)": item.duration_months,
            "Interest Rate (%)": item.interest_rate,
            "Interest Amount (₹)": item.interest_amount,
            "Total Amount (₹)": item.total_amount,
            "Status": item.status,
            "Created At": new Date(item.created_at).toLocaleDateString("en-IN"),
        }),
    });

    // Multi-criteria filter applicator
    const applyCombinedFilters = (
        search: string,
        metal: string,
        purity: string,
        status: string
    ) => {
        const next = [];
        if (search.trim()) {
            next.push({ field: "customer_name", operator: "contains" as const, value: search.trim() });
        }
        if (metal !== "all") {
            next.push({ field: "metal_type", operator: "eq" as const, value: metal });
        }
        if (purity !== "all") {
            next.push({ field: "purity", operator: "eq" as const, value: purity });
        }
        if (status !== "all") {
            next.push({ field: "status", operator: "eq" as const, value: status });
        }
        setFilters(next, "replace");
    };

    const handleCreateFinish = (values: Partial<IGoldLoan>) => {
        return createFormProps.onFinish?.({
            ...values,
            user_id: userId,
        });
    };

    const handleEditFinish = (values: Partial<IGoldLoan>) => {
        return editFormProps.onFinish?.({
            ...values,
            user_id: userId,
        });
    };

    const handleCloneFinish = (values: Partial<IGoldLoan>) => {
        return cloneFormProps.onFinish?.({
            ...values,
            user_id: userId,
        });
    };

    // Quick Settle & Close Loan
    const handleCloseLoan = (record: IGoldLoan) => {
        updateLoan(
            {
                resource: "gold_loans",
                id: record.id,
                values: {
                    status: "closed",
                    closure_date: dayjs().format("YYYY-MM-DD"),
                },
                successNotification: () => ({
                    message: `Loan for ${record.customer_name} marked as closed`,
                    type: "success",
                }),
            },
            {
                onError: (err) => {
                    notification.error({
                        message: "Failed to close loan",
                        description: err.message,
                    });
                },
            }
        );
    };

    // Delete Loan
    const handleDeleteLoan = (record: IGoldLoan) => {
        deleteLoan({
            resource: "gold_loans",
            id: record.id,
            successNotification: () => ({
                message: "Loan record deleted successfully",
                type: "success",
            }),
        });
    };

    // Generic Column Filter with theme tokens
    const makeColumnFilter = (field: string, placeholder: string) =>
        ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
            <div style={{ padding: 10, minWidth: 200, background: token.colorBgElevated, borderRadius: token.borderRadius }}>
                <Input
                    autoFocus
                    placeholder={placeholder}
                    value={selectedKeys[0] as string}
                    onChange={(e) =>
                        setSelectedKeys(e.target.value ? [e.target.value] : [])
                    }
                    onPressEnter={() => {
                        setFilters(
                            [{ field, operator: "contains" as const, value: selectedKeys[0] || undefined }],
                            "merge"
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
                                "merge"
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
                            setFilters(
                                [{ field, operator: "contains" as const, value: undefined }],
                                "merge"
                            );
                            confirm();
                        }}
                    >
                        Reset
                    </Button>
                </Space>
            </div>
        );

    return (
        <>
            <RefineList
                title="Gold Ledger"
                headerButtons={({ defaultButtons }) => (
                    <>
                        {defaultButtons}
                        <ExportButton onClick={triggerExport} loading={exportLoading} />
                    </>
                )}
                createButtonProps={{
                    onClick: () => showCreate(),
                    children: "Add New Loan",
                    icon: <PlusOutlined />,
                }}
            >
                {/* Stats Summary Cards (Theme Aware) */}
                <LoanStatsCards loans={allLoans} loading={isLoansLoading} />

                {/* Filter Toolbar (Theme Aware) */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 16,
                        flexWrap: "wrap",
                        gap: 12,
                        background: token.colorBgContainer,
                        padding: "12px 16px",
                        borderRadius: token.borderRadiusLG,
                        border: `1px solid ${token.colorBorderSecondary}`,
                    }}
                >
                    <Space wrap size="middle">
                        <Input.Search
                            placeholder="Search borrower name..."
                            allowClear
                            style={{ width: 220 }}
                            value={searchText}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSearchText(val);
                                if (!val) applyCombinedFilters("", metalFilter, purityFilter, statusFilter);
                            }}
                            onSearch={(val) => {
                                setSearchText(val);
                                applyCombinedFilters(val, metalFilter, purityFilter, statusFilter);
                            }}
                        />

                        <Select
                            value={metalFilter}
                            style={{ width: 120 }}
                            onChange={(val) => {
                                setMetalFilter(val);
                                applyCombinedFilters(searchText, val, purityFilter, statusFilter);
                            }}
                            options={[
                                { label: "All Metals", value: "all" },
                                { label: "Gold", value: "Gold" },
                                { label: "Silver", value: "Silver" },
                            ]}
                        />

                        <Select
                            value={purityFilter}
                            style={{ width: 120 }}
                            onChange={(val) => {
                                setPurityFilter(val);
                                applyCombinedFilters(searchText, metalFilter, val, statusFilter);
                            }}
                            options={[
                                { label: "All Purity", value: "all" },
                                { label: "24K", value: "24K" },
                                { label: "22K", value: "22K" },
                                { label: "18K", value: "18K" },
                                { label: "99.9%", value: "99.9%" },
                                { label: "92.5%", value: "92.5%" },
                            ]}
                        />

                        <Radio.Group
                            value={statusFilter}
                            onChange={(e) => {
                                const val = e.target.value;
                                setStatusFilter(val);
                                applyCombinedFilters(searchText, metalFilter, purityFilter, val);
                            }}
                            optionType="button"
                            buttonStyle="solid"
                            size="middle"
                        >
                            <Radio.Button value="all">All</Radio.Button>
                            <Radio.Button value="running">Running</Radio.Button>
                            <Radio.Button value="closed">Closed</Radio.Button>
                        </Radio.Group>
                    </Space>

                    <Tooltip title="Reset all filters">
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => {
                                setSearchText("");
                                setMetalFilter("all");
                                setPurityFilter("all");
                                setStatusFilter("all");
                                setFilters([], "replace");
                            }}
                        >
                            Reset
                        </Button>
                    </Tooltip>
                </div>

                {/* Loans Data Table */}
                <Table
                    {...tableProps}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1650 }}
                    onChange={(pagination, _columnFilters, sorter, extra) => {
                        tableProps.onChange?.(pagination, {}, sorter, extra);
                    }}
                    onRow={(record) => ({
                        style: { cursor: "pointer" },
                        onClick: () => setShowRecord(record),
                    })}
                >
                    {/* Loan Date */}
                    <Table.Column<IGoldLoan>
                        key="loan_date"
                        dataIndex="loan_date"
                        title="Date"
                        width={105}
                        sorter
                        defaultSortOrder={getDefaultSortOrder("loan_date", sorters)}
                        render={(val: string) => (
                            <Typography.Text style={{ fontSize: 13, color: token.colorText }}>
                                {dayjs(val).format("YYYY-MM-DD")}
                            </Typography.Text>
                        )}
                    />

                    {/* Customer & Nominee */}
                    <Table.Column<IGoldLoan>
                        key="customer_name"
                        dataIndex="customer_name"
                        title="Customer"
                        width={150}
                        sorter
                        filterDropdown={makeColumnFilter("customer_name", "Filter by name...")}
                        filterIcon={(active) => (
                            <FilterOutlined style={{ color: active ? token.colorPrimary : undefined }} />
                        )}
                        render={(_: unknown, record: IGoldLoan) => (
                            <div>
                                <Typography.Text strong style={{ color: token.colorText }}>
                                    {record.customer_name}
                                </Typography.Text>
                                <div style={{ fontSize: 11, color: token.colorTextSecondary }}>
                                    {record.nominee} (Nominee)
                                </div>
                            </div>
                        )}
                    />

                    {/* Contact */}
                    <Table.Column<IGoldLoan>
                        key="contact_no"
                        dataIndex="contact_no"
                        title="Contact"
                        width={130}
                        filterDropdown={makeColumnFilter("contact_no", "Filter by contact...")}
                        filterIcon={(active) => (
                            <FilterOutlined style={{ color: active ? token.colorPrimary : undefined }} />
                        )}
                        render={(val: string) => (
                            <Typography.Text copyable={{ text: val }} style={{ color: token.colorText }}>
                                {val}
                            </Typography.Text>
                        )}
                    />

                    {/* Metal */}
                    <Table.Column<IGoldLoan>
                        key="metal_type"
                        dataIndex="metal_type"
                        title="Metal"
                        width={90}
                        render={(val: string) => (
                            <Tag color={val === "Gold" ? "gold" : "default"}>
                                {val}
                            </Tag>
                        )}
                    />

                    {/* Purity */}
                    <Table.Column<IGoldLoan>
                        key="purity"
                        dataIndex="purity"
                        title="Purity"
                        width={90}
                        render={(val: string) => <Tag color="cyan">{val}</Tag>}
                    />

                    {/* Ornament Details */}
                    <Table.Column<IGoldLoan>
                        key="ornament_details"
                        dataIndex="ornament_details"
                        title="Ornament"
                        width={260}
                        ellipsis
                    />

                    {/* Loan Amount */}
                    <Table.Column<IGoldLoan>
                        key="loan_amount"
                        dataIndex="loan_amount"
                        title="Loan Amount"
                        width={130}
                        sorter
                        render={(val: number) => (
                            <Typography.Text strong style={{ color: token.colorText }}>
                                ₹{Number(val).toLocaleString("en-IN")}
                            </Typography.Text>
                        )}
                    />

                    {/* Duration (hidden below xxl ≈ 1400px to fit 1366) */}
                    <Table.Column<IGoldLoan>
                        key="duration_months"
                        dataIndex="duration_months"
                        title="Duration"
                        width={100}
                        responsive={["xxl"]}
                        render={(val: number) => (
                            <Typography.Text style={{ color: token.colorText }}>
                                {val} mo
                            </Typography.Text>
                        )}
                    />

                    {/* Interest (hidden below xxl ≈ 1400px to fit 1366) */}
                    <Table.Column<IGoldLoan>
                        key="interest_amount"
                        dataIndex="interest_amount"
                        title="Interest"
                        width={120}
                        responsive={["xxl"]}
                        render={(_: unknown, record: IGoldLoan) => (
                            <div>
                                <Typography.Text style={{ fontSize: 11, display: "block", color: token.colorTextSecondary }}>
                                    {record.interest_rate}%
                                </Typography.Text>
                                <Typography.Text style={{ color: token.colorWarning, fontWeight: 600 }}>
                                    ₹{Number(record.interest_amount).toLocaleString("en-IN")}
                                </Typography.Text>
                            </div>
                        )}
                    />

                    {/* Total Amount */}
                    <Table.Column<IGoldLoan>
                        key="total_amount"
                        dataIndex="total_amount"
                        title="Total"
                        width={130}
                        sorter
                        render={(val: number) => (
                            <Typography.Text strong style={{ color: token.colorSuccess }}>
                                ₹{Number(val).toLocaleString("en-IN")}
                            </Typography.Text>
                        )}
                    />

                    {/* Status */}
                    <Table.Column<IGoldLoan>
                        key="status"
                        dataIndex="status"
                        title="Status"
                        width={100}
                        render={(val: string) => (
                            <Tag color={val === "running" ? "processing" : "success"} style={{ textTransform: "capitalize" }}>
                                {val}
                            </Tag>
                        )}
                    />

                    {/* Actions */}
                    <Table.Column<IGoldLoan>
                        title="Actions"
                        dataIndex="actions"
                        key="actions"
                        width={180}
                        fixed="right"
                        render={(_: unknown, record: IGoldLoan) => (
                            <Space size={4} onClick={(e) => e.stopPropagation()}>
                                {record.status === "running" && (
                                    <Popconfirm
                                        title="Close loan?"
                                        description={`Mark loan for ${record.customer_name} as settled?`}
                                        onConfirm={() => handleCloseLoan(record)}
                                        okText="Yes, Close"
                                        cancelText="Cancel"
                                    >
                                        <Button
                                            size="small"
                                            style={{
                                                color: token.colorWarning,
                                                borderColor: token.colorWarningBorder || token.colorWarning,
                                                fontWeight: 600,
                                            }}
                                        >
                                            Close
                                        </Button>
                                    </Popconfirm>
                                )}
                                <Tooltip title="View Details">
                                    <Button
                                        icon={<EyeOutlined />}
                                        size="small"
                                        onClick={() => setShowRecord(record)}
                                    />
                                </Tooltip>
                                <Tooltip title="Edit">
                                    <Button
                                        icon={<EditOutlined />}
                                        size="small"
                                        onClick={() => showEdit(record.id)}
                                    />
                                </Tooltip>
                                <Tooltip title="Clone">
                                    <Button
                                        icon={<CopyOutlined />}
                                        size="small"
                                        onClick={() => showClone(record.id)}
                                    />
                                </Tooltip>
                                <Tooltip title="Delete">
                                    <Popconfirm
                                        title="Delete loan record?"
                                        description="Are you sure you want to permanently delete this loan?"
                                        onConfirm={() => handleDeleteLoan(record)}
                                        okText="Delete"
                                        okButtonProps={{ danger: true }}
                                        cancelText="Cancel"
                                    >
                                        <Button
                                            icon={<DeleteOutlined />}
                                            size="small"
                                            danger
                                        />
                                    </Popconfirm>
                                </Tooltip>
                            </Space>
                        )}
                    />
                </Table>
            </RefineList>

            {/* Slide-over Drawers for clean, bounded, responsive form experience */}
            <LoanDrawer
                action="create"
                drawerProps={createDrawerProps}
                formProps={createFormProps}
                onFinish={handleCreateFinish}
                close={closeCreate}
            />

            <LoanDrawer
                action="edit"
                drawerProps={editDrawerProps}
                formProps={editFormProps}
                onFinish={handleEditFinish}
                close={closeEdit}
            />

            <LoanDrawer
                action="clone"
                drawerProps={cloneDrawerProps}
                formProps={cloneFormProps}
                onFinish={handleCloneFinish}
                close={closeClone}
            />

            {/* Slide-over Loan Show Details Drawer */}
            <LoanShowDrawer
                record={showRecord}
                open={!!showRecord}
                onClose={() => setShowRecord(null)}
                onEdit={
                    showRecord
                        ? () => {
                              setShowRecord(null);
                              showEdit(showRecord.id);
                          }
                        : undefined
                }
                onCloseLoan={handleCloseLoan}
            />
        </>
    );
}
