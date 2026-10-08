import { useExport } from "@refinedev/core";
import { ExportButton, useTable } from "@refinedev/antd";
import { Card, Grid, Table, Typography, theme } from "antd";
import dayjs from "dayjs";
import React from "react";
import type { IMetalRate, IMetalType } from "../../libs/interfaces";
import { formatRateDisplay } from "./utils";

const { Text } = Typography;

interface RateHistoryTableProps {
  metals: IMetalType[];
  shopId: string;
  onRowClick?: (date: string) => void;
}

export const RateHistoryTable: React.FC<RateHistoryTableProps> = ({
  metals,
  shopId,
  onRowClick,
}) => {
  const { tableProps } = useTable<IMetalRate>({
    resource: "ornament_rates",
    sorters: { initial: [{ field: "rate_date", order: "desc" }] },
    filters: {
      permanent: shopId
        ? [{ field: "shop_id", operator: "eq", value: shopId }]
        : [],
    },
    queryOptions: { enabled: !!shopId },
    pagination: { pageSize: 15 },
  });

  const { triggerExport, isLoading: exportLoading } = useExport<IMetalRate>({
    resource: "ornament_rates",
    filters: shopId
      ? [{ field: "shop_id", operator: "eq", value: shopId }]
      : [],
    mapData: (item) => {
      const metal = metals.find((m) => m.id === item.metal_type_id);
      return {
        Date: item.rate_date,
        Metal: metal?.name ?? item.metal_type_id,
        Rate: metal
          ? formatRateDisplay(item.rate_per_gram_paise, metal.name)
          : item.rate_per_gram_paise,
      };
    },
  });

  // Pivot: DB has one row per (date × metal). Group by date so each date
  // becomes a single table row with all metals as columns.
  type PivotRow = { rate_date: string; [metalId: string]: number | string };

  const rawData = (tableProps.dataSource as IMetalRate[]) ?? [];
  const pivotMap = new Map<string, PivotRow>();
  for (const row of rawData) {
    if (!pivotMap.has(row.rate_date)) {
      pivotMap.set(row.rate_date, { rate_date: row.rate_date });
    }
    pivotMap.get(row.rate_date)![row.metal_type_id] = row.rate_per_gram_paise;
  }
  const pivotData = Array.from(pivotMap.values());

  // Destructure out dataSource/onRow so we can provide our own typed versions
  const { dataSource: _ds, onRow: _or, ...restTableProps } = tableProps;

  const screens = Grid.useBreakpoint();
  // Stacked date-cards below sm; sm and up render the desktop Table unchanged.
  const isNarrow = !screens.sm;
  const { token } = theme.useToken();

  if (isNarrow) {
    return (
      <Card
        size="small"
        title={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minWidth: 0 }}>
            <Text strong>Rate History</Text>
            <ExportButton onClick={triggerExport} loading={exportLoading} size="small" />
          </div>
        }
        styles={{ body: { padding: "12px" } }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: "100%" }}>
          {pivotData.length === 0 ? (
            <Text type="secondary">No rate history found.</Text>
          ) : (
            pivotData.map((row) => (
              <div
                key={row.rate_date}
                onClick={onRowClick ? () => onRowClick?.(row.rate_date) : undefined}
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                style={{
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  cursor: onRowClick ? "pointer" : undefined,
                  minWidth: 0,
                  maxWidth: "100%",
                }}
              >
                <Text strong style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
                  {dayjs(row.rate_date).format("D MMM YYYY")}
                </Text>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  {metals.map((metal) => {
                    const paise = row[metal.id];
                    return (
                      <div
                        key={metal.id}
                        style={{ display: "flex", justifyContent: "space-between", gap: 8, minWidth: 0 }}
                      >
                        <Text type="secondary" style={{ fontSize: 12, overflowWrap: "break-word", minWidth: 0 }}>
                          {metal.name.toUpperCase() === "GOLD" ? `${metal.name} (₹/10g)` : `${metal.name} (₹/g)`}
                        </Text>
                        {paise === undefined ? (
                          <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
                        ) : (
                          <Text strong style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                            {formatRateDisplay(paise as number, metal.name)}
                          </Text>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    );
  }

  return (
    <Table
      {...restTableProps}
      dataSource={pivotData as unknown as IMetalRate[]}
      scroll={{ x: 450 }}
      title={() => (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text strong>Rate History</Text>
          <ExportButton onClick={triggerExport} loading={exportLoading} size="small" />
        </div>
      )}
      rowKey="rate_date"
      size="small"
      onRow={(record) => ({
        style: { cursor: onRowClick ? "pointer" : undefined },
        onClick: () => onRowClick?.((record as unknown as PivotRow).rate_date as string),
      })}
    >
      <Table.Column
        dataIndex="rate_date"
        title="Date"
        render={(v: string) => dayjs(v).format("D MMM YYYY")}
        width={140}
      />
      {metals.map((metal) => (
        <Table.Column<IMetalRate>
          key={metal.id}
          title={
            metal.name.toUpperCase() === "GOLD"
              ? `${metal.name} (₹/10g)`
              : `${metal.name} (₹/g)`
          }
          render={(_, record) => {
            const pivot = record as unknown as PivotRow;
            const paise = pivot[metal.id];
            if (paise === undefined) return <Text type="secondary">—</Text>;
            return formatRateDisplay(paise as number, metal.name);
          }}
        />
      ))}
    </Table>
  );
};
