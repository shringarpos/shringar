import React, { useEffect, useState } from "react";
import { useForm } from "@refinedev/antd";
import { useGetIdentity } from "@refinedev/core";
import { useNavigate } from "react-router";
import { IShop } from "../../libs/interfaces";
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Space,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import {
  ShopOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  BarcodeOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { Store } from "lucide-react";
import { useShopCheck } from "../../hooks/use-shop-check";
import { normalizeFile } from "../../libs/normalize";
import { UploadImageToSupabase } from "../../components/upload-image";

const { Title, Text, Paragraph } = Typography;

export default function ShopSetup() {
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const { data: identity } = useGetIdentity<{ id: string }>();
  const { hasShop, isLoading: isCheckingShop } = useShopCheck();
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  // Redirect to dashboard if shop already exists
  useEffect(() => {
    if (!isCheckingShop && hasShop) {
      navigate("/", { replace: true });
    }
  }, [hasShop, isCheckingShop, navigate]);

  const { formProps, saveButtonProps, onFinish } = useForm<IShop>({
    action: "create",
    resource: "shops",
    redirect: false,
    onMutationSuccess: () => {
      message.success("Shop setup completed successfully!");
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 400);
    },
    onMutationError: (error) => {
      console.error("Error creating shop:", error);
      message.error("Failed to create shop. Please try again.");
    },
  });

  const handleFinish = async (values: any) => {
    try {
      const shopData: Partial<IShop> = {
        user_id: identity?.id,
        code: values.code?.toUpperCase()?.trim(),
        name: values.name?.trim(),
        address: values.address?.trim(),
        phone: values.phone?.trim(),
        email: values.email?.trim() || null,
        gst_number: values.gst_number?.toUpperCase()?.trim() || null,
        logo_url: logoUrl,
        created_by: identity?.id,
        updated_by: identity?.id,
      };

      await onFinish(shopData);
    } catch (error) {
      console.error("Error creating shop: ", error);
      message.error("Failed to setup shop");
    }
  };

  if (isCheckingShop) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: token.colorBgLayout,
        }}
      >
        <Space direction="vertical" align="center">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: token.colorPrimaryBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Store style={{ color: token.colorPrimary, width: 28, height: 28 }} />
          </div>
          <Text type="secondary">Checking shop details...</Text>
        </Space>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: token.colorBgLayout,
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 680,
          boxShadow: "0 10px 32px rgba(0,0,0,0.06)",
          borderRadius: 16,
          border: `1px solid ${token.colorBorderSecondary}`,
          overflow: "hidden",
        }}
        bodyStyle={{ padding: "28px 24px" }}
      >
        {/* Mobile-Friendly Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: token.colorPrimaryBg,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
              border: `1px solid ${token.colorPrimaryBorder}`,
            }}
          >
            <Store style={{ color: token.colorPrimary, width: 28, height: 28 }} />
          </div>
          <div style={{ marginBottom: 4 }}>
            <Tag color="gold" style={{ borderRadius: 10, padding: "1px 8px", fontSize: 12 }}>
              Step 2 of 2 • Showroom Setup
            </Tag>
          </div>
          <Title level={3} style={{ margin: "6px 0 4px", fontSize: 22 }}>
            Setup Your Jewelry Showroom
          </Title>
          <Text type="secondary" style={{ fontSize: 13, display: "block" }}>
            Enter your business details to configure invoices and begin billing.
          </Text>
        </div>

        <Divider style={{ margin: "16px 0 24px" }} />

        {/* Clean Responsive Form */}
        <Form
          {...formProps}
          layout="vertical"
          onFinish={handleFinish}
          size="large"
          requiredMark="optional"
          scrollToFirstError
        >
          {/* Shop Name & Shop Code */}
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={15}>
              <Form.Item
                label={<Text strong>Showroom Name</Text>}
                name="name"
                rules={[
                  { required: true, message: "Please enter showroom name" },
                  { max: 200, message: "Name must be 200 characters or less" },
                ]}
                style={{ marginBottom: 16 }}
              >
                <Input
                  prefix={<ShopOutlined style={{ color: token.colorTextTertiary }} />}
                  placeholder="e.g. Mahalakshmi Jewellers"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={9}>
              <Form.Item
                label={<Text strong>Shop Code</Text>}
                name="code"
                rules={[
                  { required: true, message: "Please enter a shop code" },
                  { max: 10, message: "10 chars maximum" },
                  { min: 2, message: "At least 2 chars" },
                  {
                    pattern: /^[0-9A-Za-z]+$/,
                    message: "Letters and numbers only",
                  },
                ]}
                tooltip="Short prefix used for invoice numbering (e.g. MJ)"
                style={{ marginBottom: 16 }}
              >
                <Input
                  prefix={<BarcodeOutlined style={{ color: token.colorTextTertiary }} />}
                  placeholder="e.g. MJ"
                  style={{ textTransform: "uppercase" }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Contact Details */}
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
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
                style={{ marginBottom: 16 }}
              >
                <Input
                  prefix={<PhoneOutlined style={{ color: token.colorTextTertiary }} />}
                  placeholder="e.g. +91 98765 43210"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={<Text strong>Email Address</Text>}
                name="email"
                rules={[
                  { type: "email", message: "Please enter a valid email" },
                  { max: 100, message: "Email must be 100 characters or less" },
                ]}
                style={{ marginBottom: 16 }}
              >
                <Input
                  prefix={<MailOutlined style={{ color: token.colorTextTertiary }} />}
                  placeholder="e.g. contact@jewellers.com"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Address */}
          <Row gutter={[16, 0]}>
            <Col xs={24}>
              <Form.Item
                label={<Text strong>Showroom Address</Text>}
                name="address"
                rules={[{ required: true, message: "Please enter showroom address" }]}
                style={{ marginBottom: 16 }}
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Complete address for invoices and receipts (Street, City, Pincode)"
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* GST & Logo */}
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={<Text strong>GSTIN (Optional)</Text>}
                name="gst_number"
                rules={[
                  { max: 20, message: "GSTIN must be 20 characters or less" },
                  {
                    pattern: /^[0-9A-Za-z]+$/,
                    message: "Letters and numbers only",
                  },
                ]}
                style={{ marginBottom: 16 }}
              >
                <Input
                  prefix={<FileTextOutlined style={{ color: token.colorTextTertiary }} />}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  style={{ textTransform: "uppercase" }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={<Text strong>Showroom Logo (Optional)</Text>}
                style={{ marginBottom: 16 }}
              >
                <Form.Item
                  name="images"
                  valuePropName="fileList"
                  normalize={normalizeFile}
                  noStyle
                >
                  <UploadImageToSupabase
                    bucketName="shop-logos"
                    uploadText="Upload Logo"
                    hintText="PNG or JPG up to 2MB"
                    defaultImageUrl={logoUrl}
                    onUploadSuccess={(url) => {
                      setLogoUrl(url);
                    }}
                    onRemoveSuccess={() => {
                      setLogoUrl(undefined);
                    }}
                  />
                </Form.Item>
              </Form.Item>
            </Col>
          </Row>

          {/* Submit Action */}
          <div style={{ marginTop: 12 }}>
            <Button
              {...saveButtonProps}
              type="primary"
              htmlType="submit"
              size="large"
              block
              icon={<ArrowRightOutlined />}
              style={{
                height: 48,
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              Complete Setup & Launch POS
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
