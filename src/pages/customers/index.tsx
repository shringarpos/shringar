import {
    ExportButton,
    List as RefineList,
    getDefaultSortOrder,
    useModalForm,
    useSelect,
    useTable,
} from "@refinedev/antd";
import {
    useDelete,
    useExport,
    useGetIdentity,
    useUpdate,
} from "@refinedev/core";
import type { CrudFilter, HttpError } from "@refinedev/core";
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
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import React, { useState } from "react";
import { CustomerModal } from "../../components/customers/customer-modal";
import { CustomerShowModal } from "../../components/customers/customer-show-modal";
import { useShopCheck } from "../../hooks/use-shop-check";
import type { ICustomer } from "../../libs/interfaces";

interface ReferredByFilterProps extends FilterDropdownProps {
    shopId?: string;
    setFilters: (filters: CrudFilter[], behavior: "merge" | "replace") => void;
}

const ReferredByFilterDropdown: React.FC<ReferredByFilterProps> = ({
    setSelectedKeys,
    selectedKeys,
    confirm,
    clearFilters,
    shopId,
    setFilters,
}) => {
    const { selectProps } = useSelect<ICustomer>({
        resource: "customers",
        optionLabel: (item) => `${item.name} (${item.customer_code})`,
        optionValue: "id",
        filters: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
        onSearch: (value) => [{ field: "name", operator: "contains" as const, value }],
    });

    return (
        <div style={{ padding: 8, minWidth: 260 }}>
            <Select<string>
                    options={selectProps.options}
                    loading={selectProps.loading}
                    onSearch={selectProps.onSearch}
                    filterOption={false}
                    allowClear
                    showSearch
                    style={{ width: "100%", marginBottom: 8 }}
                    placeholder="Search by name or code…"
                    value={selectedKeys[0] as string || undefined}
                    onChange={(val) => setSelectedKeys(val ? [val] : [])}
            />
            <Space>
                <Button
                    type="primary"
                    size="small"
                    onClick={() => {
                        setFilters(
                            [{ field: "reference_by", operator: "eq", value: selectedKeys[0] || undefined }],
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
                            [{ field: "reference_by", operator: "eq", value: undefined }],
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
};

dayjs.extend(relativeTime);

export default function Customers() {
    return <CustomerList />;
}

const CustomerList: React.FC = () => {
    const { notification, modal } = App.useApp();
    const { shops } = useShopCheck();
    const shopId = shops?.[0]?.id;

    const { data: identity } = useGetIdentity<{ id: string }>();
    const userId = identity?.id;

    // Show modal state
    const [showRecord, setShowRecord] = useState<ICustomer | null>(null);

    // Per-row toggle-loading state
    const [loadingToggles, setLoadingToggles] = useState<Record<string, boolean>>({});

    // Toolbar state
    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

    const { tableProps, sorters, filters, setFilters } = useTable<ICustomer, HttpError>({
        resource: "customers",
        meta: {
            // PostgREST self-join: alias the FK column for the referred customer data
            select: "*, referred_customer:reference_by(id, name, customer_code)",
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

    const { mutate: deleteCustomer } = useDelete();
    const { mutate: updateCustomer } = useUpdate<ICustomer>();

    // Modal Forms
    const {
        modalProps: createModalProps,
        formProps: createFormProps,
        show: showCreate,
        close: closeCreate,
    } = useModalForm<ICustomer>({
        action: "create",
        resource: "customers",
        warnWhenUnsavedChanges: true,
        syncWithLocation: { key: "create-customer", syncId: false },
    });

    const {
        modalProps: editModalProps,
        formProps: editFormProps,
        show: showEdit,
        close: closeEdit,
        id: editId,
    } = useModalForm<ICustomer>({
        action: "edit",
        resource: "customers",
        warnWhenUnsavedChanges: true,
        syncWithLocation: { key: "edit-customer", syncId: true },
    });

    const {
        modalProps: cloneModalProps,
        formProps: cloneFormProps,
        show: showClone,
        close: closeClone,
    } = useModalForm<ICustomer>({
        action: "clone",
        resource: "customers",
        warnWhenUnsavedChanges: true,
        syncWithLocation: { key: "clone-customer", syncId: true },
    });

    // Export
    const { triggerExport, isLoading: exportLoading } = useExport<ICustomer>({
        resource: "customers",
        filters: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
        mapData: (item) => ({
            "Customer Code": item.customer_code,
            "Name": item.name,
            "Phone": item.phone,
            "Alternate Phone": item.alternate_phone ?? "",
            "Email": item.email ?? "",
            "Address": item.address,
            "Referred By": item.referred_customer
                ? `${item.referred_customer.name} (${item.referred_customer.customer_code})`
                : "",
            "Status": item.is_active ? "Active" : "Inactive",
            "Joined": new Date(item.created_at).toLocaleDateString("en-IN"),
        }),
    });

    // Global filter helper
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

    // Per-column filter dropdown 
    const makeColumnFilter = (field: string, placeholder: string) =>
        ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
            <div style={{ padding: 8, minWidth: 200 }}>
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

    // Handlers 
    const handleCreateFinish = (values: Partial<ICustomer>) => {
        return createFormProps.onFinish?.({
            ...values,
            shop_id: shopId,
            created_by: userId,
            updated_by: userId,
        });
    };

    const handleEditFinish = (values: Partial<ICustomer>) => {
        return editFormProps.onFinish?.({ ...values, updated_by: userId });
    };

    const handleCloneFinish = (values: Partial<ICustomer>) => {
        return cloneFormProps.onFinish?.({
            ...values,
            shop_id: shopId,
            created_by: userId,
            updated_by: userId,
        });
    };

    const handleToggle = (record: ICustomer, checked: boolean) => {
        setLoadingToggles((prev) => ({ ...prev, [record.id]: true }));
        updateCustomer(
            {
                resource: "customers",
                id: record.id,
                values: { is_active: checked, updated_by: userId },
                successNotification: () => ({
                    message: checked ? "Customer activated" : "Customer deactivated",
                    type: "success",
                }),
            },
            {
                onSettled: () => {
                    setLoadingToggles((prev) => {
                        const next = { ...prev };
                        delete next[record.id];
                        return next;
                    });
                },
            }
        );
    };

    const handleDelete = (record: ICustomer) => {
        modal.confirm({
            title: "Delete customer?",
            content: (
                <>
                    <Typography.Text>
                        Permanently delete <b>{record.name}</b> ({record.customer_code})?
                        This cannot be undone.
                    </Typography.Text>
                    <br />
                    <Typography.Text type="warning">
                        Deletion will fail if invoices exist for this customer.
                    </Typography.Text>
                </>
            ),
            okText: "Delete",
            okButtonProps: { danger: true },
            onOk: () => {
                deleteCustomer(
                    { resource: "customers", id: record.id },
                    {
                        onError: () => {
                            notification.error({
                                message: "Cannot delete customer",
                                description:
                                    "This customer has invoices. Remove or reassign them first.",
                            });
                        },
                    }
                );
            },
        });
    };

    // Render
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
                    children: "New Customer",
                }}
            >
                {/* Toolbar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
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

                    {(() => {
                        const hasActive =
                            searchText !== "" ||
                            statusFilter !== "all" ||
                            filters.some((f) => "field" in f && f.field !== "shop_id");
                        return (
                            <Tooltip title="Reset all filters">
                                <Button
                                    icon={<ReloadOutlined />}
                                    size="small"
                                    type={hasActive ? "primary" : "default"}
                                    onClick={() => {
                                        setSearchText("");
                                        setStatusFilter("all");
                                        setFilters([], "replace");
                                    }}
                                >
                                    Reset Filters
                                </Button>
                            </Tooltip>
                        );
                    })()}
                </div>

                <Table
                    {...tableProps}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1320 }}
                    onChange={(pagination, _columnFilters, sorter, extra) => {
                        // Filters are managed entirely via setFilters; pass empty column
                        // filters to prevent Ant Design from re-applying them as "in"
                        // operators (which would override our "contains"/"eq" filters)
                        // every time the user sorts or changes page.
                        tableProps.onChange?.(pagination, {}, sorter, extra);
                    }}
                    onRow={(record) => ({
                        style: { cursor: "pointer" },
                        onClick: () => setShowRecord(record),
                    })}
                >
                    {/* Date */}
                    <Table.Column<ICustomer>
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

                    {/* Name + Code */}
                    <Table.Column<ICustomer>
                        key="name"
                        dataIndex="name"
                        title="Name"
                        sorter
                        width={285}
                        defaultSortOrder={getDefaultSortOrder("name", sorters)}
                        filterDropdown={makeColumnFilter("name", "Filter by name…")}
                        filterIcon={(active) => (
                            <FilterOutlined style={{ color: active ? "#1677ff" : undefined }} />
                        )}
                        render={(_: unknown, record: ICustomer) => (
                            <div>
                                <Typography.Text strong>{record.name}</Typography.Text>
                                <div style={{ marginTop: 2 }}>
                                    <Tag
                                        color="blue"
                                        style={{
                                            fontSize: 10,
                                            padding: "0 4px",
                                            fontFamily: "monospace",
                                        }}
                                    >
                                        {record.customer_code}
                                    </Tag>
                                </div>
                            </div>
                        )}
                    />

                    {/* Phone */}
                    <Table.Column<ICustomer>
                        key="phone"
                        dataIndex="phone"
                        title="Phone"
                        width={160}
                        sorter
                        defaultSortOrder={getDefaultSortOrder("phone", sorters)}
                        filterDropdown={makeColumnFilter("phone", "Filter by phone…")}
                        filterIcon={(active) => (
                            <FilterOutlined style={{ color: active ? "#1677ff" : undefined }} />
                        )}
                        render={(_: unknown, record: ICustomer) => (
                            <div>
                                <Typography.Text>{record.phone}</Typography.Text>
                                {record.alternate_phone && (
                                    <Typography.Text
                                        type="secondary"
                                        style={{ display: "block", fontSize: 11 }}
                                    >
                                        {record.alternate_phone}
                                    </Typography.Text>
                                )}
                            </div>
                        )}
                    />

                    {/* Email */}
                    <Table.Column<ICustomer>
                        key="email"
                        dataIndex="email"
                        title="Email"
                        width={200}
                        sorter
                        defaultSortOrder={getDefaultSortOrder("email", sorters)}
                        filterDropdown={makeColumnFilter("email", "Filter by email…")}
                        filterIcon={(active) => (
                            <FilterOutlined style={{ color: active ? "#1677ff" : undefined }} />
                        )}
                        render={(email: string | null) =>
                            email ? (
                                <Typography.Text>{email}</Typography.Text>
                            ) : (
                                <Typography.Text type="secondary">—</Typography.Text>
                            )
                        }
                    />

                    {/* Address – fixed width, scrollable via table x scroll */}
                    <Table.Column<ICustomer>
                        key="address"
                        dataIndex="address"
                        title="Address"
                        width={220}
                        ellipsis
                        filterDropdown={makeColumnFilter("address", "Filter by address…")}
                        filterIcon={(active) => (
                            <FilterOutlined style={{ color: active ? "#1677ff" : undefined }} />
                        )}
                    />

                    {/* Referred By */}
                    <Table.Column<ICustomer>
                        key="reference_by"
                        dataIndex="reference_by"
                        title="Referred By"
                        width={180}
                        filterDropdown={(props) => (
                            <ReferredByFilterDropdown
                                {...props}
                                shopId={shopId}
                                setFilters={setFilters}
                            />
                        )}
                        filterIcon={(active) => (
                            <FilterOutlined style={{ color: active ? "#1677ff" : undefined }} />
                        )}
                        render={(_: unknown, record: ICustomer) => {
                            if (!record.referred_customer) {
                                return (
                                    <Typography.Text type="secondary">—</Typography.Text>
                                );
                            }
                            return (
                                <Space size={4}>
                                    <span>{record.referred_customer.name}</span>
                                    <Tag
                                        color="default"
                                        style={{
                                            fontSize: 10,
                                            padding: "0 4px",
                                            fontFamily: "monospace",
                                        }}
                                    >
                                        {record.referred_customer.customer_code}
                                    </Tag>
                                </Space>
                            );
                        }}
                    />

                    {/* Active Toggle – filter via toolbar, no column sorter */}
                    <Table.Column<ICustomer>
                        key="is_active"
                        dataIndex="is_active"
                        title="Active"
                        width={80}
                        render={(_: unknown, record: ICustomer) => (
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
                    <Table.Column<ICustomer>
                        title="Actions"
                        dataIndex="actions"
                        key="actions"
                        width={130}
                        fixed="right"
                        render={(_: unknown, record: ICustomer) => (
                            <Space
                                size={4}
                                onClick={(e) => e.stopPropagation()}
                            >
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

            {/* Modals*/}
            <CustomerModal
                action="create"
                modalProps={createModalProps}
                formProps={createFormProps}
                onFinish={handleCreateFinish}
                close={closeCreate}
                shopId={shopId}
            />
            <CustomerModal
                action="edit"
                modalProps={editModalProps}
                formProps={editFormProps}
                onFinish={handleEditFinish}
                close={closeEdit}
                shopId={shopId}
                excludeCustomerId={editId as string | undefined}
            />
            <CustomerModal
                action="clone"
                modalProps={cloneModalProps}
                formProps={cloneFormProps}
                onFinish={handleCloneFinish}
                close={closeClone}
                shopId={shopId}
            />

            {/* Show Modal */}
            <CustomerShowModal
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