import { List as RefineList, useModalForm, useSimpleList } from "@refinedev/antd";
import { useDelete, useGetIdentity, useGo, useUpdate } from "@refinedev/core";
import type { CrudFilter, HttpError } from "@refinedev/core";
import {
    AppstoreOutlined,
    CopyOutlined,
    DeleteOutlined,
    EditOutlined,
} from "@ant-design/icons";
import {
    App,
    Card,
    Input,
    List,
    Radio,
    Space,
    Switch,
    Tag,
    Tooltip,
    Typography,
} from "antd";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import React, { useState } from "react";
import { CategoryModal } from "../../../components/inventory/categories/category-modal";
import { useShopCheck } from "../../../hooks/use-shop-check";
import type { ICategory } from "../../../libs/interfaces";

dayjs.extend(relativeTime);

export default function Categories() {
    return <CategoryList />;
}

const CategoryList: React.FC = () => {
    const { notification, modal } = App.useApp();
    const { shops } = useShopCheck();
    const shopId = shops?.[0]?.id;

    const { data: identity } = useGetIdentity<{ id: string }>();
    const userId = identity?.id;

    const go = useGo();
    const { mutate: deleteCategory } = useDelete();
    const { mutate: updateCategory, mutation: updateMutation } = useUpdate<ICategory>();
    const isUpdating = updateMutation.isPending;

    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [searchText, setSearchText] = useState("");

    const applyFilters = (text: string, status: "all" | "active" | "inactive") => {
        const filters: CrudFilter[] = [];
        if (text) {
            filters.push({ field: "name", operator: "contains", value: text });
        }
        if (status !== "all") {
            filters.push({ field: "is_active", operator: "eq", value: status === "active" });
        }
        setFilters(filters, "replace");
    };

    const { listProps, setFilters } = useSimpleList<
        ICategory,
        HttpError
    >({
        resource: "ornament_categories",
        sorters: {
            initial: [{ field: "created_at", order: "desc" }],
        },
        filters: {
            permanent: shopId
                ? [{ field: "shop_id", operator: "eq", value: shopId }]
                : [],
        },
        syncWithLocation: true,
        queryOptions: { enabled: !!shopId },
        pagination: { pageSize: 12 },
    });

    const {
        modalProps: createModalProps,
        formProps: createFormProps,
        show: showCreate,
        close: closeCreate,
    } = useModalForm<ICategory>({
        action: "create",
        resource: "ornament_categories",
        warnWhenUnsavedChanges: true,
        syncWithLocation: { key: "create-category", syncId: false },
    });

    const {
        modalProps: editModalProps,
        formProps: editFormProps,
        show: showEdit,
        close: closeEdit,
    } = useModalForm<ICategory>({
        action: "edit",
        resource: "ornament_categories",
        warnWhenUnsavedChanges: true,
        syncWithLocation: { key: "edit-category", syncId: true },
    });

    const {
        modalProps: cloneModalProps,
        formProps: cloneFormProps,
        show: showClone,
        close: closeClone,
    } = useModalForm<ICategory>({
        action: "clone",
        resource: "ornament_categories",
        warnWhenUnsavedChanges: true,
        syncWithLocation: { key: "clone-category", syncId: true },
    });

    const handleCreateFinish = async (values: Partial<ICategory>) => {
        return createFormProps.onFinish?.({
            ...values,
            shop_id: shopId,
            created_by: userId,
            updated_by: userId,
            is_active: true,
        });
    };

    const handleEditFinish = async (values: Partial<ICategory>) => {
        return editFormProps.onFinish?.({ ...values, updated_by: userId });
    };

    const handleCloneFinish = async (values: Partial<ICategory>) => {
        return cloneFormProps.onFinish?.({
            ...values,
            shop_id: shopId,
            created_by: userId,
            updated_by: userId,
            is_active: true,
        });
    };

    const handleToggle = (record: ICategory, checked: boolean) => {
        updateCategory({
            resource: "ornament_categories",
            id: record.id,
            values: { is_active: checked, updated_by: userId },
            successNotification: () => ({
                message: checked ? "Category activated" : "Category deactivated",
                type: "success",
            }),
        });
    };

    const handleDelete = (record: ICategory) => {
        modal.confirm({
            title: "Delete category?",
            content: (
                <>
                    <Typography.Text>
                        Permanently delete <b>{record.name}</b>? This cannot be undone.
                    </Typography.Text>
                    <br />
                    <Typography.Text type="warning">
                        Deletion will fail if ornaments are assigned to this category.
                    </Typography.Text>
                </>
            ),
            okText: "Delete",
            okButtonProps: { danger: true },
            onOk: () => {
                deleteCategory(
                    { resource: "ornament_categories", id: record.id },
                    {
                        onError: () => {
                            notification.error({
                                message: "Cannot delete category",
                                description:
                                    "This category has ornaments. Remove or reassign them first.",
                            });
                        },
                    }
                );
            },
        });
    };

    const handleViewOrnaments = (record: ICategory) => {
        go({
            to: { resource: "ornaments", action: "list" },
            query: {
                filters: [
                    { field: "category_id", operator: "eq", value: record.id },
                ],
            },
            type: "push",
        });
    };

    const handleStatusFilter = (value: "all" | "active" | "inactive") => {
        setStatusFilter(value);
        applyFilters(searchText, value);
    };

    return (
        <>
            <RefineList
                createButtonProps={{
                    onClick: () => showCreate(),
                    children: "New Category",
                }}
            >
                {/* Toolbar */}
                <Space style={{ marginBottom: 16, flexWrap: "wrap" }}>
                    <Input.Search
                        placeholder="Search by name…"
                        allowClear
                        style={{ width: 220 }}
                        onSearch={(value) => {
                            setSearchText(value);
                            applyFilters(value, statusFilter);
                        }}
                        onChange={(e) => {
                            if (!e.target.value) {
                                setSearchText("");
                                applyFilters("", statusFilter);
                            }
                        }}
                    />

                    <Radio.Group
                        value={statusFilter}
                        onChange={(e) => handleStatusFilter(e.target.value)}
                        optionType="button"
                        buttonStyle="solid"
                        size="small"
                    >
                        <Radio.Button value="all">All</Radio.Button>
                        <Radio.Button value="active">Active</Radio.Button>
                        <Radio.Button value="inactive">Inactive</Radio.Button>
                    </Radio.Group>
                </Space>

                {/* Card grid */}
                <List
                    {...listProps}
                    grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 4 }}
                    renderItem={(item: ICategory) => (
                        <List.Item>
                            <CategoryCard
                                record={item}
                                isUpdating={isUpdating}
                                onEdit={() => showEdit(item.id)}
                                onClone={() => showClone(item.id)}
                                onDelete={() => handleDelete(item)}
                                onToggle={(checked) => handleToggle(item, checked)}
                                onCardClick={() => handleViewOrnaments(item)}
                            />
                        </List.Item>
                    )}
                />
            </RefineList>

            {/* Modals */}
            <CategoryModal
                action="create"
                modalProps={createModalProps}
                formProps={createFormProps}
                onFinish={handleCreateFinish}
                close={closeCreate}
            />
            <CategoryModal
                action="edit"
                modalProps={editModalProps}
                formProps={editFormProps}
                onFinish={handleEditFinish}
                close={closeEdit}
            />
            <CategoryModal
                action="clone"
                modalProps={cloneModalProps}
                formProps={cloneFormProps}
                onFinish={handleCloneFinish}
                close={closeClone}
            />
        </>
    );
};

interface CategoryCardProps {
    record: ICategory;
    isUpdating: boolean;
    onEdit: () => void;
    onClone: () => void;
    onDelete: () => void;
    onToggle: (checked: boolean) => void;
    onCardClick: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
    record,
    isUpdating,
    onEdit,
    onClone,
    onDelete,
    onToggle,
    onCardClick,
}) => {
    const coverImage = record.image_url ? (
        <img
            alt={record.name}
            src={record.image_url}
            style={{ height: 160, objectFit: "cover", width: "100%" }}
        />
    ) : (
        <div
            style={{
                height: 160,
                background: "#f5f5f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <AppstoreOutlined style={{ fontSize: 48, color: "#bfbfbf" }} />
        </div>
    );

    return (
        <Card
            hoverable
            cover={coverImage}
            onClick={onCardClick}
            style={{ cursor: "pointer" }}
            styles={{ body: { padding: "12px 16px" } }}
            actions={[
                <Tooltip title="Edit" key="edit">
                    <EditOutlined
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    />
                </Tooltip>,
                <Tooltip title="Clone" key="clone">
                    <CopyOutlined
                        onClick={(e) => { e.stopPropagation(); onClone(); }}
                    />
                </Tooltip>,
                <Tooltip title="Delete" key="delete">
                    <DeleteOutlined
                        style={{ color: "#ff4d4f" }}
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    />
                </Tooltip>,
            ]}
        >
            {/* Name + toggle */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 4,
                }}
            >
                <Typography.Text strong ellipsis style={{ flex: 1, marginRight: 8 }}>
                    {record.name}
                </Typography.Text>
                <div onClick={(e) => e.stopPropagation()}>
                    <Switch
                        size="small"
                        checked={record.is_active}
                        loading={isUpdating}
                        onChange={onToggle}
                    />
                </div>
            </div>

            {/* Description */}
            <Typography.Text
                type="secondary"
                style={{ fontSize: 12, display: "block", minHeight: 36 }}
                ellipsis={{ tooltip: record.description ?? "" }}
            >
                {record.description || (
                    <span style={{ color: "#bfbfbf" }}>No description</span>
                )}
            </Typography.Text>

            {/* Status tag + last updated */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 8,
                }}
            >
                <Tag color={record.is_active ? "success" : "default"} style={{ margin: 0 }}>
                    {record.is_active ? "Active" : "Inactive"}
                </Tag>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    {dayjs(record.updated_at).fromNow()}
                </Typography.Text>
            </div>
        </Card>
    );
};