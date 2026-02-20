import { Upload, Button } from "antd";
import type { RcFile } from "antd/lib/upload/interface";
import { supabaseClient } from "../providers/supabase-client";
import { InboxOutlined, DeleteOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";

interface UploadImageToSupabaseProps {
    bucketName: string;
    onUploadSuccess?: (url: string, filePath: string) => void;
    onRemoveSuccess?: (filePath: string) => void;
    uploadText?: string;
    hintText?: string;
    iconColor?: string;
    defaultImageUrl?: string;
}

export function UploadImageToSupabase({
    bucketName,
    onUploadSuccess,
    onRemoveSuccess,
    uploadText = "Click or drag Image",
    hintText = "PNG, JPG, or JPEG",
    iconColor = "#667eea",
    defaultImageUrl
}: UploadImageToSupabaseProps) {
    const [currentFilePath, setCurrentFilePath] = useState<string | undefined>(undefined);
    const [previewUrl, setPreviewUrl] = useState<string | undefined>(defaultImageUrl);

    useEffect(() => {
        setPreviewUrl(defaultImageUrl);
    }, [defaultImageUrl]);

    const handleRemove = async () => {
        if (currentFilePath) {
            await RemoveSupabaseImage(currentFilePath, bucketName);
        }
        setPreviewUrl(undefined);
        setCurrentFilePath(undefined);
        onRemoveSuccess?.(currentFilePath || "");
    };

    // If there's a preview URL, show the image preview
    if (previewUrl !== undefined) {
        return (
            <div style={{
                border: "2px dashed #d9d9d9",
                borderRadius: "8px",
                padding: "16px",
                textAlign: "center",
                position: "relative",
                minHeight: "200px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center"
            }}>
                <img
                    src={previewUrl}
                    alt="Preview"
                    style={{
                        maxWidth: "100%",
                        maxHeight: "180px",
                        objectFit: "contain",
                        marginBottom: "12px"
                    }}
                />
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <Upload
                        name="file"
                        showUploadList={false}
                        customRequest={async ({ file, onError, onSuccess }) => {
                            try {
                                const rcFile = file as RcFile;
                                const filePath = `public/${Date.now()}_${rcFile.name}`;

                                // Remove old file if exists
                                if (currentFilePath) {
                                    await RemoveSupabaseImage(currentFilePath, bucketName);
                                }

                                // Upload the new image to Supabase
                                const uploadError = await UploadSupabaseImage(rcFile, filePath, bucketName);
                                
                                if (uploadError) {
                                    onError?.(new Error("Upload Error"));
                                    return;
                                }

                                // Get the public URL
                                const publicUrl = GetSupabaseImagePublicUrl(filePath, bucketName);
                                const xhr = new XMLHttpRequest();

                                if (publicUrl) {
                                    setCurrentFilePath(filePath);
                                    setPreviewUrl(publicUrl);
                                    onUploadSuccess?.(publicUrl, filePath);
                                    onSuccess?.({ url: publicUrl }, xhr);
                                } else {
                                    onError?.(new Error("Failed to get public URL"));
                                }
                            } catch (error) {
                                onError?.(new Error("Upload Error"));
                            }
                        }}
                    >
                        <Button type="default" size="small">
                            Change
                        </Button>
                    </Upload>
                    <Button
                        type="default"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={handleRemove}
                    >
                        Remove
                    </Button>
                </div>
            </div>
        );
    }

    // Otherwise, show the upload dragger
    return (
        <Upload.Dragger
            name="file"
            listType="picture"
            showUploadList={false}
            maxCount={1}
            customRequest={async ({ file, onError, onSuccess }) => {
                try {
                    const rcFile = file as RcFile;
                    const filePath = `public/${Date.now()}_${rcFile.name}`;

                    // Upload the image to Supabase
                    const uploadError = await UploadSupabaseImage(rcFile, filePath, bucketName);
                    
                    if (uploadError) {
                        onError?.(new Error("Upload Error"));
                        return;
                    }

                    // Get the public URL
                    const publicUrl = GetSupabaseImagePublicUrl(filePath, bucketName);
                    const xhr = new XMLHttpRequest();

                    if (publicUrl) {
                        setCurrentFilePath(filePath);
                        setPreviewUrl(publicUrl);
                        onUploadSuccess?.(publicUrl, filePath);
                        onSuccess?.({ url: publicUrl }, xhr);
                    } else {
                        onError?.(new Error("Failed to get public URL"));
                    }
                } catch (error) {
                    onError?.(new Error("Upload Error"));
                }
            }}
        >
            <div style={{ textAlign: 'center', padding: '0px' }}>
                <p className="ant-upload-drag-icon">
                    <InboxOutlined style={{ color: iconColor, fontSize: "48px" }} />
                </p>
                <p className="ant-upload-text" style={{ fontSize: '14px' }}>
                    {uploadText}
                </p>
                <p className="ant-upload-hint" style={{ fontSize: '12px' }}>
                    {hintText}
                </p>
            </div>
        </Upload.Dragger>
    );
}

export const RemoveSupabaseImage = async (filePath: string, bucketName: string) => {
    await supabaseClient.storage
        .from(bucketName)
        .remove([filePath]);
}

export const UploadSupabaseImage = async (file: RcFile, filePath: string, bucketName: string) => {
    const { error: uploadError } = await supabaseClient.storage
        .from(bucketName)
        .upload(filePath, file, {
            cacheControl: "3600",
            upsert: true,
        });

    return uploadError;
}

export const GetSupabaseImagePublicUrl = (filePath: string, bucketName: string): string => {
    const { data } = supabaseClient.storage
        .from(bucketName)
        .getPublicUrl(filePath);
    
    return data?.publicUrl;
}