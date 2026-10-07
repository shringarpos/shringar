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
    Grid,
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
} from "antd";
import dayjs from "dayjs";
import { LoanDrawer } from "../../components/gold-ledger/loan-drawer";
import { LoanShowDrawer } from "../../components/gold-ledger/loan-show-drawer";
import { LoanStatsCards } from "../../components/gold-ledger/loan-stats-cards";
import { MobileGoldLedger } from "../../components/gold-ledger/mobile-gold-ledger";
import type { IGoldLoan } from "../../libs/interfaces";

const { useBreakpoint } = Grid;

export default function GoldLedger() {
    const screens = useBreakpoint();
    const { token } = theme.useToken();
    const { notification } = App.useApp();
    const { data: identity } = useGetIdentity<{ id: string }>();
    const userId = identity?.id;

    // Show drawer state
    const [showRecord, setShowRecord] = useState<IGoldLoan | null>(null);

    // Form record state for seamless edit and clone
    const [editingLoan, setEditingLoan] = useState<IGoldLoan | null>(null);
    const [cloningLoan, setCloningLoan] = useState<IGoldLoan | null>(null);

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
        meta: {
            select: "*, customer:customers(id,name,customer_code,phone)",
        },
    });

    if (!screens.md) {
        return <MobileGoldLedger />;
    }

    const { mutate: updateLoan } = useUpdate<IGoldLoan>();
    const { mutate: deleteLoan } = useDelete<IGoldLoan>();

    const { triggerExport, isLoading: isExporting } = useExport<IGoldLoan>({
        resource: "gold_loans",
        filters: {
            permanent: userId
                ? [{ field: "user_id", operator: "eq", value: userId }]
                : [],
        },
        mapData: (record) => ({
            "Loan Number": record.loan_number,
            Customer: record.customer?.name ?? record.customer_id,
            "Customer Code": record.customer?.customer_code ?? "",
            "Customer Phone": record.customer?.phone ?? "",
            "Principal Amount": (record.principal_amount_paise / 100).toFixed(2),
            "Interest Rate (%)": record.interest_rate_percent,
            "Loan Date": record.loan_date,
            "Due Date": record.due_date ?? "",
            "Closed Date": record.closed_date ?? "",
            Status: record.status,
            "Gross Weight (g)": record.gross_weight_grams ?? "",
            "Net Weight (g)": record.net_weight_grams ?? "",
            "Item Description": record.item_description,
        }),
        exportOptions: {
            filename: `gold-loans-${dayjs().format("YYYY-MM-DD")}`,
        },
    });

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

    const handleCreateNew = () => {
        setEditingLoan(null);
        setCloningLoan(null);
        formProps.form?.resetFields();
        showFormDrawer();
    };

    const handleEdit = (record: IGoldLoan) => {
        setEditingLoan(record);
        setCloningLoan(null);
        showFormDrawer(record.id);
    };

    const handleClone = (record: IGoldLoan) => {
        setEditingLoan(null);
        setCloningLoan(record);
        formProps.form?.resetFields();
        showFormDrawer();
    };

    const handleCloseLoan = (record: IGoldLoan) => {
        updateLoan(
            {
                resource: "gold_loans",
                id: record.id,
                values: {
                    status: "CLOSED",
                    closed_date: dayjs().format("YYYY-MM-DD"),
                    updated_by: userId,
                },
            },
            {
                onSuccess: () => {
                    notification.success({
                        message: "Loan Closed",
                        description: `Loan #${record.loan_number} has been closed.`,
                    });
                },
            }
        );
    };

    const handleDelete = (id: string) => {
        deleteLoan(
            {
                resource: "gold_loans",
                id,
            },
            {
                onSuccess: () => {
                    notification.success({
                        message: "Loan Deleted",
                        description: "Loan record has been removed.",
                    });
                },
            }
        );
    };

    const columns = [
        {
            title: "Loan #",
            dataIndex: "loan_number",
            key: "loan_number",
            sorter: true,
            defaultSortOrder: getDefaultSortOrder("loan_number", sorters),
            render: (value: string, record: IGoldLoan) => (
                <Button
                    type="link"
                    style={{ padding: 0, fontWeight: 600 }}
                    onClick={() => setShowRecord(record)}
                >
                    #{value}
                </Button>
            ),
        },
        {
            title: "Customer",
            dataIndex: ["customer", "name"],
            key: "customer.name",
            render: (_: any, record: IGoldLoan) => (
                <Space direction="vertical" size={0}>
                    <Typography.Text strong>
                        {record.customer?.name ?? "—"}
                    </Typography.Text>
                    {record.customer?.phone && (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {record.customer.phone}
                        </Typography.Text>
                    )}
                </Space>
            ),
        },
        {
            title: "Item / Weight",
            key: "item_weight",
            render: (_: any, record: IGoldLoan) => (
                <Space orientation="vertical" size={0}>
                    <Typography.Text style={{ fontSize: 13 }}>
                        {record.item_description}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {record.net_weight_grams ? `${record.net_weight_grams}g net` : "—"}
                    </Typography.Text>
                </Space>
            ),
        },
        {
            title: "Principal",
            dataIndex: "principal_amount_paise",
            key: "principal_amount_paise",
            align: "right" as const,
            sorter: true,
            defaultSortOrder: getDefaultSortOrder("principal_amount_paise", sorters),
            render: (value: number) => (
                <Typography.Text strong>
                    ₹{(value / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </Typography.Text>
            ),
        },
        {
            title: "Interest",
            dataIndex: "interest_rate_percent",
            key: "interest_rate_percent",
            align: "right" as const,
            render: (value: number) => `${value}% / mo`,
        },
        {
            title: "Loan Date",
            dataIndex: "loan_date",
            key: "loan_date",
            sorter: true,
            defaultSortOrder: getDefaultSortOrder("loan_date", sorters),
            render: (value: string) => dayjs(value).format("DD MMM YYYY"),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status: string, record: IGoldLoan) => {
                const isOverdue =
                    status === "ACTIVE" &&
                    record.due_date &&
                    dayjs(record.due_date).isBefore(dayjs(), "day");
                if (isOverdue) {
                    return <Tag color="error">OVERDUE</Tag>;
                }
                const colorMap: Record<string, string> = {
                    ACTIVE: "processing",
                    CLOSED: "default",
                };
                return <Tag color={colorMap[status] ?? "default"}>{status}</Tag>;
            },
        },
        {
            title: "Actions",
            key: "actions",
            align: "right" as const,
            render: (_: any, record: IGoldLoan) => (
                <Space size={4}>
                    <Tooltip title="View Details">
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            size="small"
                            onClick={() => setShowRecord(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Edit">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => handleEdit(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Clone">
                        <Button
                            type="text"
                            icon={<CopyOutlined />}
                            size="small"
                            onClick={() => handleClone(record)}
                        />
                    </Tooltip>
                    {record.status === "ACTIVE" && (
                        <Popconfirm
                            title="Close Loan"
                            description={`Mark Loan #${record.loan_number} as closed?`}
                            onConfirm={() => handleCloseLoan(record)}
                            okText="Yes, Close"
                            cancelText="No"
                        >
                            <Tooltip title="Mark as Closed">
                                <Button
                                    type="text"
                                    icon={<CheckCircleOutlined style={{ color: token.colorSuccess }} />}
                                    size="small"
                                />
                            </Tooltip>
                        </Popconfirm>
                    )}
                    <Popconfirm
                        title="Delete Loan"
                        description="Are you sure you want to delete this loan record?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes, Delete"
                        okButtonProps={{ danger: true }}
                        cancelText="No"
                    >
                        <Tooltip title="Delete">
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                size="small"
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <RefineList
            title="Gold Loans Ledger"
            headerButtons={[
                <ExportButton
                    key="export"
                    onClick={() => triggerExport()}
                    loading={isExporting}
                />,
                <Button
                    key="create"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleCreateNew}
                >
                    New Loan
                </Button>,
            ]}
        >
            <LoanStatsCards />

            <Table
                {...tableProps}
                rowKey="id"
                columns={columns}
                pagination={{
                    ...tableProps.pagination,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} loans`,
                }}
            />

            <LoanShowDrawer
                open={!!showRecord}
                record={showRecord}
                onClose={() => setShowRecord(null)}
            />

            <LoanDrawer
                drawerProps={drawerProps}
                formProps={formProps}
                editingLoan={editingLoan}
                cloningLoan={cloningLoan}
                userId={userId}
                onClose={() => {
                    setEditingLoan(null);
                    setCloningLoan(null);
                    closeFormDrawer();
                }}
            />
        </RefineList>
    );
}
