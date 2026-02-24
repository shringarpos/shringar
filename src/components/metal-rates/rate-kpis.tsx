import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { Card, Col, Row, Statistic, Typography } from "antd";
import React from "react";
import type { IMetalRate, IMetalType } from "../../libs/interfaces";
import {
  computeKpis,
  formatRateDisplay,
  groupByMetal,
} from "./utils";

const { Text } = Typography;

interface RateKpisProps {
  metals: IMetalType[];
  rates: IMetalRate[];
  today: string;
}

export const RateKpis: React.FC<RateKpisProps> = ({ metals, rates, today }) => {
  const grouped = groupByMetal(rates);

  return (
    <Row gutter={[16, 16]}>
      {metals.map((metal) => {
        const metalRates = grouped[metal.id] ?? [];
        const kpi = computeKpis(metalRates, today);

        const changeColor =
          kpi.changeAmount === null
            ? undefined
            : kpi.changeAmount > 0
              ? "#3f8600"
              : kpi.changeAmount < 0
                ? "#cf1322"
                : undefined;

        const changeSuffix =
          kpi.changeAmount !== null && kpi.changePercent !== null ? (
            <Text style={{ color: changeColor, fontSize: 12 }}>
              {kpi.changeAmount > 0 ? (
                <ArrowUpOutlined />
              ) : kpi.changeAmount < 0 ? (
                <ArrowDownOutlined />
              ) : null}{" "}
              {Math.abs(kpi.changePercent).toFixed(2)}%
            </Text>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              No previous data
            </Text>
          );

        return (
          <Col key={metal.id} xs={24} sm={12} xl={6}>
            <Card size="small" title={metal.name} bordered={false}>
              <Row gutter={8}>
                <Col span={12}>
                  <Statistic
                    title="vs Yesterday"
                    value={
                      kpi.changeAmount !== null
                        ? formatRateDisplay(
                            Math.abs(kpi.changeAmount),
                            metal.name,
                          )
                        : "—"
                    }
                    valueStyle={{ color: changeColor, fontSize: 14 }}
                    suffix={kpi.changeAmount !== null ? changeSuffix : undefined}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="30-Day Avg"
                    value={
                      kpi.avgMonth !== null
                        ? formatRateDisplay(kpi.avgMonth, metal.name)
                        : "—"
                    }
                    valueStyle={{ fontSize: 14 }}
                  />
                </Col>
                <Col span={12} style={{ marginTop: 8 }}>
                  <Statistic
                    title="Month High"
                    value={
                      kpi.highestMonth !== null
                        ? formatRateDisplay(kpi.highestMonth, metal.name)
                        : "—"
                    }
                    valueStyle={{ fontSize: 14, color: "#3f8600" }}
                  />
                </Col>
                <Col span={12} style={{ marginTop: 8 }}>
                  <Statistic
                    title="Month Low"
                    value={
                      kpi.lowestMonth !== null
                        ? formatRateDisplay(kpi.lowestMonth, metal.name)
                        : "—"
                    }
                    valueStyle={{ fontSize: 14, color: "#cf1322" }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};
