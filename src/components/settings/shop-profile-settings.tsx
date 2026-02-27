import { useGetIdentity } from "@refinedev/core";
import { useEffect, useState } from "react";
import { useForm } from "@refinedev/antd";
import { IShop } from "../../libs/interfaces";
import {
  Button,
  Col,
  Form,
  Grid,
  Input,
  message,
  Row,
  Space,
  Typography,
} from "antd";
import { normalizeFile } from "../../libs/normalize";
import { UploadImageToSupabase } from "../../components/upload-image";
import { useShopCheck } from "../../hooks/use-shop-check";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function ShopProfileSettings() {
  const { data: identity } = useGetIdentity<{ id: string }>();
  const { shops, isLoading } = useShopCheck();
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { formProps, saveButtonProps, onFinish, query: queryResult} = useForm<IShop>({
    action: "edit",
    resource: "shops",
    id: shops?.[0]?.id,
    redirect: false,
    onMutationSuccess: () => {
      message.success("Shop settings updated successfully!");
      queryResult?.refetch();
    },
    onMutationError: (error: any) => {
      console.error("Error updating shop:", error);
      message.error("Failed to update shop settings. Please try again.");
    },
  });

  useEffect(() => {
    if (queryResult?.data?.data?.logo_url) {
      setLogoUrl(queryResult.data.data.logo_url);
    }
  }, [queryResult?.data?.data]);

  const handleFinish = async (values: any) => {
    try {
      const shopDataUpdate: Partial<IShop> = {
        code: values.code,
        name: values.name,
        address: values.address,
        phone: values.phone,
        email: values.email || null,
        gst_number: values.gst_number || null,
        logo_url: logoUrl,
        updated_by: identity?.id,
      };

      await onFinish(shopDataUpdate);
    } catch (error) {
      console.error("Error updating shop: ", error);
      message.error("Failed to update shop settings");
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Space direction="vertical" align="center">
          <Title level={4}>Loading...</Title>
        </Space>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 20}}>
      <Form
        {...formProps}
        layout="vertical"
        onFinish={handleFinish}
        size={isMobile ? "middle" : "large"}
        requiredMark="optional"
      >
        {/* ── Identity: Name / Code / Address + Logo ──────── */}
        <Row gutter={[16, 0]} align="top">
          {/* Logo — floats to top on mobile */}
          <Col
            xs={24}
            md={8}
            order={isMobile ? 1 : 2}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: isMobile ? "center" : "flex-start",
              marginBottom: isMobile ? 16 : 0,
            }}
          >
            <Form.Item
              label={<Text strong>Shop Logo</Text>}
              style={{ width: "100%", maxWidth: isMobile ? 260 : "100%" }}
            >
              <Form.Item
                name="images"
                valuePropName="fileList"
                normalize={normalizeFile}
                noStyle
              >
                <UploadImageToSupabase
                  bucketName="shop-logos"
                  uploadText="Click or drag logo"
                  hintText="PNG, JPG, or JPEG"
                  defaultImageUrl={logoUrl}
                  onUploadSuccess={(url) => setLogoUrl(url)}
                  onRemoveSuccess={() => setLogoUrl(undefined)}
                />
              </Form.Item>
            </Form.Item>
          </Col>

          {/* Name + Code + Address */}
          <Col xs={24} md={16} order={isMobile ? 2 : 1}>
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={16}>
                <Form.Item
                  label={<Text strong>Shop Name</Text>}
                  name="name"
                  rules={[
                    { required: true, message: "Please enter shop name" },
                    { max: 200, message: "Name must be 200 characters or less" },
                  ]}
                >
                  <Input placeholder="Enter your shop name" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  label={<Text strong>Shop Code</Text>}
                  name="code"
                  rules={[
                    { required: true, message: "Please enter shop code" },
                    { max: 10, message: "Shop code must be 10 characters or less" },
                    { min: 2, message: "Shop code must be at least 2 characters" },
                    {
                      pattern: /^[0-9A-Za-z]+$/,
                      message: "Only letters and numbers allowed",
                    },
                  ]}
                  tooltip="Unique identifier for your shop (e.g., SJ)"
                >
                  <Input
                    placeholder="e.g., SJ"
                    style={{ textTransform: "uppercase" }}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              label={<Text strong>Address</Text>}
              name="address"
              rules={[{ required: true, message: "Please enter shop address" }]}
            >
              <Input.TextArea
                rows={isMobile ? 3 : 4}
                placeholder="Enter complete shop address"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* ── Contact ──────────────────────────────────────── */}
        <Row gutter={[16, 0]}>
          <Col xs={24} sm={12} md={8}>
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
            >
              <Input placeholder="e.g., +91 98765 43210" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              label={<Text strong>Email</Text>}
              name="email"
              rules={[
                { type: "email", message: "Please enter a valid email" },
                { max: 100, message: "Email must be 100 characters or less" },
              ]}
            >
              <Input placeholder="shop@example.com" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={24} md={8}>
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
            >
              <Input
                placeholder="e.g., 22AAAAA0000A1Z5"
                style={{ textTransform: "uppercase" }}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* ── Save ─────────────────────────────────────────── */}
        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Button
            type="primary"
            {...saveButtonProps}
            size="large"
            block={isMobile}
            style={isMobile ? undefined : { minWidth: 200, float: "right" }}
          >
            Save Changes
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}