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
    PlusOutlined,
    ReloadOutlined,
} from "@ant-design/icons";
import type { FilterDropdownProps } from "antd/es/table/interface";
import {
    App,
    Button,
    Grid,
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
import { MobileOrnamentGrid } from "../../../components/inventory/mobile-ornament-grid";
import { useShopCheck } from "../../../hooks/use-shop-check";
import type { ICategory, IMetalType, IOrnament, IOrnamentWithDetails } from "../../../libs/interfaces";

dayjs.extend(relativeTime);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const paise2Rs = (paise?: number | null) =>
    paise != null ? (paise / 100).toFixed(2) : null;

const mg2g = (mg?: number | null) =>
    mg != null ? (mg / 1000).toFixed(3) : "—";

// ─── Category filter dropdown ────────────────────────────────────────────────

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
        resource: "categories",
        optionLabel: "name",
        optionValue: "id",
        filters: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
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

// ─── Metal type filter dropdown ──────────────────────────────────────────────

interface MetalTypeFilterProps extends FilterDropdownProps {}

const MetalTypeFilterDropdown: React.FC<MetalTypeFilterProps> = ({
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

// ─── Page default export ─────────────────────────────────────────────────────

const { useBreakpoint } = Grid;

export default function Ornaments() {
    const screens = useBreakpoint();
    if (!screens.md) {
        return <MobileOrnamentGrid />;
    }
    return <OrnamentList />;
}

// ─── Main list component ─────────────────────────────────────────────────────

const OrnamentList: React.FC = () => {
    const { notification, modal } = App.useApp();
    const { shops } = useShopCheck();
    const shopId = shops?.[0]?.id;

    const { data: identity } = useGetIdentity<{ id: string }>();
    const userId = identity?.id;

    // Show drawer state
    const [showRecord, setShowRecord] = useState<IOrnamentWithDetails | null>(null);

    // Form record state for edit and clone
    const [editingOrnament, setEditingOrnament] = useState<IOrnament | null>(null);
    const [cloningOrnament, setCloningOrnament] = useState<IOrnament | null>(null);

    // Per-row toggle-loading state
    const [loadingToggles, setLoadingToggles] = useState<Record<string, boolean>>({});

    // Toolbar filters state
    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

    const { tableProps, sorters, filters, setFilters } = useTable<IOrnamentWithDetails, HttpError>({
        resource: "ornaments",
        filters: {
            permanent: shopId
                ? [{ field: "shop_id", operator: "eq", value: shopId }]
                : [],
        },
        sorters: {
            initial: [{ field: "created_at", order: "desc" }],
        },
        meta: {
            select: "*, category:categories(id,name), metal_type:metal_types(id,name), purity_level:purity_levels(id,purity_value,display_name)",
        },
    });

    const { mutate: updateOrnament } = useUpdate<IOrnament>();
    const { mutate: deleteOrnament } = useDelete<IOrnament>();

    const { triggerExport, isLoading: isExporting } = useExport<IOrnamentWithDetails>({
        resource: "ornaments",
        filters: {
            permanent: shopId
                ? [{ field: "shop_id", operator: "eq", value: shopId }]
                : [],
        },
        mapData: (record) => ({
            "Item Code": record.item_code,
            Name: record.name,
            Category: record.category?.name ?? "",
            Metal: record.metal_type?.name ?? "",
            Purity: record.purity_level?.display_name ?? "",
            "Gross Wt (g)": record.gross_weight_grams,
            "Net Wt (g)": record.net_weight_grams,
            "Wastage (mg)": record.wastage_mg ?? "",
            "Making Charge Type": record.making_charge_type ?? "",
            "Making Charge (Rs)": paise2Rs(record.making_charge_value_paise) ?? "",
            Quantity: record.quantity,
            Status: record.is_active ? "Active" : "Inactive",
            "Created At": record.created_at,
        }),
        exportOptions: {
            filename: `ornaments-${dayjs().format("YYYY-MM-DD")}`,
        },
    });

    // Refine Drawer Form for Ornament create & edit
    const {
        drawerProps,
        formProps,
        show: showFormDrawer,
        close: closeFormDrawer,
    } = useDrawerForm<IOrnament>({
        resource: "ornaments",
        action: editingOrnament ? "edit" : "create",
        id: editingOrnament?.id,
        redirect: false,
        meta: {
            select: "*, category:categories(id,name), metal_type:metal_types(id,name), purity_level:purity_levels(id,purity_value,display_name)",
        },
        onMutationSuccess: () => {
            setEditingOrnament(null);
            closeFormDrawer();
        },
    });

    const handleCreateNew = () => {
        setEditingOrnament(null);
        setCloningOrnament(null);
        formProps.form?.resetFields();
        showFormDrawer();
    };

    const handleEdit = (record: IOrnamentWithDetails) => {
        setEditingOrnament(record);
        setCloningOrnament(null);
        showFormDrawer(record.id);
    };

    const handleClone = (record: IOrnamentWithDetails) => {
        setEditingOrnament(null);
        setCloningOrnament(record);
        formProps.form?.resetFields();
        showFormDrawer();
    };

    const handleDelete = (record: IOrnamentWithDetails) => {
        modal.confirm({
            title: "Delete Ornament",
            content: `Are you sure you want to delete "${record.name}" (${record.item_code})? This action cannot be undone.`,
            okText: "Delete",
            okType: "danger",
            cancelText: "Cancel",
            onOk: () => {
                deleteOrnament(
                    {
                        resource: "ornaments",
                        id: record.id,
                    },
                    {
                        onSuccess: () => {
                            notification.success({
                                message: "Ornament deleted successfully",
                            });
                        },
                        onError: (error) => {
                            notification.error({
                                message: "Error deleting ornament",
                                description: error?.message,
                            });
                        },
                    }
                );
            },
        });
    };

    const handleToggleActive = (record: IOrnamentWithDetails, checked: boolean) => {
        setLoadingToggles((prev) => ({ ...prev, [record.id]: true }));
        updateOrnament(
            {
                resource: "ornaments",
                id: record.id,
                values: {
                    is_active: checked,
                    updated_by: userId,
                },
            },
            {
                onSuccess: () => {
                    setLoadingToggles((prev) => ({ ...prev, [record.id]: false }));
                    notification.success({
                        message: `Ornament marked as ${checked ? "Active" : "Inactive"}`,
                    });
                },
                onError: (error) => {
                    setLoadingToggles((prev) => ({ ...prev, [record.id]: false }));
                    notification.error({
                        message: "Error updating ornament status",
                        description: error?.message,
                    });
                },
            }
        );
    };

    const handleSearch = (value: string) => {
        setSearchText(value);
        setFilters(
            value
                ? [
                      {
                          field: "name",
                          operator: "contains",
                          value,
                      },
                  ]
                : [],
            "merge"
        );
    };

    const handleStatusFilterChange = (status: "all" | "active" | "inactive") => {
        setStatusFilter(status);
        if (status === "all") {
            setFilters(
                [{ field: "is_active", operator: "eq", value: undefined }],
                "merge"
            );
        } else {
            setFilters(
                [
                    {
                        field: "is_active",
                        operator: "eq",
                        value: status === "active",
                    },
                ],
                "merge"
            );
        }
    };

    const columns = [
        {
            title: "Item Code",
            dataIndex: "item_code",
            key: "item_code",
            sorter: true,
            defaultSortOrder: getDefaultSortOrder("item_code", sorters),
            render: (value: string, record: IOrnamentWithDetails) => (
                <Button
                    type="link"
                    style={{ padding: 0, fontFamily: "monospace" }}
                    onClick={() => setShowRecord(record)}
                >
                    {value}
                </Button>
            ),
        },
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
            sorter: true,
            defaultSortOrder: getDefaultSortOrder("name", sorters),
            render: (value: string, record: IOrnamentWithDetails) => (
                <Space>
                    <Typography.Text strong>{value}</Typography.Text>
                    {record.huid && (
                        <Tag color="purple" style={{ fontFamily: "monospace", fontSize: 11 }}>
                            HUID: {record.huid}
                        </Tag>
                    )}
                </Space>
            ),
        },
        {
            title: "Category",
            dataIndex: ["category", "name"],
            key: "category.name",
            filterDropdown: (props: FilterDropdownProps) => (
                <CategoryFilterDropdown {...props} shopId={shopId} />
            ),
            filterIcon: (filtered: boolean) => (
                <FilterOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
            ),
            render: (value?: string) => value ?? "—",
        },
        {
            title: "Metal",
            dataIndex: ["metal_type", "name"],
            key: "metal_type.name",
            filterDropdown: (props: FilterDropdownProps) => (
                <MetalTypeFilterDropdown {...props} />
            ),
            filterIcon: (filtered: boolean) => (
                <FilterOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
            ),
            render: (value?: string) => {
                if (!value) return "—";
                const isGold = value.toUpperCase() === "GOLD";
                const isSilver = value.toUpperCase() === "SILVER";
                return (
                    <Tag color={isGold ? "gold" : isSilver ? "default" : "blue"}>
                        {value}
                    </Tag>
                );
            },
        },
        {
            title: "Purity",
            dataIndex: ["purity_level", "display_name"],
            key: "purity_level.display_name",
            render: (value?: string) => value ?? "—",
        },
        {
            title: "Gross Wt (g)",
            dataIndex: "gross_weight_grams",
            key: "gross_weight_grams",
            sorter: true,
            defaultSortOrder: getDefaultSortOrder("gross_weight_grams", sorters),
            render: (value: number) => value.toFixed(3),
        },
        {
            title: "Net Wt (g)",
            dataIndex: "net_weight_grams",
            key: "net_weight_grams",
            sorter: true,
            defaultSortOrder: getDefaultSortOrder("net_weight_grams", sorters),
            render: (value: number) => value.toFixed(3),
        },
        {
            title: "Wastage",
            dataIndex: "wastage_mg",
            key: "wastage_mg",
            render: (value?: number | null) =>
                value != null ? `${mg2g(value)} g` : "—",
        },
        {
            title: "Making Charges",
            key: "making_charges",
            render: (_: unknown, record: IOrnamentWithDetails) => {
                if (record.making_charge_value_paise == null) return "—";
                const rs = paise2Rs(record.making_charge_value_paise);
                if (record.making_charge_type === "PER_PIECE") {
                    return `₹${rs} (fixed)`;
                }
                if (record.making_charge_type === "PERCENTAGE") {
                    return `${rs}%`;
                }
                return `₹${rs}/g`;
            },
        },
        {
            title: "Qty",
            dataIndex: "quantity",
            key: "quantity",
            sorter: true,
            defaultSortOrder: getDefaultSortOrder("quantity", sorters),
            render: (value: number) => (
                <Tag color={value > 0 ? "blue" : "error"}>{value}</Tag>
            ),
        },
        {
            title: "Status",
            dataIndex: "is_active",
            key: "is_active",
            render: (value: boolean, record: IOrnamentWithDetails) => (
                <Space>
                    <Switch
                        size="small"
                        checked={value}
                        loading={!!loadingToggles[record.id]}
                        onChange={(checked) => handleToggleActive(record, checked)}
                    />
                    <Tag color={value ? "success" : "default"}>
                        {value ? "Active" : "Inactive"}
                    </Tag>
                </Space>
            ),
        },
        {
            title: "Created At",
            dataIndex: "created_at",
            key: "created_at",
            sorter: true,
            defaultSortOrder: getDefaultSortOrder("created_at", sorters),
            render: (value: string) => (
                <Tooltip title={dayjs(value).format("YYYY-MM-DD HH:mm:ss")}>
                    {dayjs(value).fromNow()}
                </Tooltip>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            render: (_: unknown, record: IOrnamentWithDetails) => (
                <Space>
                    <Tooltip title="View">
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
                    <Tooltip title="Delete">
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                            onClick={() => handleDelete(record)}
                        />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <RefineList
            title="Ornaments"
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
                    Add Ornament
                </Button>,
            ]}
        >
            {/* Toolbar */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                    gap: 16,
                    flexWrap: "wrap",
                }}
            >
                <Space wrap>
                    <Input.Search
                        placeholder="Search by name"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onSearch={handleSearch}
                        style={{ width: 240 }}
                        allowClear
                    />
                    <Radio.Group
                        value={statusFilter}
                        onChange={(e) => handleStatusFilterChange(e.target.value)}
                        buttonStyle="solid"
                    >
                        <Radio.Button value="all">All</Radio.Button>
                        <Radio.Button value="active">Active</Radio.Button>
                        <Radio.Button value="inactive">Inactive</Radio.Button>
                    </Radio.Group>
                </Space>
                <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                        setSearchText("");
                        setStatusFilter("all");
                        setFilters([], "replace");
                    }}
                >
                    Reset Filters
                </Button>
            </div>

            <Table
                {...tableProps}
                rowKey="id"
                columns={columns}
                pagination={{
                    ...tableProps.pagination,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} ornaments`,
                }}
            />

            <OrnamentShowDrawer
                open={!!showRecord}
                ornament={showRecord}
                onClose={() => setShowRecord(null)}
            />

            <OrnamentDrawer
                drawerProps={drawerProps}
                formProps={formProps}
                ornament={editingOrnament}
                clonedOrnament={cloningOrnament}
                shopId={shopId}
                onClose={() => {
                    setEditingOrnament(null);
                    setCloningOrnament(null);
                    closeFormDrawer();
                }}
            />
        </RefineList>
    );
};
