import React, { useEffect, useState } from "react";
import { Col, Form, Input, Modal, Row, Switch } from "antd";
import type { FormProps, ModalProps } from "antd";
import type { ICategory } from "../../../libs/interfaces";
import { UploadImageToSupabase } from "../../upload-image";

interface CategoryModalProps {
    action: "create" | "edit" | "clone";
    modalProps: ModalProps;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formProps: FormProps<any>;
    onFinish: (values: Partial<ICategory>) => Promise<any>;
    close: () => void;
}

const BUCKET_NAME = "category-images";

const actionTitles: Record<string, string> = {
    create: "Create Category",
    edit: "Edit Category",
    clone: "Clone Category",
};

export const CategoryModal: React.FC<CategoryModalProps> = ({
    action,
    modalProps,
    formProps,
    onFinish,
    close: _close,
}) => {
    const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

    // Sync image when modal opens (pre-populate for edit/clone)
    useEffect(() => {
        if (modalProps.open) {
            setImageUrl(formProps.initialValues?.image_url ?? undefined);
        } else {
            setImageUrl(undefined);
        }
    }, [modalProps.open, formProps.initialValues?.image_url]);

    const handleFinish = async (values: Partial<ICategory>) => {
        await onFinish({ ...values, image_url: imageUrl ?? null });
    };

    return (
        <Modal
            {...modalProps}
            title={actionTitles[action] ?? "Category"}
            destroyOnHidden
        >
            <Form
                {...formProps}
                layout="vertical"
                onFinish={handleFinish}
            >
                <Row gutter={[16, 0]}>
                    <Col span={16}>
                        <Form.Item
                            label="Name"
                            name="name"
                            rules={[{ required: true, message: "Please enter a category name" }]}
                        >
                            <Input placeholder="e.g. Rings, Necklaces, Bracelets" />
                        </Form.Item>

                        <Form.Item label="Description" name="description">
                            <Input.TextArea
                                rows={5}
                                placeholder="Short description of this category"
                                showCount
                                maxLength={300}
                            />
                        </Form.Item>
                    </Col>

                    <Col span={8}>
                        <Form.Item label="Image" style={{ marginBottom: 0 }}>
                            <UploadImageToSupabase
                                bucketName={BUCKET_NAME}
                                onUploadSuccess={(url) => setImageUrl(url)}
                                onRemoveSuccess={() => setImageUrl(undefined)}
                                defaultImageUrl={imageUrl}
                                uploadText="Click or drag image"
                                hintText="PNG, JPG, JPEG"
                            />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
};
