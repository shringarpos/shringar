import React, { useEffect, useState } from "react";
import { Col, Form, Grid, Input, Modal, Row } from "antd";
import type { FormProps, ModalProps } from "antd";
import type { IDesignAlbum } from "../../libs/interfaces";
import { UploadImageToSupabase } from "../upload-image";
import { DESIGN_GALLERY_BUCKET } from "../../utils/gallery-storage";

interface AlbumModalProps {
    action: "create" | "edit";
    modalProps: ModalProps;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formProps: FormProps<any>;
    onFinish: (values: Partial<IDesignAlbum>) => Promise<any>;
    close: () => void;
}

const actionTitles: Record<string, string> = {
    create: "Create Design Album",
    edit: "Edit Design Album",
};

export const AlbumModal: React.FC<AlbumModalProps> = ({
    action,
    modalProps,
    formProps,
    onFinish,
    close: _close,
}) => {
    const screens = Grid.useBreakpoint();
    const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (modalProps.open) {
            setCoverUrl(formProps.initialValues?.cover_image_url ?? undefined);
        } else {
            setCoverUrl(undefined);
        }
    }, [modalProps.open, formProps.initialValues?.cover_image_url]);

    const handleFinish = async (values: Partial<IDesignAlbum>) => {
        await onFinish({
            ...values,
            cover_image_url: coverUrl ?? null,
        });
    };

    return (
        <Modal
            {...modalProps}
            title={actionTitles[action] ?? "Design Album"}
            destroyOnHidden
            width={screens.sm ? 540 : "96%"}
            okText={action === "edit" ? "Save Changes" : "Create Album"}
        >
            <Form
                {...formProps}
                layout="vertical"
                onFinish={handleFinish}
            >
                <Row gutter={[16, 0]}>
                    <Col span={screens.xs ? 24 : 15}>
                        <Form.Item
                            label="Category / Album Name"
                            name="name"
                            rules={[
                                { required: true, message: "Please enter an album name" },
                                { whitespace: true, message: "Name cannot be empty" },
                                { min: 2, message: "Name must be at least 2 characters" },
                            ]}
                        >
                            <Input placeholder="e.g. Solitaire Rings, Bridal Chokers, Antique Kadas" />
                        </Form.Item>

                        <Form.Item label="Description (Optional)" name="description">
                            <Input.TextArea
                                rows={4}
                                placeholder="Notes on craft, purity, reference catalogs..."
                                showCount
                                maxLength={300}
                            />
                        </Form.Item>
                    </Col>

                    <Col span={screens.xs ? 24 : 9}>
                        <Form.Item label="Cover Photo" style={{ marginBottom: 0 }}>
                            <UploadImageToSupabase
                                bucketName={DESIGN_GALLERY_BUCKET}
                                onUploadSuccess={(url) => setCoverUrl(url)}
                                onRemoveSuccess={() => setCoverUrl(undefined)}
                                defaultImageUrl={coverUrl}
                                uploadText="Cover Image"
                                hintText="JPG or PNG"
                            />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
};
