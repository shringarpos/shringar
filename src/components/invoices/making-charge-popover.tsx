import { useCreate, useGetIdentity, useList, useUpdate } from "@refinedev/core";
import { SettingOutlined, WarningOutlined } from "@ant-design/icons";
import { Button, Form, InputNumber, Popover, Space, Typography } from "antd";
import React, { useEffect, useState } from "react";
import type { IMakingCharge, IMetalType, IPurityLevel } from "../../libs/interfaces";

const { Text } = Typography;

interface MakingChargePopoverProps {
  metal: IMetalType;
  purityLevelId: string;
  purityLevel: IPurityLevel | null;
  existingCharge?: IMakingCharge;
  shopId: string;
  onSuccess?: (chargePerGramPaise: number) => void;
  /** If true renders as a small warning icon trigger, else a full button */
  compact?: boolean;
}

export const MakingChargePopover: React.FC<MakingChargePopoverProps> = ({
  metal,
  purityLevelId,
  purityLevel,
  existingCharge,
  shopId,
  onSuccess,
  compact = true,
}) => {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const { data: identity } = useGetIdentity<{ id: string }>();
  const userId = (identity as any)?.id as string | undefined;

  const { mutateAsync: createCharge } = useCreate<IMakingCharge>();
  const { mutateAsync: updateCharge } = useUpdate<IMakingCharge>();

  const { query: puritiesQuery } = useList<IPurityLevel>({
    resource: "purity_levels",
    filters: [
      { field: "metal_type_id", operator: "eq", value: metal.id },
      { field: "is_active", operator: "eq", value: true },
    ],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!metal.id },
  });

  const { query: activeChargesQuery } = useList<IMakingCharge>({
    resource: "making_charges",
    filters: [
      { field: "shop_id", operator: "eq", value: shopId },
      { field: "metal_type_id", operator: "eq", value: metal.id },
      { field: "is_active", operator: "eq", value: true },
    ],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!shopId && !!metal.id },
  });

  useEffect(() => {
    if (open) {
      form.setFieldValue(
        "charge",
        existingCharge ? existingCharge.charge_per_gram_paise / 100 : undefined,
      );
    }
  }, [open, existingCharge, form]);

  const isGold = metal.name.toUpperCase() === "GOLD";
  const label = isGold && purityLevel ? `${metal.name} ${purityLevel.display_name}` : metal.name;
  const activeCharges = (activeChargesQuery?.data?.data ?? []) as IMakingCharge[];
  const activePurities = (puritiesQuery?.data?.data ?? []) as IPurityLevel[];

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const paise = Math.round(values.charge * 100);
      setSaving(true);

      if (!isGold) {
        const purityIds =
          activePurities.length > 0
            ? activePurities.map((p) => p.id)
            : purityLevelId
              ? [purityLevelId]
              : [];

        for (const id of purityIds) {
          const existing = activeCharges.find((c) => c.purity_level_id === id);
          if (existing) {
            await updateCharge({
              resource: "making_charges",
              id: existing.id,
              values: {
                charge_per_gram_paise: paise,
                updated_by: userId,
              },
            });
          } else {
            await createCharge({
              resource: "making_charges",
              values: {
                shop_id: shopId,
                metal_type_id: metal.id,
                purity_level_id: id,
                charge_per_gram_paise: paise,
                is_active: true,
                effective_from: new Date().toISOString(),
                effective_to: null,
                created_by: userId,
                updated_by: userId,
              },
            });
          }
        }
      } else if (existingCharge) {
        await updateCharge({
          resource: "making_charges",
          id: existingCharge.id,
          values: {
            charge_per_gram_paise: paise,
            updated_by: userId,
          },
        });
      } else {
        if (!purityLevelId) {
          return;
        }

        await createCharge({
          resource: "making_charges",
          values: {
            shop_id: shopId,
            metal_type_id: metal.id,
            purity_level_id: purityLevelId,
            charge_per_gram_paise: paise,
            is_active: true,
            effective_from: new Date().toISOString(),
            created_by: userId,
            updated_by: userId,
          },
        });
      }

      setOpen(false);
      onSuccess?.(paise);
    } catch {
      // form validation error
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <Form form={form} layout="vertical" style={{ width: 240 }}>
      <Form.Item
        name="charge"
        label={`Making Charge for ${label} (₹/g)`}
        rules={[
          { required: true, message: "Required" },
          { type: "number", min: 0, message: "Must be ≥ 0" },
        ]}
      >
        <InputNumber style={{ width: "100%" }} precision={2} prefix="₹" addonAfter="/g" />
      </Form.Item>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          Also set permanently in Settings
        </Text>
        <Button type="primary" size="small" loading={saving} onClick={handleSave}>
          Save
        </Button>
      </Space>
    </Form>
  );

  return (
    <Popover
      content={content}
      title={`Configure Making Charge — ${label}`}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
    >
      {compact ? (
        <WarningOutlined style={{ color: "#faad14", cursor: "pointer" }} />
      ) : (
        <Button size="small" icon={<SettingOutlined />} type="dashed">
          Set Making Charge
        </Button>
      )}
    </Popover>
  );
};
