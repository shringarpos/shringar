import { useGetIdentity, useList } from "@refinedev/core";
import { useEffect, useState } from "react";
import { IMakingCharge, IMetalType, IPurityLevel } from "../../libs/interfaces";
import {
  Button,
  Card,
  Col,
  Divider,
  InputNumber,
  message,
  notification,
  Row,
  Skeleton,
  Switch,
  Tag,
  Typography,
} from "antd";
import { useShopCheck } from "../../hooks/use-shop-check";
import { supabaseClient } from "../../providers/supabase-client";

interface MetalCardProps {
  metal: IMetalType;
  purities: IPurityLevel[];
  existingCharges: IMakingCharge[];
  shopId: string;
  onSaveSuccess: () => void;
}

export default function MakingChargesSettings() {
  const { shops, isLoading: shopsLoading } = useShopCheck();
  const shopId = shops?.[0]?.id;

  const { query: metalsQuery } = useList<IMetalType>({
    resource: "metal_types",
    filters: [{ field: "is_active", operator: "eq", value: true }],
    sorters: [{ field: "name", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { staleTime: 5 * 60 * 1000 },
  });

  const { query: purityQuery } = useList<IPurityLevel>({
    resource: "purity_levels",
    filters: [{ field: "is_active", operator: "eq", value: true }],
    sorters: [{ field: "purity_value", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { staleTime: 5 * 60 * 1000 },
  });

  const { query: chargesQuery } = useList<IMakingCharge>({
    resource: "making_charges",
    filters: [
      { field: "shop_id",   operator: "eq", value: shopId },
      { field: "is_active", operator: "eq", value: true   },
    ],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!shopId, staleTime: 30 * 1000 },
  });

  const metals   = (metalsQuery?.data?.data  ?? []) as IMetalType[];
  const purities = (purityQuery?.data?.data  ?? []) as IPurityLevel[];
  const charges  = (chargesQuery?.data?.data ?? []) as IMakingCharge[];

  const refetchCharges = () => chargesQuery?.refetch();

  const isLoading =
    shopsLoading ||
    !!metalsQuery?.isLoading ||
    !!purityQuery?.isLoading ||
    (!!shopId && !!chargesQuery?.isLoading);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Making Charges</Typography.Title>
        <Typography.Text type="secondary">
          Configure per-gram making charges for each metal and purity level
        </Typography.Text>
      </div>

      {isLoading ? (
        <MakingChargesSkeleton />
      ) : metals.length === 0 ? (
        <Typography.Text type="secondary">No active metals found. Please contact support.</Typography.Text>
      ) : (
        <Row gutter={[20, 20]}>
          {metals.map((metal) => (
            <Col key={metal.id} xs={24} sm={24} md={12} lg={12}>
              <MetalCard
                metal={metal}
                purities={purities.filter((p) => p.metal_type_id === metal.id)}
                existingCharges={charges.filter((c) => c.metal_type_id === metal.id)}
                shopId={shopId!}
                onSaveSuccess={() => refetchCharges()}
              />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}

function MetalCard({ metal, purities, existingCharges, shopId, onSaveSuccess }: MetalCardProps) {
  const { data: identity } = useGetIdentity<{ id: string }>();
  // GOLD: purity-wise ON by default; all others (incl. SILVER): off
  const [purityWise, setPurityWise] = useState<boolean>(metal.name.toUpperCase() === "GOLD");
  const [saving, setSaving]         = useState(false);

  // Values in ₹ per gram (display units)
  const buildPerPurity = () => {
    const m: Record<string, number> = {};
    purities.forEach((p) => {
      const ex = existingCharges.find((c) => c.purity_level_id === p.id);
      m[p.id] = ex ? ex.charge_per_gram_paise / 100 : 0;
    });
    return m;
  };

  const [perPurityValues, setPerPurityValues] = useState<Record<string, number>>(buildPerPurity);
  const [uniformValue, setUniformValue]       = useState<number>(
    existingCharges.length > 0 ? existingCharges[0].charge_per_gram_paise / 100 : 0
  );

  // Keep in sync when the parent refetches
  useEffect(() => {
    setPerPurityValues(buildPerPurity());
    if (existingCharges.length > 0) {
      setUniformValue(existingCharges[0].charge_per_gram_paise / 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingCharges]);

  // When toggling to purity-wise, seed all purity fields with the current uniform value
  const handleToggle = (checked: boolean) => {
    if (checked) {
      // switching to purity-wise: fill every purity with the current uniform value
      const seeded: Record<string, number> = {};
      purities.forEach((p) => {
        seeded[p.id] = uniformValue;
      });
      setPerPurityValues(seeded);
    }
    setPurityWise(checked);
  };

  /* dirty check */
  const isDirty = purityWise
    ? purities.some((p) => {
        const ex = existingCharges.find((c) => c.purity_level_id === p.id);
        return (perPurityValues[p.id] ?? 0) !== (ex ? ex.charge_per_gram_paise / 100 : 0);
      })
    : (() => {
        const ex = existingCharges[0];
        return uniformValue !== (ex ? ex.charge_per_gram_paise / 100 : 0);
      })();

  /* save */
  const handleSave = async () => {
    if (!shopId) return;
    setSaving(true);
    try {
      for (const purity of purities) {
        const rupees        = purityWise ? (perPurityValues[purity.id] ?? 0) : uniformValue;
        const chargeInPaise = Math.round(rupees * 100);
        const existing      = existingCharges.find((c) => c.purity_level_id === purity.id);

        if (existing) {
          const { error } = await supabaseClient
            .from("making_charges")
            .update({ charge_per_gram_paise: chargeInPaise, updated_by: identity?.id })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabaseClient.from("making_charges").insert({
            shop_id:               shopId,
            metal_type_id:         metal.id,
            purity_level_id:       purity.id,
            charge_per_gram_paise: chargeInPaise,
            is_active:             true,
            effective_from:        new Date().toISOString(),
            effective_to:          null,
            created_by:            identity?.id,
            updated_by:            identity?.id,
          });
          if (error) throw error;
        }
      }
      message.success(`${metal.name} making charges saved!`);
      notification.open(
        {
            type: "success",
            message: `${metal.name} making charges saved!`,
        }
      )
      onSaveSuccess();
    } catch (err: any) {
      console.error(err);
      message.error(err?.message ?? "Failed to save making charges");
      notification.open(
        {
            type: "error",
            message: `failed to save ${metal.name}`,
        }
      )
    } finally {
      setSaving(false);
    }
  };

  /* render */
  return (
    <Card style={{ height: "100%" }} styles={{ body: { padding: "22px 24px", display: "flex", flexDirection: "column", minHeight: 260 } }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {metal.name}
        </Typography.Title>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Purity-wise rates
          </Typography.Text>
          <Switch
            checked={purityWise}
            onChange={handleToggle}
          />
        </div>
      </div>

      <Divider style={{ margin: "0 0 16px" }} />

      {/* Body */}
      <div style={{ flex: 1 }}>
        {purityWise ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {purities.length === 0 ? (
              <Typography.Text type="secondary">No purity levels configured for this metal.</Typography.Text>
            ) : (
              purities.map((purity) => (
                <div
                  key={purity.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: 6,
                  }}
                >
                  <Tag style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>
                    {purity.display_name}
                  </Tag>
                  <InputNumber
                    prefix="₹"
                    suffix="/g"
                    min={0}
                    type="number"
                    precision={2}
                    step={10}
                    value={perPurityValues[purity.id] ?? 0}
                    onChange={(val) =>
                      setPerPurityValues((prev) => ({ ...prev, [purity.id]: val ?? 0 }))
                    }
                    style={{ width: 152 }}
                    size="middle"
                  />
                </div>
              ))
            )}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              padding: "22px 16px",
              borderRadius: 8,
              border: "1px solid #f0f0f0",
            }}
          >
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              Same making charge applied to{" "}
              <strong>all {purities.length} purity level{purities.length !== 1 ? "s" : ""}</strong>
            </Typography.Text>

            <InputNumber
              prefix="₹"
              suffix="/g"
              min={0}
              precision={2}
              step={10}
              type="number"
              value={uniformValue}
              onChange={(val) => setUniformValue(val ?? 0)}
              style={{ width: 200 }}
              size="large"
            />

            
            {purities.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                {purities.map((p) => (
                  <Tag key={p.id} style={{ fontWeight: 600 }}>
                    {p.display_name}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
        {isDirty && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Unsaved changes
          </Typography.Text>
        )}
        <Button
          type="primary"
          onClick={handleSave}
          loading={saving}
          size="large"
          style={{ minWidth: 130 }}
        >
          {existingCharges.length === 0 ? "Set Charges" : "Save Charges"}
        </Button>
      </div>
    </Card>
  );
}

function MakingChargesSkeleton() {
  return (
    <Row gutter={[20, 20]}>
      {[0, 1].map((i) => (
        <Col key={i} xs={24} md={12}>
          <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 24 } }}>
            <Skeleton active paragraph={{ rows: 5 }} />
          </Card>
        </Col>
      ))}
    </Row>
  );
}