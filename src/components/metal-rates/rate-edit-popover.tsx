import { useGetIdentity } from "@refinedev/core";
import { EditOutlined } from "@ant-design/icons";
import {
  Button,
  Form,
  InputNumber,
  Popover,
  Space,
  Typography,
} from "antd";
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import type { IMetalRate, IMetalType } from "../../libs/interfaces";
import { supabaseClient } from "../../providers/supabase-client";
import { displayToPaise, paiseToDisplay, rateUnit } from "./utils";

const { Text } = Typography;

interface RateEditPopoverProps {
  metal: IMetalType;
  existingRate?: IMetalRate;
  shopId: string;
  onSuccess?: () => void;
  compact?: boolean;
  trigger?: React.ReactNode;
}

export const RateEditPopover: React.FC<RateEditPopoverProps> = ({
  metal,
  existingRate,
  shopId,
  onSuccess,
  compact = false,
  trigger,
}) => {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const { data: identity } = useGetIdentity<{ id: string }>();
  const userId = (identity as any)?.id as string | undefined;

  // Sync form value whenever the popover opens or existingRate changes
  useEffect(() => {
    if (open) {
      form.setFieldValue(
        "rate",
        existingRate
          ? paiseToDisplay(existingRate.rate_per_gram_paise, metal.name)
          : undefined,
      );
    }
  }, [open, existingRate, metal.name, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const paise = displayToPaise(values.rate, metal.name);
      const today = dayjs().format("YYYY-MM-DD");

      setSaving(true);
      const { error } = await supabaseClient.from("ornament_rates").upsert(
        {
          ...(existingRate?.id ? { id: existingRate.id } : {}),
          shop_id: shopId,
          metal_type_id: metal.id,
          rate_date: today,
          rate_per_gram_paise: paise,
          updated_by: userId,
        },
        { onConflict: "shop_id,metal_type_id,rate_date" }
      );

      if (error) {
        throw error;
      }
      setOpen(false);
      onSuccess?.();
    } catch {
      // form validation error – do nothing
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <Form form={form} layout="vertical" style={{ width: 220 }}>
      <Form.Item
        name="rate"
        label={`${metal.name} Rate (${rateUnit(metal.name)})`}
        rules={[
          { required: true, message: "Please enter the rate" },
          { type: "number", min: 1, message: "Rate must be greater than 0" },
        ]}
      >
        <InputNumber
          style={{ width: "100%" }}
          min={1}
          precision={2}
          placeholder={`e.g. ${metal.name.toUpperCase() === "GOLD" ? "6000" : "72"}`}
          autoFocus
        />
      </Form.Item>
      <Form.Item style={{ marginBottom: 0 }}>
        <Space>
          <Button type="primary" size="small" loading={saving} onClick={handleSave}>
            Save
          </Button>
          <Button size="small" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );

  return (
    <Popover
      content={content}
      title={`Set ${metal.name} Rate — ${dayjs().format("D MMM YYYY")}`}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
    >
      {trigger ? (
        // Wrap custom trigger so the Popover's click handler attaches correctly
        <span style={{ display: "inline-flex" }}>{trigger}</span>
      ) : compact ? (
        <EditOutlined style={{ cursor: "pointer" }} />
      ) : (
        <Button icon={<EditOutlined />} size="small">
          Edit
        </Button>
      )}
    </Popover>
  );
};
