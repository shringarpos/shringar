import React, { useState, useMemo } from "react";
import {
    App,
    Breadcrumb,
    Button,
    Card,
    Col,
    Empty,
    Image,
    Modal,
    Popconfirm,
    Progress,
    Row,
    Space,
    Tag,
    Typography,
    Upload,
    theme,
} from "antd";
import {
    ArrowLeftOutlined,
    DeleteOutlined,
    InboxOutlined,
    PlusOutlined,
    PlayCircleOutlined,
    EyeOutlined,
} from "@ant-design/icons";
import { useCreate, useDelete, useGetIdentity, useOne, useList } from "@refinedev/core";
import { useNavigate, useParams } from "react-router";
import type { IDesignAlbum, IDesignPhoto } from "../../libs/interfaces";
import { uploadDesignPhoto, deleteDesignPhoto } from "../../utils/gallery-storage";
import { Sparkles, Image as ImageIcon } from "lucide-react";

export default function AlbumShow() {
    const { id: albumId } = useParams<{ id: string }>();
    const { token } = theme.useToken();
    const navigate = useNavigate();
    const { message } = App.useApp();
    const { data: identity } = useGetIdentity<{ id: string }>();
    const userId = identity?.id;

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewCurrentIndex, setPreviewCurrentIndex] = useState(0);

    // Fetch Album Details
    const { query: albumQuery } = useOne<IDesignAlbum>({
        resource: "design_albums",
        id: albumId || "",
        queryOptions: { enabled: !!albumId },
    });

    const album = albumQuery.data?.data;

    // Fetch Photos in this album
    const { query: photosQuery } = useList<IDesignPhoto>({
        resource: "design_photos",
        filters: [
            {
                field: "album_id",
                operator: "eq",
                value: albumId,
            },
        ],
        sorters: [{ field: "created_at", order: "desc" }],
        queryOptions: { enabled: !!albumId },
    });

    const isPhotosLoading = photosQuery.isLoading;
    const refetchPhotos = photosQuery.refetch;
    const photos = useMemo(() => photosQuery.data?.data || [], [photosQuery.data]);

    const { mutateAsync: createPhotoRecord } = useCreate<IDesignPhoto>();
    const { mutate: deletePhotoRecord } = useDelete();

    // Batch Upload Handler
    const handleBatchUpload = async (fileList: File[]) => {
        if (!albumId || !userId || fileList.length === 0) return;

        setUploading(true);
        setUploadProgress(0);
        let completed = 0;
        let hasError = false;

        for (const file of fileList) {
            try {
                const { publicUrl, storagePath } = await uploadDesignPhoto(file, albumId);

                await createPhotoRecord({
                    resource: "design_photos",
                    values: {
                        album_id: albumId,
                        user_id: userId,
                        image_url: publicUrl,
                        storage_path: storagePath,
                        title: file.name.replace(/\.[^/.]+$/, ""),
                    },
                });

                completed++;
                setUploadProgress(Math.round((completed / fileList.length) * 100));
            } catch (err: any) {
                console.error("Upload error for file:", file.name, err);
                hasError = true;
            }
        }

        setUploading(false);
        setIsUploadModalOpen(false);
        refetchPhotos();

        if (hasError) {
            message.warning(`Uploaded ${completed} of ${fileList.length} photos. Some failed.`);
        } else {
            message.success(`Successfully uploaded ${completed} ${completed === 1 ? "design photo" : "design photos"}!`);
        }
    };

    // Delete single photo
    const handleDeletePhoto = async (photo: IDesignPhoto) => {
        try {
            await deleteDesignPhoto(photo.storage_path);
            deletePhotoRecord(
                {
                    resource: "design_photos",
                    id: photo.id,
                },
                {
                    onSuccess: () => {
                        message.success("Photo removed from album");
                        refetchPhotos();
                    },
                }
            );
        } catch (err) {
            message.error("Failed to delete photo");
        }
    };

    return (
        <div style={{ padding: "0 4px", maxWidth: "100%", overflowX: "hidden" }}>
            {/* Breadcrumb Navigation */}
            <Breadcrumb
                style={{ marginBottom: 16 }}
                items={[
                    {
                        title: (
                            <span
                                onClick={() => navigate("/design-gallery")}
                                style={{ cursor: "pointer", color: token.colorTextSecondary }}
                            >
                                <ArrowLeftOutlined style={{ marginRight: 6 }} />
                                Design Gallery
                            </span>
                        ),
                    },
                    {
                        title: <span>{album?.name || "Album Details"}</span>,
                    },
                ]}
            />

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
                <div>
                    <Space size={8} align="center">
                        <Typography.Title level={3} style={{ margin: 0 }}>
                            {album?.name || "Design Album"}
                        </Typography.Title>
                        <Tag color="gold" icon={<Sparkles size={13} style={{ verticalAlign: -2 }} />}>
                            {photos.length} {photos.length === 1 ? "Design" : "Designs"}
                        </Tag>
                    </Space>
                    {album?.description && (
                        <Typography.Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0 }}>
                            {album.description}
                        </Typography.Paragraph>
                    )}
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <Button
                        icon={<PlayCircleOutlined />}
                        disabled={photos.length === 0}
                        onClick={() => {
                            setPreviewCurrentIndex(0);
                            setPreviewVisible(true);
                        }}
                    >
                        Customer Presentation
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsUploadModalOpen(true)}
                    >
                        Upload Designs
                    </Button>
                </div>
            </div>

            {/* Empty State */}
            {!isPhotosLoading && photos.length === 0 && (
                <Card
                    style={{
                        textAlign: "center",
                        padding: "48px 24px",
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
                                    padding: 24,
                                    borderRadius: "50%",
                                    background: token.colorFillTertiary,
                                    color: token.colorWarning,
                                    marginBottom: 16,
                                }}
                            >
                                <ImageIcon size={48} strokeWidth={1.5} />
                            </div>
                        }
                        imageStyle={{ height: 96 }}
                        description={
                            <div style={{ maxWidth: 440, margin: "0 auto" }}>
                                <Typography.Title level={4} style={{ marginBottom: 8 }}>
                                    No Designs in this Album Yet
                                </Typography.Title>
                                <Typography.Paragraph type="secondary">
                                    Upload photos of custom crafted pieces, catalog styles, or craft references to showcase to your walk-in clients.
                                </Typography.Paragraph>
                            </div>
                        }
                    >
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            size="large"
                            onClick={() => setIsUploadModalOpen(true)}
                        >
                            Upload Design Photos
                        </Button>
                    </Empty>
                </Card>
            )}

            {/* Photos Showcase Grid with Lightbox */}
            <Image.PreviewGroup
                preview={{
                    visible: previewVisible,
                    current: previewCurrentIndex,
                    onVisibleChange: (vis) => setPreviewVisible(vis),
                    onChange: (current) => setPreviewCurrentIndex(current),
                }}
            >
                <Row gutter={[16, 16]}>
                    {photos.map((photo: IDesignPhoto, index: number) => (
                        <Col xs={12} sm={8} md={6} lg={4} key={photo.id}>
                            <Card
                                hoverable
                                style={{
                                    borderRadius: 10,
                                    overflow: "hidden",
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    position: "relative",
                                }}
                                styles={{ body: { padding: 8 } }}
                                cover={
                                    <div
                                        style={{
                                            position: "relative",
                                            height: 200,
                                            background: token.colorFillSecondary,
                                            overflow: "hidden",
                                        }}
                                    >
                                        <Image
                                            src={photo.image_url}
                                            alt={photo.title || "Design"}
                                            style={{
                                                width: "100%",
                                                height: 200,
                                                objectFit: "cover",
                                            }}
                                            preview={{
                                                mask: (
                                                    <Space>
                                                        <EyeOutlined /> View
                                                    </Space>
                                                ),
                                            }}
                                            onClick={() => {
                                                setPreviewCurrentIndex(index);
                                                setPreviewVisible(true);
                                            }}
                                        />

                                        {/* Delete Button on Hover */}
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: 6,
                                                right: 6,
                                                zIndex: 2,
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Popconfirm
                                                title="Delete Photo"
                                                description="Remove this photo from the album?"
                                                okText="Delete"
                                                cancelText="Cancel"
                                                okButtonProps={{ danger: true }}
                                                onConfirm={() => handleDeletePhoto(photo)}
                                            >
                                                <Button
                                                    size="small"
                                                    danger
                                                    type="primary"
                                                    icon={<DeleteOutlined />}
                                                    style={{
                                                        borderRadius: 6,
                                                        opacity: 0.85,
                                                    }}
                                                />
                                            </Popconfirm>
                                        </div>
                                    </div>
                                }
                            >
                                <Typography.Text
                                    ellipsis
                                    style={{
                                        display: "block",
                                        fontSize: 12,
                                        color: token.colorTextSecondary,
                                        textAlign: "center",
                                    }}
                                >
                                    {photo.title || "Jewellery Design"}
                                </Typography.Text>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </Image.PreviewGroup>

            {/* Batch Upload Modal */}
            <Modal
                title="Upload Design Photos"
                open={isUploadModalOpen}
                onCancel={() => !uploading && setIsUploadModalOpen(false)}
                footer={null}
                destroyOnClose
            >
                <div style={{ padding: "16px 0" }}>
                    <Upload.Dragger
                        multiple
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        beforeUpload={(_, fileList) => {
                            // Extract raw File objects and initiate batch upload
                            const rawFiles = fileList as unknown as File[];
                            handleBatchUpload(rawFiles);
                            return false; // Prevent automatic antd post request
                        }}
                        showUploadList={false}
                        disabled={uploading}
                        style={{
                            padding: 24,
                            borderRadius: 8,
                            background: token.colorFillAlter,
                        }}
                    >
                        <p className="ant-upload-drag-icon" style={{ marginBottom: 12 }}>
                            <InboxOutlined style={{ fontSize: 48, color: token.colorPrimary }} />
                        </p>
                        <Typography.Title level={5} style={{ marginBottom: 6 }}>
                            Click or drag reference photos to this area
                        </Typography.Title>
                        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                            Upload single or multiple images (PNG, JPG, WEBP). Photos will be stored in your dedicated design gallery.
                        </Typography.Text>
                    </Upload.Dragger>

                    {uploading && (
                        <div style={{ marginTop: 20 }}>
                            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 6 }}>
                                Uploading photos to Design Gallery... {uploadProgress}%
                            </Typography.Text>
                            <Progress percent={uploadProgress} status="active" />
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
