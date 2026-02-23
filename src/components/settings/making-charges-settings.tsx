 import { useCreate, useGetIdentity, useList, useUpdate } from "@refinedev/core";
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
  Tooltip,
  Typography,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useShopCheck } from "../../hooks/use-shop-check";

function buildLatestPerPurity(charges: IMakingCharge[]): Record<string, IMakingCharge> {
  const map: Record<string, IMakingCharge> = {};
  for (const c of charges) {
    const prev = map[c.purity_level_id];
    if (!prev || new Date(c.effective_from) > new Date(prev.effective_from)) {
      map[c.purity_level_id] = c;
    }
  }
  return map;
}

interface MetalCardProps {
  metal: IMetalType;
  purities: IPurityLevel[];
  existingCharges: IMakingCharge[];
  shopId: string;
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
    filters: [{ field: "shop_id", operator: "eq", value: shopId }],
    sorters: [{ field: "effective_from", order: "desc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!shopId, staleTime: 30 * 1000 },
  });

  const metals   = (metalsQuery?.data?.data  ?? []) as IMetalType[];
  const purities = (purityQuery?.data?.data  ?? []) as IPurityLevel[];
  const charges  = (chargesQuery?.data?.data ?? []) as IMakingCharge[];

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
        <Typography.Text type="secondary">
          No active metals found. Please contact support.
        </Typography.Text>
      ) : (
        <Row gutter={[20, 20]}>
          {metals.map((metal) => (
            <Col key={metal.id} xs={24} sm={24} md={12} lg={12}>
              <MetalCard
                metal={metal}
                purities={purities.filter((p) => p.metal_type_id === metal.id)}
                existingCharges={charges.filter((c) => c.metal_type_id === metal.id)}
                shopId={shopId!}
              />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}

function MetalCard({ metal, purities, existingCharges, shopId }: MetalCardProps) {
  const { data: identity } = useGetIdentity<{ id: string }>();
  const userId = (identity as any)?.id as string | undefined;

  const { mutateAsync: createCharge } = useCreate<IMakingCharge>();
  const { mutateAsync: updateCharge } = useUpdate<IMakingCharge>();

  const [purityWise, setPurityWise] = useState<boolean>(metal.name.toUpperCase() === "GOLD");
  const [saving, setSaving]         = useState(false);

  const latestMap = buildLatestPerPurity(existingCharges);

  const initPurityEnabled = (): Record<string, boolean> => {
    const m: Record<string, boolean> = {};
    purities.forEach((p) => {
      const latest = latestMap[p.id];
      m[p.id] = latest ? latest.is_active : true;
    });
    return m;
  };

  const initPerPurityValues = (): Record<string, number> => {
    const m: Record<string, number> = {};
    purities.forEach((p) => {
      const active = existingCharges.find((c) => c.purity_level_id === p.id && c.is_active);
      m[p.id] = active ? active.charge_per_gram_paise / 100 : 0;
    });
    return m;
  };

  const [purityEnabled, setPurityEnabled]             = useState<Record<string, boolean>>(initPurityEnabled);
  const [purityToggleLoading, setPurityToggleLoading] = useState<Record<string, boolean>>({});
  const [perPurityValues, setPerPurityValues]         = useState<Record<string, number>>(initPerPurityValues);
  const [uniformValue, setUniformValue]               = useState<number>(() => {
    const firstActive = existingCharges.find((c) => c.is_active);
    return firstActive ? firstActive.charge_per_gram_paise / 100 : 0;
  });

  // Re-sync displayed prices (but NOT purityEnabled) when parent data refreshes.
  useEffect(() => {
    setPerPurityValues(initPerPurityValues());
    const firstActive = existingCharges.find((c) => c.is_active);
    if (firstActive) setUniformValue(firstActive.charge_per_gram_paise / 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingCharges]);

  const getActiveCharge = (purityId: string): IMakingCharge | undefined =>
    existingCharges.find((c) => c.purity_level_id === purityId && c.is_active);

  const enabledPurities = purities.filter((p) => purityEnabled[p.id] !== false);

  const handleModeToggle = (checked: boolean) => {
    if (checked) {
      setPerPurityValues((prev) => {
        const seeded = { ...prev };
        purities.forEach((p) => { if (purityEnabled[p.id] !== false) seeded[p.id] = uniformValue; });
        return seeded;
      });
    }
    setPurityWise(checked);
  };

  const handlePurityEnable = async (purityId: string, enabled: boolean) => {
    setPurityToggleLoading((prev) => ({ ...prev, [purityId]: true }));
    try {
      if (!enabled) {
        // Disable: close the active record immediately so the DB reflects disabled state.
        const active = getActiveCharge(purityId);
        if (active) {
          await updateCharge({
            resource: "making_charges",
            id: active.id,
            values: {
              is_active:    false,
              effective_to: new Date().toISOString(),
              updated_by:   userId,
            },
            successNotification: false,
            errorNotification:   false,
          });
        }
      } else {
        // Enable: immediately insert a new active record using the last known charge
        // so the enabled state survives a page refresh without needing a manual Save.
        const lastCharge = latestMap[purityId]?.charge_per_gram_paise ?? 0;
        await createCharge({
          resource: "making_charges",
          values: {
            shop_id:               shopId,
            metal_type_id:         metal.id,
            purity_level_id:       purityId,
            charge_per_gram_paise: lastCharge,
            is_active:             true,
            effective_from:        new Date().toISOString(),
            effective_to:          null,
            created_by:            userId,
            updated_by:            userId,
          },
          successNotification: false,
          errorNotification:   false,
        });
        // Keep the displayed input value in sync with what was just written.
        setPerPurityValues((prev) => ({ ...prev, [purityId]: lastCharge / 100 }));
      }
      setPurityEnabled((prev) => ({ ...prev, [purityId]: enabled }));
    } catch (err: any) {
      console.error(err);
      message.error(err?.message ?? `Failed to ${enabled ? "enable" : "disable"} purity`);
    } finally {
      setPurityToggleLoading((prev) => ({ ...prev, [purityId]: false }));
    }
  };

  const isDirty = enabledPurities.some((p) => {
    const active  = getActiveCharge(p.id);
    const current = purityWise ? (perPurityValues[p.id] ?? 0) : uniformValue;
    return current !== (active ? active.charge_per_gram_paise / 100 : 0);
  });

  const handleSave = async () => {
    if (!shopId) return;
    setSaving(true);

    // Snapshot charges to avoid state drift from auto-refetch triggered mid-loop.
    const snapshot         = [...existingCharges];
    const getSnapshotActive = (purityId: string) =>
      snapshot.find((c) => c.purity_level_id === purityId && c.is_active);

    try {
      for (const purity of purities) {
        if (!purityEnabled[purity.id]) continue; // skip disabled purities

        const rupees        = purityWise ? (perPurityValues[purity.id] ?? 0) : uniformValue;
        const chargeInPaise = Math.round(rupees * 100);
        const active        = getSnapshotActive(purity.id);

        if (active) {
          if (active.charge_per_gram_paise === chargeInPaise) continue; // no change

          // Step 1 Close the old record (audit trail: preserve rate history).
          await updateCharge({
            resource: "making_charges",
            id: active.id,
            values: {
              is_active:    false,
              effective_to: new Date().toISOString(),
              updated_by:   userId,
            },
            successNotification: false,
            errorNotification:   false,
          });

          // Step 2 Insert the new active record.
          await createCharge({
            resource: "making_charges",
            values: {
              shop_id:               shopId,
              metal_type_id:         metal.id,
              purity_level_id:       purity.id,
              charge_per_gram_paise: chargeInPaise,
              is_active:             true,
              effective_from:        new Date().toISOString(),
              effective_to:          null,
              created_by:            userId,
              updated_by:            userId,
            },
            successNotification: false,
            errorNotification:   false,
          });
        } else {
          // No existing active record first-time insert.
          await createCharge({
            resource: "making_charges",
            values: {
              shop_id:               shopId,
              metal_type_id:         metal.id,
              purity_level_id:       purity.id,
              charge_per_gram_paise: chargeInPaise,
              is_active:             true,
              effective_from:        new Date().toISOString(),
              effective_to:          null,
              created_by:            userId,
              updated_by:            userId,
            },
            successNotification: false,
            errorNotification:   false,
          });
        }
      }
      message.success(`${metal.name} charges saved!`);
      notification.open?.({
        type: "success",
        message: `${metal.name} charges saved!`,
      });
    } catch (err: any) {
      console.error(err);
      message.error(err?.message ?? "Failed to save making charges");
      notification.open?.({
        type: "error",
        message: `${metal.name} charges saved!`,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      style={{ height: "100%" }}
      styles={{ body: { padding: "22px 24px", display: "flex", flexDirection: "column", height: "100%", minHeight: 280 } }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {metal.name}
        </Typography.Title>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Purity-wise rates
          </Typography.Text>
          <Switch checked={purityWise} onChange={handleModeToggle} />
        </div>
      </div>

      <Divider style={{ margin: "0 0 10px" }} />

      {/* Column labels — only shown in purity-wise mode */}
      {purityWise && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px 6px" }}>
          <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Purity
          </Typography.Text>
          <div style={{ display: "flex", alignItems: "center", gap: 56 }}>
            <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Charge (₹/g)
            </Typography.Text>
            <Tooltip title="Toggle off to Disable a purity level from making charges. Disabled purities are skipped when saving.">
              <Typography.Text
                type="secondary"
                style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, cursor: "default" }}
              >
                Active <InfoCircleOutlined />
              </Typography.Text>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {purityWise ? (
          /* ── Purity-wise mode: full row per purity with rate input + toggle ── */
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {purities.length === 0 ? (
              <Typography.Text type="secondary">No purity levels configured for this metal.</Typography.Text>
            ) : (
              purities.map((purity) => {
                const enabled       = purityEnabled[purity.id] !== false;
                const toggleLoading = purityToggleLoading[purity.id] ?? false;
                return (
                  <div
                    key={purity.id}
                    style={{
                      display:        "flex",
                      alignItems:     "center",
                      justifyContent: "space-between",
                      padding:        "8px 12px",
                      borderRadius:   6,
                      opacity:        enabled ? 1 : 0.45,
                      transition:     "opacity 0.2s",
                    }}
                  >
                    <Tag style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>
                      {purity.display_name}
                    </Tag>

                    <div style={{ display: "flex", alignItems: "center", gap: 50 }}>
                      <InputNumber
                        prefix="₹"
                        suffix="/g"
                        min={0}
                        precision={2}
                        step={10}
                        disabled={!enabled}
                        value={perPurityValues[purity.id] ?? 0}
                        onChange={(val) =>
                          setPerPurityValues((prev) => ({ ...prev, [purity.id]: val ?? 0 }))
                        }
                        style={{ width: 150 }}
                        size="middle"
                      />
                      <Tooltip title={enabled ? "Disable this purity" : "Enable this purity"}>
                        <Switch
                          size="small"
                          checked={enabled}
                          loading={toggleLoading}
                          onChange={(val) => handlePurityEnable(purity.id, val)}
                        />
                      </Tooltip>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
            {/* Rate input — fully centred */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                All the purity levels will have this making charge
              </Typography.Text>
              <InputNumber
                prefix="₹"
                suffix="/g"
                min={0}
                precision={2}
                step={10}
                value={uniformValue}
                onChange={(val) => setUniformValue(val ?? 0)}
                style={{ width: 200 }}
                size="large"
                disabled={enabledPurities.length === 0}
              />
            </div>

            {/* Purity pills */}
            {purities.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
                  Active purity levels
                </Typography.Text>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {purities.map((purity) => {
                    const enabled       = purityEnabled[purity.id] !== false;
                    const toggleLoading = purityToggleLoading[purity.id] ?? false;
                    return (
                      <div
                        key={purity.id}
                        style={{
                          display:       "inline-flex",
                          alignItems:    "center",
                          gap:           6,
                          padding:       "4px 10px",
                          borderRadius:  20,
                          opacity:       enabled ? 1 : 0.55,
                          transition:    "opacity 0.2s, border-color 0.2s",
                          cursor:        "default",
                        }}
                      >
                        <Typography.Text style={{ fontSize: 13, fontWeight: 600 }}>
                          {purity.display_name}
                        </Typography.Text>
                        <Tooltip title={enabled ? "Disable this purity" : "Enable this purity"}>
                          <Switch
                            size="small"
                            checked={enabled}
                            loading={toggleLoading}
                            onChange={(val) => handlePurityEnable(purity.id, val)}
                          />
                        </Tooltip>
                      </div>
                    );
                  })}
                </div>
                {enabledPurities.length === 0 && (
                  <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: "block" }}>
                    Enable at least one purity level to save charges.
                  </Typography.Text>
                )}
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
          disabled={enabledPurities.length === 0}
          size="large"
          style={{ minWidth: 130 }}
        >
          Save Charges
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
          <Card styles={{ body: { padding: 24 } }}>
            <Skeleton active paragraph={{ rows: 5 }} />
          </Card>
        </Col>
      ))}
    </Row>
  );
}

