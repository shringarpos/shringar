import React, { useState } from "react";
import {
    ExportButton,
    List,
    getDefaultSortOrder,
    useTable,
} from "@refinedev/antd";
import type { CrudFilter, HttpError } from "@refinedev/core";
import { useCreate, useExport, useGetIdentity, useUpdate } from "@refinedev/core";
import {
    CopyOutlined,
    EditOutlined,
    EyeOutlined,
    FilterOutlined,
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
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { CustomerModal } from "../../components/customers/customer-modal";
import { CustomerShowModal } from "../../components/customers/customer-show-modal";
import { MobileCustomerList } from "../../components/customers/mobile-customer-list";
import { useShopCheck } from "../../hooks/use-shop-check";
import type { ICustomer } from "../../libs/interfaces";

interface ReferredByFilterProps extends FilterDropdownProps {
    shopId?: string;
    setFilters: (filters: CrudFilter[], behavior: "merge" | "replace") => void;
}

const ReferredByFilterDropdown: React.FC<ReferredByFilterProps> = ({
    selectedKeys,
    confirm,
    clearFilters,
    shopId: _shopId,
    setFilters,
}) => {
    return (
        <div style={{ padding: 8, minWidth: 260 }}>
            <Select<string>
                style={{ width: "100%", marginBottom: 8, display: "block" }}
                placeholder="Search referrer..."
                value={selectedKeys?.[0] as string | undefined}
                onChange={(val) => {
                    setFilters(
                        [{ field: "reference_by", operator: "eq", value: val || undefined }],
                        "merge"
                    );
                    confirm();
                }}
                allowClear
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
    const screens = Grid.useBreakpoint();
    if (!screens.md) {
        return <MobileCustomerList />;
    }
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
        pagination: {
            pageSize: 10,
        },
    });

    const { mutateAsync: updateCustomer } = useUpdate<ICustomer>();
    const { mutateAsync: createCustomer } = useCreate<ICustomer>();

    const handleFinish = async (values: Partial<ICustomer>) => {
        if (modalAction === "create" || modalAction === "clone") {
            await createCustomer({
                resource: "customers",
                values: {
                    ...values,
                    shop_id: shopId,
                    created_by: userId,
                },
            });
        } else if (editingCustomer) {
            await updateCustomer({
                resource: "customers",
                id: editingCustomer.id,
                values: {
                    ...values,
                    updated_by: userId,
                },
            });
        }
        handleModalClose();
    };

    // CSV export mapping
    const { triggerExport, isLoading: exportLoading } = useExport<ICustomer>({
        resource: "customers",
        meta: {
            select: "*, referred_customer:reference_by(name, customer_code)",
        },
        mapData: (item) => ({
            "Customer Code": item.customer_code,
            Name: item.name,
            Phone: item.phone,
            "Alternate Phone": item.alternate_phone ?? "",
            Email: item.email ?? "",
            Address: item.address,
            "Referred By": item.referred_customer
                ? `${item.referred_customer.name} (${item.referred_customer.customer_code})`
                : "",
            Status: item.is_active ? "Active" : "Inactive",
            "Created At": dayjs(item.created_at).format("YYYY-MM-DD HH:mm"),
        }),
    });

    // Modal state
    const [modalAction, setModalAction] = useState<"create" | "edit" | "clone">("create");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<ICustomer | null>(null);

    const handleCreate = () => {
        setModalAction("create");
        setEditingCustomer(null);
        setIsModalOpen(true);
    };

    const handleEdit = (customer: ICustomer) => {
        setModalAction("edit");
        setEditingCustomer(customer);
        setIsModalOpen(true);
    };

    const handleClone = (customer: ICustomer) => {
        setModalAction("clone");
        setEditingCustomer(customer);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingCustomer(null);
    };

    const handleToggleActive = (customer: ICustomer) => {
        const nextState = !customer.is_active;
        const actionLabel = nextState ? "activate" : "deactivate";

        modal.confirm({
            title: `${nextState ? "Activate" : "Deactivate"} Customer`,
            content: `Are you sure you want to ${actionLabel} "${customer.name}"?`,
            okText: "Yes",
            cancelText: "No",
            onOk: async () => {
                setLoadingToggles((prev) => ({ ...prev, [customer.id]: true }));
                try {
                    await updateCustomer({
                        resource: "customers",
                        id: customer.id,
                        values: {
                            is_active: nextState,
                            updated_by: userId,
                        },
                        successNotification: false,
                    });
                    notification.success({
                        message: "Success",
                        description: `Customer "${customer.name}" marked as ${nextState ? "Active" : "Inactive"}.`,
                    });
                } catch {
                    notification.error({
                        message: "Error",
                        description: `Failed to update status for "${customer.name}".`,
                    });
                } finally {
                    setLoadingToggles((prev) => ({ ...prev, [customer.id]: false }));
                }
            },
        });
    };

    return (
        <div style={{ padding: "0 0 24px 0" }}>
            <List
                title={<Typography.Title level={4} style={{ margin: 0 }}>Customers</Typography.Title>}
                headerButtons={() => (
                    <Space>
                        <Button type="primary" onClick={handleCreate}>
                            Add Customer
                        </Button>
                        <ExportButton
                            onClick={triggerExport}
                            loading={exportLoading}
                        />
                    </Space>
                )}
            >
                {/* Search & Filter Toolbar */}
                <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <Input.Search
                        placeholder="Search by name, phone, code..."
                        allowClear
                        value={searchText}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSearchText(val);
                            setFilters(
                                [
                                    {
                                        field: "name",
                                        operator: "contains",
                                        value: val || undefined,
                                    },
                                ],
                                "merge"
                            );
                        }}
                        style={{ maxWidth: 300 }}
                    />
                    <Radio.Group
                        value={statusFilter}
                        onChange={(e) => {
                            const val = e.target.value;
                            setStatusFilter(val);
                            if (val === "all") {
                                setFilters(
                                    [{ field: "is_active", operator: "eq", value: undefined }],
                                    "merge"
                                );
                            } else {
                                setFilters(
                                    [{ field: "is_active", operator: "eq", value: val === "active" }],
                                    "merge"
                                );
                            }
                        }}
                    >
                        <Radio.Button value="all">All</Radio.Button>
                        <Radio.Button value="active">Active</Radio.Button>
                        <Radio.Button value="inactive">Inactive</Radio.Button>
                    </Radio.Group>
                </div>

                {/* Table (inner scroll + titled ellipsis for 1366) */}
                <Table {...tableProps} rowKey="id" size="middle" scroll={{ x: 900 }}>
                    <Table.Column
                        title="Code"
                        dataIndex="customer_code"
                        key="customer_code"
                        sorter
                        defaultSortOrder={getDefaultSortOrder("customer_code", sorters)}
                        render={(code: string, record: ICustomer) => (
                            <Typography.Link onClick={() => setShowRecord(record)}>
                                {code}
                            </Typography.Link>
                        )}
                    />
                    <Table.Column
                        title="Name"
                        dataIndex="name"
                        key="name"
                        sorter
                        defaultSortOrder={getDefaultSortOrder("name", sorters)}
                    />
                    <Table.Column title="Phone" dataIndex="phone" key="phone" />
                    <Table.Column title="Address" dataIndex="address" key="address" ellipsis={{ showTitle: true }} />
                    <Table.Column
                        title="Referred By"
                        key="reference_by"
                        render={(_, record: ICustomer) =>
                            record.referred_customer ? (
                                <Tag color="blue">{record.referred_customer.name}</Tag>
                            ) : (
                                "—"
                            )
                        }
                    />
                    <Table.Column
                        title="Status"
                        dataIndex="is_active"
                        key="is_active"
                        render={(isActive: boolean, record: ICustomer) => (
                            <Switch
                                checked={isActive}
                                loading={loadingToggles[record.id]}
                                onChange={() => handleToggleActive(record)}
                                checkedChildren="Active"
                                unCheckedChildren="Inactive"
                            />
                        )}
                    />
                    <Table.Column
                        title="Actions"
                        key="actions"
                        render={(_, record: ICustomer) => (
                            <Space size="small">
                                <Tooltip title="View Details">
                                    <Button
                                        icon={<EyeOutlined />}
                                        size="small"
                                        onClick={() => setShowRecord(record)}
                                    />
                                </Tooltip>
                                <Tooltip title="Edit Customer">
                                    <Button
                                        icon={<EditOutlined />}
                                        size="small"
                                        onClick={() => handleEdit(record)}
                                    />
                                </Tooltip>
                                <Tooltip title="Clone Customer">
                                    <Button
                                        icon={<CopyOutlined />}
                                        size="small"
                                        onClick={() => handleClone(record)}
                                    />
                                </Tooltip>
                            </Space>
                        )}
                    />
                </Table>
            </List>

            {/* Customer Detail Modal */}
            <CustomerShowModal
                open={!!showRecord}
                record={showRecord}
                onClose={() => setShowRecord(null)}
                onEdit={() => {
                    const r = showRecord;
                    setShowRecord(null);
                    if (r) handleEdit(r);
                }}
            />

            {/* Create / Edit / Clone Modal */}
            <CustomerModal
                action={modalAction}
                modalProps={{
                    open: isModalOpen,
                    onCancel: handleModalClose,
                }}
                formProps={{
                    initialValues: editingCustomer ?? undefined,
                }}
                onFinish={handleFinish}
                shopId={shopId}
                close={handleModalClose}
            />
        </div>
    );
};
