import { useForm } from "@refinedev/antd";
import { useGetIdentity } from "@refinedev/core";
import { useNavigate } from "react-router";
import { IShop } from "../../libs/interfaces";
import { Button, Card, Col, Form, Input, Row, Space, Typography, Upload, message } from "antd";
import { StoreIcon } from "lucide-react";
import type { RcFile } from "antd/lib/upload/interface";
import { supabaseClient } from "../../providers/supabase-client";
import { InboxOutlined } from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

export default function ShopSetup() {
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity<{ id: string }>();

  const { formProps, saveButtonProps, onFinish } = useForm<IShop>({
    action: "create",
    resource: "shops",
    redirect: "list",
    onMutationSuccess: () => {
      navigate("/dashboard");
    },
  });

  const handleFinish = async (values: any) => {
    try {
      const shopData: Partial<IShop> = {
        user_id: identity?.id,
        code: values.code,
        name: values.name,
        address: values.address,
        phone: values.phone,
        email: values.email || null,
        gst_number: values.gst_number || null,
        logo_url: values.logo_url?.[0]?.url || null,
        created_by: identity?.id,
        updated_by: identity?.id,
      };

      await onFinish(shopData);
    } catch (error) {
      console.error("Error creating shop: ", error);
    }
  };

  const normalizeFile = (e: any) => {
    if (Array.isArray(e)) {
      return e;
    }
    return e?.fileList;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "40px 20px",
      }}
    >

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: "24px", marginRight: "40px"}}>
        <StoreIcon
          size={200}
          style={{
            marginBottom: "8px",
          }}
        />
        <Title level={2} style={{ marginBottom: "8px" }}>
          Welcome to Shringar POS
        </Title>
        <Paragraph
          style={{
            fontSize: "16px",
            marginBottom: 0,
          }}
        >
          Let's set up your jewelry shop to get started
        </Paragraph>
      </div>

      <Card
        style={{
          maxWidth: "1000px",
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          borderRadius: "16px",
        }}
      >
        <Space direction="vertical" size={"large"} style={{ width: "100%" }}>
          {/* Form */}
          <Form
            {...formProps}
            layout="vertical"
            onFinish={handleFinish}
            size="large"
            requiredMark="optional"
            style={{ marginBottom: 12}}
          >
            <Row gutter={[16, 16]}>
              <Col span={16}>
                <Row gutter={[16, 16]}>
                  <Col span={15}>
                    {/* Shop Name */}
                    <Form.Item
                      label={<Text strong>Shop Name</Text>}
                      name={"name"}
                      rules={[
                        { required: true, message: "Please enter shop name" },
                        { max: 200, message: "Name must be 200 characters or less" },
                      ]}
                      style={{ marginBottom: 8 }}
                    >
                      <Input placeholder="Enter your shop name" />
                    </Form.Item>
                  </Col>
                  <Col span={9}>
                    {/* Shop Code */}
                    <Form.Item
                      label={<Text strong>Shop Code</Text>}
                      name={"code"}
                      rules={[
                        { required: true, message: "Please enter shop code" },
                        { max: 10, message: "Shop code must be 10 characters or less" },
                        { min: 2, message: "Shop code must be atleast 2 characters or more" },
                        {
                          pattern: /^[0-9A-Za-z]+$/,
                          message: "Only letters and numbers allowed",
                        },
                      ]}
                      tooltip="Unique identifier for your shop (e.g., SJ)"
                      style={{ marginBottom: 12 }}
                    >
                      <Input
                        placeholder="e.g., SJ"
                        style={{ textTransform: "uppercase" }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                {/* Address row */}
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    {/* Address */}
                    <Form.Item
                      label={<Text strong>Address</Text>}
                      name="address"
                      rules={[{ required: true, message: "Please enter shop address" }]}
                      style={{ marginBottom: 12 }}
                    >
                      <Input.TextArea
                        rows={4}
                        placeholder="Enter complete shop address"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Col>
              
              {/* Right section: Logo */}
              <Col span={8}>
                {/* Logo Upload (Optional) */}
                <Form.Item
                  label={<Text strong>Shop Logo</Text>}
                  name={"logo_url"}
                  valuePropName="fileList"
                  normalize={normalizeFile}
                  style={{ marginBottom: 12 }}
                >
                  <Upload.Dragger
                    name="file"
                    listType="picture-card"
                    maxCount={1}
                    accept="image/*"
                    style={{ 
                      height: '100px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    showUploadList={{
                      showPreviewIcon: false,
                      showRemoveIcon: true,
                    }}
                    beforeUpload={(file) => {
                      const isLt10M = file.size / 1024 / 1024 < 10;
                      if (!isLt10M) {
                        message.error('Image must be smaller than 10MB!');
                        return Upload.LIST_IGNORE;
                      }
                      return true;
                    }}
                    customRequest={async ({ file, onError, onSuccess }) => {
                      try {
                        const rcFile = file as RcFile;
                        const fileExt = rcFile.name.split(".").pop();
                        const fileName = `${Date.now()}.${fileExt}`;
                        const filePath = `shop-logos/${fileName}`;

                        const { error: uploadError } = await supabaseClient.storage
                          .from('refine')
                          .upload(filePath, file, {
                            cacheControl: "3600",
                            upsert: true,
                          });

                        if (uploadError) {
                          throw uploadError;
                        }

                        const { data } = await supabaseClient.storage
                          .from('refine')
                          .getPublicUrl(filePath);

                        onSuccess?.({ url: data?.publicUrl }, new XMLHttpRequest());
                      } catch (error) {
                        onError?.(new Error("Upload Error"));
                      }
                    }}
                  >
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined style={{ color: "#667eea", fontSize: "48px" }} />
                      </p>
                      <p className="ant-upload-text" style={{ fontSize: '14px' }}>
                        Click or drag logo
                      </p>
                      <p className="ant-upload-hint" style={{ fontSize: '12px' }}>
                        PNG, JPG, or JPEG
                      </p>
                    </div>
                  </Upload.Dragger>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col span={8}>
                {/* Phone */}
                <Form.Item
                  label={<Text strong>Phone Number</Text>}
                  name="phone"
                  rules={[
                    { required: true, message: "Please enter phone number" },
                    { max: 20, message: "Phone must be 20 characters or less" },
                    {
                      pattern: /^[0-9+\-() ]+$/,
                      message: "Please enter a valid phone number",
                    },
                  ]}
                  style={{ marginBottom: 12 }}
                >
                  <Input placeholder="e.g., +91 98765 43210" />
                </Form.Item>
              </Col>
              <Col span={8}>
                {/* Email (Optional) */}
                <Form.Item
                  label={<Text strong>Email</Text>}
                  name="email"
                  rules={[
                    { type: "email", message: "Please enter a valid email" },
                    { max: 100, message: "Email must be 100 characters or less" },
                  ]}
                  style={{ marginBottom: 12 }}
                >
                  <Input placeholder="shop@example.com" />
                </Form.Item>
              </Col>
              <Col span={8}>
                {/* GST Number (Optional) */}
                <Form.Item
                  label={<Text strong>GST Number</Text>}
                  name="gst_number"
                  rules={[
                    { max: 20, message: "GST number must be 20 characters or less" },
                    {
                      pattern: /^[0-9A-Za-z]+$/,
                      message: "Only letters and numbers allowed",
                    },
                  ]}
                  style={{ marginBottom: 12 }}
                >
                  <Input
                    placeholder="e.g., 22AAAAA0000A1Z5"
                    style={{ textTransform: "uppercase" }}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Submit Button */}
            <Form.Item style={{ marginBottom: 0, marginTop: "32px"}}>
              <Button
                {...saveButtonProps}
                style={{
                  width: "100%",
                  height: "48px",
                  fontSize: "16px",
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                Complete Setup & Start Selling
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  )
}