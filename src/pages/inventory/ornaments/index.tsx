import {
    ExportButton,
    List as RefineList,
    getDefaultSortOrder,
    useDrawerForm,
    useSelect,
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
    CopyOutlined,
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    FilterOutlined,
    ReloadOutlined,
} from "@ant-design/icons";
import type { FilterDropdownProps } from "antd/es/table/interface";
import {
    App,
    Button,
    Input,
    Radio,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    Tooltip,
    Typography,
} from "antd";
import React, { useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { OrnamentDrawer } from "../../../components/inventory/ornaments/ornament-drawer";
import { OrnamentShowDrawer } from "../../../components/inventory/ornaments/ornament-show-drawer";
import { useShopCheck } from "../../../hooks/use-shop-check";
import type { ICategory, IMetalType, IOrnament, IOrnamentWithDetails } from "../../../libs/interfaces";

dayjs.extend(relativeTime);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const paise2Rs = (paise?: number | null) =>
    paise != null ? (paise / 100).toFixed(2) : null;

const mg2g = (mg?: number | null) =>
    mg != null ? (mg / 1000).toFixed(3) : "—";

// ─── Category filter dropdown ─────────────────────────────────────────────────

interface CategoryFilterProps extends FilterDropdownProps {
    shopId?: string;
}

const CategoryFilterDropdown: React.FC<CategoryFilterProps> = ({
    setSelectedKeys,
    selectedKeys,
    confirm,
    clearFilters,
    shopId,
}) => {
    const { selectProps } = useSelect<ICategory>({
        resource: "ornament_categories",
        optionLabel: "name",
        optionValue: "id",
        filters: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
        sorters: [{ field: "name", order: "asc" }],
    });

    return (
        <div style={{ padding: 8, minWidth: 220 }}>
            <Select<string>
                options={selectProps.options}
                loading={selectProps.loading}
                onSearch={selectProps.onSearch}
                allowClear
                showSearch
                filterOption={false}
                style={{ width: "100%", marginBottom: 8 }}
                placeholder="Filter by category…"
                value={(selectedKeys[0] as string) || undefined}
                onChange={(val) => setSelectedKeys(val ? [val] : [])}
            />
            <Space>
                <Button type="primary" size="small" onClick={() => confirm()}>
                    Filter
                </Button>
                <Button
                    size="small"
                    onClick={() => {
                        clearFilters?.();
                        confirm();
                    }}
                >
                    Reset
                </Button>
            </Space>
        </div>
    );
};

// ─── Metal type filter dropdown ────────────────────────────────────────────────

const MetalTypeFilterDropdown: React.FC<FilterDropdownProps> = ({
    setSelectedKeys,
    selectedKeys,
    confirm,
    clearFilters,
}) => {
    const { selectProps } = useSelect<IMetalType>({
        resource: "metal_types",
        optionLabel: "name",
        optionValue: "id",
        filters: [{ field: "is_active", operator: "eq", value: true }],
        sorters: [{ field: "name", order: "asc" }],
    });

    return (
        <div style={{ padding: 8, minWidth: 200 }}>
            <Select<string>
                options={selectProps.options}
                loading={selectProps.loading}
                allowClear
                showSearch
                filterOption={false}
                style={{ width: "100%", marginBottom: 8 }}
                placeholder="Filter by metal…"
                value={(selectedKeys[0] as string) || undefined}
                onChange={(val) => setSelectedKeys(val ? [val] : [])}
            />
            <Space>
                <Button type="primary" size="small" onClick={() => confirm()}>
                    Filter
                </Button>
                <Button
                    size="small"
                    onClick={() => {
                        clearFilters?.();
                        confirm();
                    }}
                >
                    Reset
                </Button>
            </Space>
        </div>
    );
};

// ─── Page default export ──────────────────────────────────────────────────────

export default function Ornaments() {
    return <OrnamentList />;
}

// ─── Main list component ──────────────────────────────────────────────────────

const OrnamentList: React.FC = () => {
    const { notification, modal } = App.useApp();
    const { shops } = useShopCheck();
    const shopId = shops?.[0]?.id;

    const { data: identity } = useGetIdentity<{ id: string }>();
    const userId = identity?.id;

    // Show drawer state
    const [showRecord, setShowRecord] = useState<IOrnamentWithDetails | null>(null);

    // Per-row toggle-loading
    const [loadingToggles, setLoadingToggles] = useState<Record<string, boolean>>({});

    // Toolbar state
    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

    // ── Table ──────────────────────────────────────────────────────────────────

    const { tableProps, sorters, filters, setFilters } = useTable<IOrnamentWithDetails, HttpError>({
        resource: "ornaments",
        meta: {
            select:
                "*, category:ornament_categories(id, name), metal_type:metal_types(id, name), purity_level:purity_levels(id, display_name, purity_value)",
        },
        filters: {
            permanent: shopId
                ? [{ field: "shop_id", operator: "eq", value: shopId }]
                : [],
        },
        sorters: {
            initial: [{ field: "created_at", order: "desc" }],
        },
        syncWithLocation: true,
        queryOptions: { enabled: !!shopId },
    });

    // ── Mutations ──────────────────────────────────────────────────────────────

    const { mutate: deleteOrnament } = useDelete();
    const { mutate: updateOrnament } = useUpdate<IOrnament>();

    // ── Drawer Forms ───────────────────────────────────────────────────────────

    const {
        drawerProps: createDrawerProps,
        formProps: createFormProps,
        show: showCreate,
        close: closeCreate,
        saveButtonProps: createSaveButtonProps,
    } = useDrawerForm<IOrnament>({
        action: "create",
        resource: "ornaments",
        warnWhenUnsavedChanges: true,
        syncWithLocation: { key: "create-ornament", syncId: false },
    });

    const {
        drawerProps: editDrawerProps,
        formProps: editFormProps,
        show: showEdit,
        close: closeEdit,
        id: editId,
        saveButtonProps: editSaveButtonProps,
    } = useDrawerForm<IOrnament>({
        action: "edit",
        resource: "ornaments",
        warnWhenUnsavedChanges: true,
        syncWithLocation: { key: "edit-ornament", syncId: true },
    });

    const {
        drawerProps: cloneDrawerProps,
        formProps: cloneFormProps,
        show: showClone,
        close: closeClone,
        saveButtonProps: cloneSaveButtonProps,
    } = useDrawerForm<IOrnament>({
        action: "clone",
        resource: "ornaments",
        warnWhenUnsavedChanges: true,
        syncWithLocation: { key: "clone-ornament", syncId: true },
    });

    // ── Export ─────────────────────────────────────────────────────────────────

    const { triggerExport, isLoading: exportLoading } = useExport<IOrnamentWithDetails>({
        resource: "ornaments",
        meta: {
            select:
                "*, category:ornament_categories(id, name), metal_type:metal_types(id, name), purity_level:purity_levels(id, display_name, purity_value)",
        },
        filters: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
        mapData: (item) => ({
            "Name": item.name,
            "SKU": item.sku ?? "",
            "Category": item.category?.name ?? "",
            "Metal": item.metal_type?.name ?? "",
            "Purity": item.purity_level?.display_name ?? "",
            "Weight (g)": item.weight_mg != null ? item.weight_mg / 1000 : "",
            "Quantity": item.quantity,
            "Metal Rate (₹/g)": paise2Rs(item.purchase_metal_rate_paise) ?? "",
            "Making Charge (₹)": paise2Rs(item.purchase_making_charge_paise) ?? "",
            "Total Cost (₹)": paise2Rs(item.purchase_total_cost_paise) ?? "",
            "Purchase Date": item.purchase_date ?? "",
            "Status": item.is_active ? "Active" : "Inactive",
            "Added": new Date(item.created_at).toLocaleDateString("en-IN"),
        }),
    });

    // ── Toolbar helpers ────────────────────────────────────────────────────────

    const applyFilters = (text: string, status: "all" | "active" | "inactive") => {
        const next = [];
        if (text.trim()) {
            next.push({ field: "name", operator: "contains" as const, value: text.trim() });
        }
        if (status !== "all") {
            next.push({ field: "is_active", operator: "eq" as const, value: status === "active" });
        }
        setFilters(next, "replace");
    };

    const makeColumnFilter =
        (field: string, placeholder: string) =>
        ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) =>
            (
                <div style={{ padding: 8, minWidth: 200 }}>
                    <Input
                        autoFocus
                        placeholder={placeholder}
                        value={selectedKeys[0] as string}
                        onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
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

    // ── Handlers ───────────────────────────────────────────────────────────────

    const handleCreateFinish = (values: Partial<IOrnament>) =>
        createFormProps.onFinish?.({ ...values, shop_id: shopId, created_by: userId, updated_by: userId });

    const handleEditFinish = (values: Partial<IOrnament>) =>
        editFormProps.onFinish?.({ ...values, updated_by: userId });

    const handleCloneFinish = (values: Partial<IOrnament>) =>
        cloneFormProps.onFinish?.({ ...values, shop_id: shopId, created_by: userId, updated_by: userId });

    const handleToggle = (record: IOrnamentWithDetails, checked: boolean) => {
        setLoadingToggles((prev) => ({ ...prev, [record.id]: true }));
        updateOrnament(
            {
                resource: "ornaments",
                id: record.id,
                values: { is_active: checked, updated_by: userId },
                successNotification: () => ({
                    message: checked ? "Ornament activated" : "Ornament deactivated",
                    type: "success",
                }),
            },
            {
                onSettled: () =>
                    setLoadingToggles((prev) => {
                        const next = { ...prev };
                        delete next[record.id];
                        return next;
                    }),
            }
        );
    };

    const handleDelete = (record: IOrnamentWithDetails) => {
        modal.confirm({
            title: "Delete ornament?",
            content: (
                <>
                    <Typography.Text>
                        Permanently delete <b>{record.name}</b>
                        {record.sku ? ` (${record.sku})` : ""}? This cannot be undone.
                    </Typography.Text>
                    <br />
                    <Typography.Text type="warning">
                        Deletion will fail if this ornament is linked to invoices.
                    </Typography.Text>
                </>
            ),
            okText: "Delete",
            okButtonProps: { danger: true },
            onOk: () => {
                deleteOrnament(
                    { resource: "ornaments", id: record.id },
                    {
                        onError: () => {
                            notification.error({
                                message: "Cannot delete ornament",
                                description: "This ornament is linked to invoices. Remove links first.",
                            });
                        },
                    }
                );
            },
        });
    };

    const hasActiveFilters =
        searchText !== "" ||
        statusFilter !== "all" ||
        filters.some((f) => "field" in f && f.field !== "shop_id");

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <>
            <RefineList
                headerButtons={({ defaultButtons }) => (
                    <>
                        {defaultButtons}
                        <ExportButton onClick={triggerExport} loading={exportLoading} />
                    </>
                )}
                createButtonProps={{
                    onClick: () => showCreate(),
                    children: "New Ornament",
                }}
            >
                {/* ── Toolbar ──────────────────────────────────────────── */}
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
                            placeholder="Search by name…"
                            allowClear
                            style={{ width: 260 }}
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
                                const val = e.target.value as "all" | "active" | "inactive";
                                setStatusFilter(val);
                                applyFilters(searchText, val);
                            }}
                            optionType="button"
                            buttonStyle="solid"
                            size="small"
                        >
                            <Radio.Button value="all">All</Radio.Button>
                            <Radio.Button value="active">Active</Radio.Button>
                            <Radio.Button value="inactive">Inactive</Radio.Button>
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

                {/* ── Table ─────────────────────────────────────────────── */}
                <Table
                    {...tableProps}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1400 }}
                    onChange={(pagination, _columnFilters, sorter, extra) => {
                        tableProps.onChange?.(pagination, {}, sorter, extra);
                    }}
                    onRow={(record) => ({
                        style: { cursor: "pointer" },
                        onClick: () => setShowRecord(record),
                    })}
                >
                    {/* Date */}
                    <Table.Column<IOrnamentWithDetails>
                        key="created_at"
                        dataIndex="created_at"
                        title="Date"
                        width={110}
                        sorter
                        defaultSortOrder={getDefaultSortOrder("created_at", sorters)}
                        render={(val: string) => (
                            <Tooltip title={new Date(val).toLocaleString("en-IN")}>
                                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                    {dayjs(val).fromNow()}
                                </Typography.Text>
                            </Tooltip>
                        )}
                    />

                    {/* Name + SKU */}
                    <Table.Column<IOrnamentWithDetails>
                        key="name"
                        dataIndex="name"
                        title="Name"
                        sorter
                        defaultSortOrder={getDefaultSortOrder("name", sorters)}
                        filterDropdown={makeColumnFilter("name", "Filter by name…")}
                        filterIcon={(active) => (
                            <FilterOutlined style={{ color: active ? "#1677ff" : undefined }} />
                        )}
                        render={(_: unknown, record: IOrnamentWithDetails) => (
                            <div>
                                <Typography.Text strong>{record.name}</Typography.Text>
                                {record.sku && (
                                    <div style={{ marginTop: 2 }}>
                                        <Tag
                                            color="blue"
                                            style={{
                                                fontFamily: "monospace",
                                                fontSize: 10,
                                                padding: "0 5px",
                                                lineHeight: "18px",
                                            }}
                                        >
                                            {record.sku}
                                        </Tag>
                                    </div>
                                )}
                            </div>
                        )}
                    />

                    {/* Metal + Purity */}
                    <Table.Column<IOrnamentWithDetails>
                        key="metal_type_id"
                        dataIndex="metal_type_id"
                        title="Metal"
                        width={160}
                        sorter
                        defaultSortOrder={getDefaultSortOrder("metal_type_id", sorters)}
                        filterDropdown={(props) => <MetalTypeFilterDropdown {...props} />}
                        filterIcon={(active) => (
                            <FilterOutlined style={{ color: active ? "#1677ff" : undefined }} />
                        )}
                        render={(_: unknown, record: IOrnamentWithDetails) => (
                            <div>
                                <Typography.Text strong>
                                    {record.metal_type?.name ?? "—"}
                                </Typography.Text>
                                {record.purity_level && (
                                    <Typography.Text
                                        type="secondary"
                                        style={{ display: "block", fontSize: 11 }}
                                    >
                                        {record.purity_level.display_name} ({record.purity_level.purity_value}%)
                                    </Typography.Text>
                                )}
                            </div>
                        )}
                    />

                    {/* Category */}
                    <Table.Column<IOrnamentWithDetails>
                        key="category_id"
                        dataIndex="category_id"
                        title="Category"
                        width={150}
                        sorter
                        defaultSortOrder={getDefaultSortOrder("category_id", sorters)}
                        filterDropdown={(props) => (
                            <CategoryFilterDropdown {...props} shopId={shopId} />
                        )}
                        filterIcon={(active) => (
                            <FilterOutlined style={{ color: active ? "#1677ff" : undefined }} />
                        )}
                        render={(_: unknown, record: IOrnamentWithDetails) => (
                            <Tag color="geekblue">{record.category?.name ?? "—"}</Tag>
                        )}
                    />

                    {/* Weight */}
                    <Table.Column<IOrnamentWithDetails>
                        key="weight_mg"
                        dataIndex="weight_mg"
                        title="Weight"
                        width={100}
                        sorter
                        defaultSortOrder={getDefaultSortOrder("weight_mg", sorters)}
                        render={(mg: number) => (
                            <Typography.Text style={{ fontFamily: "monospace" }}>
                                {mg2g(mg)} g
                            </Typography.Text>
                        )}
                    />

                    {/* Quantity */}
                    <Table.Column<IOrnamentWithDetails>
                        key="quantity"
                        dataIndex="quantity"
                        title="Qty"
                        width={80}
                        sorter
                        defaultSortOrder={getDefaultSortOrder("quantity", sorters)}
                        render={(qty: number) => (
                            <Tag color={qty === 0 ? "error" : qty <= 2 ? "warning" : "success"}>
                                {qty} pcs
                            </Tag>
                        )}
                    />

                    {/* Total Cost + breakdown */}
                    <Table.Column<IOrnamentWithDetails>
                        key="purchase_total_cost_paise"
                        dataIndex="purchase_total_cost_paise"
                        title="Total Cost"
                        width={160}
                        sorter
                        defaultSortOrder={getDefaultSortOrder("purchase_total_cost_paise", sorters)}
                        render={(_: unknown, record: IOrnamentWithDetails) => {
                            const total = paise2Rs(record.purchase_total_cost_paise);
                            const rate = paise2Rs(record.purchase_metal_rate_paise);
                            const making = paise2Rs(record.purchase_making_charge_paise);
                            return (
                                <div>
                                    {total ? (
                                        <Typography.Text strong>₹{total}</Typography.Text>
                                    ) : (
                                        <Typography.Text type="secondary">—</Typography.Text>
                                    )}
                                    {(rate || making) && (
                                        <div style={{ marginTop: 2 }}>
                                            {rate && (
                                                <Typography.Text
                                                    type="secondary"
                                                    style={{ fontSize: 10, display: "block" }}
                                                >
                                                    Rate: ₹{rate}/g
                                                </Typography.Text>
                                            )}
                                            {making && (
                                                <Typography.Text
                                                    type="secondary"
                                                    style={{ fontSize: 10, display: "block" }}
                                                >
                                                    Making: ₹{making}
                                                </Typography.Text>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        }}
                    />

                    {/* Active toggle */}
                    <Table.Column<IOrnamentWithDetails>
                        key="is_active"
                        dataIndex="is_active"
                        title="Active"
                        width={72}
                        render={(_: unknown, record: IOrnamentWithDetails) => (
                            <div onClick={(e) => e.stopPropagation()}>
                                <Switch
                                    size="small"
                                    checked={record.is_active}
                                    loading={!!loadingToggles[record.id]}
                                    onChange={(checked) => handleToggle(record, checked)}
                                />
                            </div>
                        )}
                    />

                    {/* Actions */}
                    <Table.Column<IOrnamentWithDetails>
                        title="Actions"
                        dataIndex="actions"
                        key="actions"
                        width={140}
                        fixed="right"
                        render={(_: unknown, record: IOrnamentWithDetails) => (
                            <Space size={4} onClick={(e) => e.stopPropagation()}>
                                <Tooltip title="View">
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
                                    <Button
                                        icon={<DeleteOutlined />}
                                        size="small"
                                        danger
                                        onClick={() => handleDelete(record)}
                                    />
                                </Tooltip>
                            </Space>
                        )}
                    />
                </Table>
            </RefineList>

            {/* ── Drawer Forms ─────────────────────────────────────────── */}
            <OrnamentDrawer
                action="create"
                drawerProps={createDrawerProps}
                formProps={createFormProps}
                onFinish={handleCreateFinish}
                close={closeCreate}
                shopId={shopId}
                saveButtonProps={createSaveButtonProps}
            />
            <OrnamentDrawer
                action="edit"
                drawerProps={editDrawerProps}
                formProps={editFormProps}
                onFinish={handleEditFinish}
                close={closeEdit}
                shopId={shopId}
                saveButtonProps={editSaveButtonProps}
            />
            <OrnamentDrawer
                action="clone"
                drawerProps={cloneDrawerProps}
                formProps={cloneFormProps}
                onFinish={handleCloneFinish}
                close={closeClone}
                shopId={shopId}
                saveButtonProps={cloneSaveButtonProps}
            />

            {/* ── Show Drawer ───────────────────────────────────────────── */}
            <OrnamentShowDrawer
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
            />
        </>
    );
};
