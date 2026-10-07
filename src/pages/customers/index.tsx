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
import React, { useState } from "react";
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
    setSelectedKeys,
    selectedKeys,
    confirm,
    clearFilters,
    shopId,
    setFilters,
}) => {
    const { selectProps } = useSelect<ICustomer>({
        resource: "customers",
        optionLabel: "name",
        optionValue: "id",
        filters: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
    });

    return (
        <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
            <Select
                {...selectProps}
                style={{ width: 200, marginBottom: 8, display: "block" }}
                placeholder="Filter by referrer"
                value={selectedKeys[0]}
                onChange={(val) => setSelectedKeys(val ? [val] : [])}
                allowClear
            />
            <Space>
                <Button
                    type="primary"
                    size="small"
                    onClick={() => {
                        confirm();
                        setFilters(
                            selectedKeys[0]
                                ? [{ field: "reference_by", operator: "eq", value: selectedKeys[0] }]
                                : [{ field: "reference_by", operator: "eq", value: undefined }],
                            "merge"
                        );
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

const { useBreakpoint } = Grid;

export default function Customers() {
    const screens = useBreakpoint();
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
    });

    const { mutate: updateCustomer } = useUpdate<ICustomer>();
    const { mutate: deleteCustomer } = useDelete<ICustomer>();

    const { triggerExport, isLoading: isExporting } = useExport<ICustomer>({
        resource: "customers",
        filters: {
            permanent: shopId
                ? [{ field: "shop_id", operator: "eq", value: shopId }]
                : [],
        },
        mapData: (record) => ({
            "Customer Code": record.customer_code,
            Name: record.name,
            Phone: record.phone,
            Email: record.email ?? "",
            City: record.city ?? "",
            "PAN Card": record.pan_card ?? "",
            "Aadhaar Card": record.aadhaar_card ?? "",
            Status: record.is_active ? "Active" : "Inactive",
            "Created At": record.created_at,
        }),
        exportOptions: {
            filename: `customers-${dayjs().format("YYYY-MM-DD")}`,
        },
    });

    const [editingCustomer, setEditingCustomer] = useState<ICustomer | null>(null);
    const [cloningCustomer, setCloningCustomer] = useState<ICustomer | null>(null);

    const {
        modalProps,
        formProps,
        show: showCustomerModal,
        close: closeCustomerModal,
    } = useModalForm<ICustomer>({
        resource: "customers",
        action: editingCustomer ? "edit" : "create",
        id: editingCustomer?.id,
        redirect: false,
        onMutationSuccess: () => {
            setEditingCustomer(null);
            closeCustomerModal();
        },
    });

    const handleCreate = () => {
        setEditingCustomer(null);
        setCloningCustomer(null);
        formProps.form?.resetFields();
        showCustomerModal();
    };

    const handleEdit = (record: ICustomer) => {
        setEditingCustomer(record);
        setCloningCustomer(null);
        showCustomerModal(record.id);
    };

    const handleClone = (record: ICustomer) => {
        setEditingCustomer(null);
        setCloningCustomer(record);
        formProps.form?.resetFields();
        showCustomerModal();
    };

    const handleDelete = (record: ICustomer) => {
        modal.confirm({
            title: "Delete Customer",
            content: `Are you sure you want to delete "${record.name}"? This action cannot be undone.`,
            okText: "Delete",
            okType: "danger",
            cancelText: "Cancel",
            onOk: () => {
                deleteCustomer(
                    {
                        resource: "customers",
                        id: record.id,
                    },
                    {
                        onSuccess: () => {
                            notification.success({
                                message: "Customer deleted successfully",
                            });
                        },
                        onError: (error) => {
                            notification.error({
                                message: "Error deleting customer",
                                description: error?.message,
                            });
                        },
                    }
                );
            },
        });
    };

    const handleToggleActive = (record: ICustomer, checked: boolean) => {
        setLoadingToggles((prev) => ({ ...prev, [record.id]: true }));
        updateCustomer(
            {
                resource: "customers",
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
                        message: `Customer marked as ${checked ? "Active" : "Inactive"}`,
                    });
                },
                onError: (error) => {
                    setLoadingToggles((prev) => ({ ...prev, [record.id]: false }));
                    notification.error({
                        message: "Error updating customer status",
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
            title: "Customer Code",
            dataIndex: "customer_code",
            key: "customer_code",
            sorter: true,
            defaultSortOrder: getDefaultSortOrder("customer_code", sorters),
            render: (value: string, record: ICustomer) => (
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
            filterDropdown: (props: FilterDropdownProps) => (
                <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
                    <Input
                        placeholder="Search name"
                        value={props.selectedKeys[0]}
                        onChange={(e) =>
                            props.setSelectedKeys(e.target.value ? [e.target.value] : [])
                        }
                        onPressEnter={() => {
                            props.confirm();
                            setFilters(
                                props.selectedKeys[0]
                                    ? [
                                          {
                                              field: "name",
                                              operator: "contains",
                                              value: props.selectedKeys[0],
                                          },
                                      ]
                                    : [{ field: "name", operator: "contains", value: undefined }],
                                "merge"
                            );
                        }}
                        style={{ width: 188, marginBottom: 8, display: "block" }}
                    />
                    <Space>
                        <Button
                            type="primary"
                            size="small"
                            onClick={() => {
                                props.confirm();
                                setFilters(
                                    props.selectedKeys[0]
                                        ? [
                                              {
                                                  field: "name",
                                                  operator: "contains",
                                                  value: props.selectedKeys[0],
                                              },
                                          ]
                                        : [{ field: "name", operator: "contains", value: undefined }],
                                    "merge"
                                );
                            }}
                        >
                            Search
                        </Button>
                        <Button
                            size="small"
                            onClick={() => {
                                props.clearFilters?.();
                                setFilters(
                                    [{ field: "name", operator: "contains", value: undefined }],
                                    "merge"
                                );
                                props.confirm();
                            }}
                        >
                            Reset
                        </Button>
                    </Space>
                </div>
            ),
            filterIcon: (filtered: boolean) => (
                <FilterOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
            ),
        },
        {
            title: "Phone",
            dataIndex: "phone",
            key: "phone",
        },
        {
            title: "City",
            dataIndex: "city",
            key: "city",
            sorter: true,
            defaultSortOrder: getDefaultSortOrder("city", sorters),
            render: (value?: string) => value ?? "—",
        },
        {
            title: "Referred By",
            dataIndex: "referred_customer",
            key: "reference_by",
            filterDropdown: (props: FilterDropdownProps) => (
                <ReferredByFilterDropdown
                    {...props}
                    shopId={shopId}
                    setFilters={setFilters}
                />
            ),
            filterIcon: (filtered: boolean) => (
                <FilterOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
            ),
            render: (referredCustomer: { id: string; name: string; customer_code: string } | null) => {
                if (!referredCustomer) return <Typography.Text type="secondary">—</Typography.Text>;
                return (
                    <Typography.Text>
                        {referredCustomer.name}{" "}
                        <Tag
                            color="blue"
                            style={{
                                fontFamily: "monospace",
                                fontSize: 10,
                                padding: "0 5px",
                                lineHeight: "18px",
                            }}
                        >
                            {referredCustomer.customer_code}
                        </Tag>
                    </Typography.Text>
                );
            },
        },
        {
            title: "Status",
            dataIndex: "is_active",
            key: "is_active",
            render: (value: boolean, record: ICustomer) => (
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
            render: (_: unknown, record: ICustomer) => (
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
            title="Customers"
            headerButtons={[
                <ExportButton
                    key="export"
                    onClick={() => triggerExport()}
                    loading={isExporting}
                />,
                <Button key="create" type="primary" onClick={handleCreate}>
                    Create Customer
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
                    showTotal: (total) => `Total ${total} customers`,
                }}
            />

            <CustomerShowModal
                customer={showRecord}
                onClose={() => setShowRecord(null)}
            />

            <CustomerModal
                modalProps={modalProps}
                formProps={formProps}
                customer={editingCustomer}
                clonedCustomer={cloningCustomer}
                onClose={() => {
                    setEditingCustomer(null);
                    setCloningCustomer(null);
                    closeCustomerModal();
                }}
            />
        </RefineList>
    );
};
