import React, { useState, useMemo } from "react";
import {
    App,
    Button,
    Card,
    Col,
    Empty,
    Input,
    Popconfirm,
    Row,
    Space,
    Tag,
    Tooltip,
    Typography,
    theme,
} from "antd";
import {
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    FolderOpenOutlined,
    PlusOutlined,
    SearchOutlined,
} from "@ant-design/icons";
import { useDelete, useGetIdentity, useList } from "@refinedev/core";
import { useModalForm } from "@refinedev/antd";
import { useNavigate } from "react-router";
import { AlbumModal } from "../../components/design-gallery/album-modal";
import type { IDesignAlbum, IDesignPhoto } from "../../libs/interfaces";
import { Images, Sparkles } from "lucide-react";

export default function DesignGallery() {
    const { token } = theme.useToken();
    const navigate = useNavigate();
    const { message } = App.useApp();
    const { data: identity } = useGetIdentity<{ id: string }>();
    const userId = identity?.id;

    const [searchText, setSearchText] = useState("");

    // Fetch design albums
    const { query: albumsQuery } = useList<IDesignAlbum>({
        resource: "design_albums",
        sorters: [{ field: "created_at", order: "desc" }],
    });

    const isAlbumsLoading = albumsQuery.isLoading;
    const refetchAlbums = albumsQuery.refetch;
    const albums = useMemo(() => albumsQuery.data?.data || [], [albumsQuery.data]);

    // Fetch design photos for counting
    const { query: photosQuery } = useList<IDesignPhoto>({
        resource: "design_photos",
        pagination: { pageSize: 1000 },
    });

    const refetchPhotos = photosQuery.refetch;
    const photos = useMemo(() => photosQuery.data?.data || [], [photosQuery.data]);

    // Map photo counts per album
    const photoCountMap = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const p of photos) {
            counts[p.album_id] = (counts[p.album_id] || 0) + 1;
        }
        return counts;
    }, [photos]);

    // Create Modal Form
    const {
        modalProps: createModalProps,
        formProps: createFormProps,
        show: showCreate,
        close: closeCreate,
    } = useModalForm<IDesignAlbum>({
        action: "create",
        resource: "design_albums",
        warnWhenUnsavedChanges: false,
    });

    // Edit Modal Form
    const {
        modalProps: editModalProps,
        formProps: editFormProps,
        show: showEdit,
        close: closeEdit,
    } = useModalForm<IDesignAlbum>({
        action: "edit",
        resource: "design_albums",
        warnWhenUnsavedChanges: false,
    });

    const { mutate: deleteAlbum } = useDelete();

    const handleCreateFinish = async (values: Partial<IDesignAlbum>) => {
        const result = await createFormProps.onFinish?.({
            ...values,
            user_id: userId,
        });
        message.success("Album created successfully");
        closeCreate();
        refetchAlbums();
        return result;
    };

    const handleEditFinish = async (values: Partial<IDesignAlbum>) => {
        const result = await editFormProps.onFinish?.(values);
        message.success("Album updated");
        closeEdit();
        refetchAlbums();
        return result;
    };

    const handleDelete = (id: string, name: string) => {
        deleteAlbum(
            {
                resource: "design_albums",
                id,
            },
            {
                onSuccess: () => {
                    message.success(`Album "${name}" deleted`);
                    refetchAlbums();
                    refetchPhotos();
                },
            }
        );
    };

    const filteredAlbums = albums.filter((a: IDesignAlbum) =>
        a.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (a.description && a.description.toLowerCase().includes(searchText.toLowerCase()))
    );

    return (
        <div style={{ padding: "0 4px", maxWidth: "100%", overflowX: "hidden" }}>
            {/* Header Section */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 16,
                    marginBottom: 24,
                }}
            >
                <div style={{ minWidth: 260, flex: "1 1 auto" }}>
                    <Space size={8} align="center" wrap>
                        <Typography.Title level={3} style={{ margin: 0 }}>
                            Design Gallery
                        </Typography.Title>
                        <Tag color="gold" icon={<Sparkles size={13} style={{ verticalAlign: -2 }} />}>
                            Lookbook
                        </Tag>
                    </Space>
                    <Typography.Text type="secondary" style={{ display: "block", marginTop: 4 }}>
                        Showcase custom craft references, catalogs, and design inspirations to walk-in customers
                    </Typography.Text>
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <Input
                        placeholder="Search albums..."
                        prefix={<SearchOutlined style={{ color: token.colorTextSecondary }} />}
                        allowClear
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ minWidth: 150, maxWidth: 220, flex: "1 1 auto" }}
                    />
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => showCreate()}
                    >
                        Create Album
                    </Button>
                </div>
            </div>

            {/* Empty State */}
            {!isAlbumsLoading && albums.length === 0 && (
                <Card
                    style={{
                        textAlign: "center",
                        padding: "36px 16px",
                        borderRadius: 12,
                        background: token.colorBgContainer,
                        border: `1px dashed ${token.colorBorder}`,
                    }}
                >
                    <Empty
                        image={
                            <div
                                style={{
                                    display: "inline-flex",
                                    padding: 20,
                                    borderRadius: "50%",
                                    background: token.colorFillTertiary,
                                    color: token.colorWarning,
                                    marginBottom: 16,
                                }}
                            >
                                <Images size={44} strokeWidth={1.5} />
                            </div>
                        }
                        imageStyle={{ height: 84 }}
                        description={
                            <div style={{ maxWidth: 420, margin: "0 auto" }}>
                                <Typography.Title level={4} style={{ marginBottom: 8 }}>
                                    No Design Albums Yet
                                </Typography.Title>
                                <Typography.Paragraph type="secondary">
                                    Create albums categorized by jewellery types (such as Rings, Bridal Sets, or Antique Bangles) to present designs to customers without adding them to stock inventory.
                                </Typography.Paragraph>
                            </div>
                        }
                    >
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            size="large"
                            onClick={() => showCreate()}
                        >
                            Create First Album
                        </Button>
                    </Empty>
                </Card>
            )}

            {/* Search returned 0 results */}
            {!isAlbumsLoading && albums.length > 0 && filteredAlbums.length === 0 && (
                <Empty description={`No albums matching "${searchText}"`} style={{ padding: "40px 0" }} />
            )}

            {/* Albums Grid */}
            <Row gutter={[16, 16]}>
                {filteredAlbums.map((album: IDesignAlbum) => {
                    const count = photoCountMap[album.id] || 0;
                    return (
                        <Col xs={24} sm={12} md={8} lg={6} key={album.id}>
                            <Card
                                hoverable
                                style={{
                                    height: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    borderRadius: 12,
                                    overflow: "hidden",
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                }}
                                styles={{
                                    body: {
                                        padding: 16,
                                        display: "flex",
                                        flexDirection: "column",
                                        flex: 1,
                                    },
                                }}
                                cover={
                                    <div
                                        style={{
                                            position: "relative",
                                            height: 180,
                                            background: token.colorFillSecondary,
                                            overflow: "hidden",
                                            cursor: "pointer",
                                        }}
                                        onClick={() => navigate(`/design-gallery/${album.id}`)}
                                    >
                                        {album.cover_image_url ? (
                                            <img
                                                alt={album.name}
                                                src={album.cover_image_url}
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover",
                                                    transition: "transform 0.3s ease",
                                                }}
                                            />
                                        ) : (
                                            <div
                                                style={{
                                                    height: "100%",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    color: token.colorTextQuaternary,
                                                }}
                                            >
                                                <FolderOpenOutlined style={{ fontSize: 44, marginBottom: 8 }} />
                                                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                                                    {count === 0 ? "No photos yet" : `${count} designs`}
                                                </Typography.Text>
                                            </div>
                                        )}

                                        <Tag
                                            color="default"
                                            style={{
                                                position: "absolute",
                                                bottom: 10,
                                                right: 10,
                                                borderRadius: 6,
                                                backdropFilter: "blur(4px)",
                                                background: "rgba(0, 0, 0, 0.65)",
                                                color: "#fff",
                                                border: "none",
                                                fontWeight: 500,
                                            }}
                                        >
                                            {count} {count === 1 ? "design" : "designs"}
                                        </Tag>
                                    </div>
                                }
                                actions={[
                                    <Tooltip title="View Album" key="view">
                                        <Button
                                            type="text"
                                            icon={<EyeOutlined />}
                                            onClick={() => navigate(`/design-gallery/${album.id}`)}
                                            style={{ width: "100%" }}
                                        >
                                            Open
                                        </Button>
                                    </Tooltip>,
                                    <Tooltip title="Edit Album" key="edit">
                                        <Button
                                            type="text"
                                            icon={<EditOutlined />}
                                            onClick={() => showEdit(album.id)}
                                            style={{ width: "100%" }}
                                        />
                                    </Tooltip>,
                                    <Tooltip title="Delete Album" key="delete">
                                        <Popconfirm
                                            title="Delete Album"
                                            description="Are you sure you want to delete this album and its photos?"
                                            okText="Yes, Delete"
                                            cancelText="Cancel"
                                            okButtonProps={{ danger: true }}
                                            onConfirm={() => handleDelete(album.id, album.name)}
                                        >
                                            <Button
                                                type="text"
                                                danger
                                                icon={<DeleteOutlined />}
                                                style={{ width: "100%" }}
                                            />
                                        </Popconfirm>
                                    </Tooltip>,
                                ]}
                            >
                                <div
                                    onClick={() => navigate(`/design-gallery/${album.id}`)}
                                    style={{ cursor: "pointer", flex: 1 }}
                                >
                                    <Typography.Title
                                        level={5}
                                        style={{
                                            margin: "0 0 6px 0",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {album.name}
                                    </Typography.Title>
                                    <Typography.Paragraph
                                        type="secondary"
                                        ellipsis={{ rows: 2 }}
                                        style={{ fontSize: 13, marginBottom: 0 }}
                                    >
                                        {album.description || "No description provided."}
                                    </Typography.Paragraph>
                                </div>
                            </Card>
                        </Col>
                    );
                })}
            </Row>

            {/* Create & Edit Modals */}
            <AlbumModal
                action="create"
                modalProps={createModalProps}
                formProps={createFormProps}
                onFinish={handleCreateFinish}
                close={closeCreate}
            />

            <AlbumModal
                action="edit"
                modalProps={editModalProps}
                formProps={editFormProps}
                onFinish={handleEditFinish}
                close={closeEdit}
            />
        </div>
    );
}
