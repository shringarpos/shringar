import { Upload } from "antd";
import type { RcFile } from "antd/lib/upload/interface";
import { supabaseClient } from "../providers/supabase-client";
import { InboxOutlined } from "@ant-design/icons";
import { useState } from "react";

interface UploadImageToSupabaseProps {
    bucketName: string;
    onUploadSuccess?: (url: string, filePath: string) => void;
    onRemoveSuccess?: (filePath: string) => void;
    uploadText?: string;
    hintText?: string;
    iconColor?: string;
}

export function UploadImageToSupabase({
    bucketName,
    onUploadSuccess,
    onRemoveSuccess,
    uploadText = "Click or drag Image",
    hintText = "PNG, JPG, or JPEG",
    iconColor = "#667eea"
}: UploadImageToSupabaseProps) {
    const [currentFilePath, setCurrentFilePath] = useState<string | undefined>(undefined);

    return (
        <Upload.Dragger
            name="file"
            listType="picture"
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
                        onUploadSuccess?.(publicUrl, filePath);
                        onSuccess?.({ url: publicUrl }, xhr);
                    } else {
                        onError?.(new Error("Failed to get public URL"));
                    }
                } catch (error) {
                    onError?.(new Error("Upload Error"));
                }
            }}
            onRemove={() => {
                if (currentFilePath) {
                    RemoveSupabaseImage(currentFilePath, bucketName);
                    onRemoveSuccess?.(currentFilePath);
                    setCurrentFilePath(undefined);
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