import { useGetIdentity } from "@refinedev/core";
import React, { useEffect, useState } from "react";
import { useForm } from "@refinedev/antd";
import { IShop } from "../../libs/interfaces";
import { Button, Col, Form, Input, message, Row, Space, Typography } from "antd";
import { normalizeFile } from "../../libs/normalize";
import { UploadImageToSupabase } from "../../components/upload-image";
import { data } from "react-router";
import { useShopCheck } from "../../hooks/use-shop-check";

const { Title, Text, Paragraph } = Typography;

export default function Settings() {
  const [activeTab, setActiveTab] = useState<"shop" | "pricing">("shop");

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 30,
          borderBottom: "1px solid #e5e5e5",
          marginBottom: 40,
        }}
      >
        <TabItem
          label="Shop Settings"
          active={activeTab === "shop"}
          onClick={() => setActiveTab("shop")}
        />
        <TabItem
          label="Making Charges"
          active={activeTab === "pricing"}
          onClick={() => setActiveTab("pricing")}
        />
      </div>

      {/* Content */}
      {activeTab === "shop" && <ShopProfile />}
      {activeTab === "pricing" && <MakingCharges />}
    </div>
  );
}

function TabItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        paddingBottom: 12,
        cursor: "pointer",
        fontWeight: active ? 600 : 400,
        borderBottom: active ? "2px solid black" : "2px solid transparent",
      }}
    >
      {label}
    </div>
  );
}

function ShopProfile() {
  const { data: identity } = useGetIdentity<{ id: string }>();
  const { shops, isLoading } = useShopCheck();
  const [logoUrl, setLogoUrl] = useState<string | undefined>();

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
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Space direction="vertical" align="center">
          <Title level={4}>Loading...</Title>
        </Space>
      </div>
    )
  }

  return (
    <div>
      <Form
        {...formProps}
        layout="vertical"
        onFinish={handleFinish}
        size="large"
        requiredMark="optional"
      >
        <Row gutter={[16, 16]}>
          <Col span={16}>
            <Row gutter={[16, 16]}>
              <Col span={15}>
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
            {/* Address */}
            <Row gutter={[16, 16]}>
              <Col span={24}>
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

          <Col span={8}>
            <Form.Item label="Logo">
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

        <Row gutter={[16, 16]}>
          <Col span={8}>
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

        <Form.Item style={{ marginBottom: 0, marginTop: "32px" }}>
          <div style={{ textAlign: "right" }}>
            <Button
              type="primary"
              {...saveButtonProps}
              size="large"
              style={{
                minWidth: "200px",
              }}
            >
              Save Changes
            </Button>
          </div>
        </Form.Item>
      </Form>
    </div>
  );
}

/* ---------------- MAKING CHARGES ---------------- */

function MakingCharges() {
  const metals = [
    {
      name: "Gold",
      color: "#D4AF37",
      purities: ["24K", "22K", "20K"],
    },
    {
      name: "Silver",
      color: "#C0C0C0",
      purities: ["99%", "92.5%", "80%"],
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 30 }}>Making Charges</h2>

      {metals.map((metal) => (
        <div
          key={metal.name}
          style={{
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 20,
            marginBottom: 30,
          }}
        >
          <h3 style={{ color: metal.color }}>{metal.name}</h3>

          <table style={{ width: "100%", marginTop: 15 }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>Purity</th>
                <th>Charge (₹ / gram)</th>
              </tr>
            </thead>
            <tbody>
              {metal.purities.map((purity) => (
                <tr key={purity}>
                  <td style={{ padding: "10px 0" }}>{purity}</td>
                  <td>
                    <input type="number" style={{ ...inputStyle, width: 150 }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div style={{ textAlign: "right" }}>
        <button style={buttonStyle}>Update Charges</button>
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 8,
  marginTop: 6,
  borderRadius: 6,
  border: "1px solid #ddd",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 8,
  border: "none",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
};