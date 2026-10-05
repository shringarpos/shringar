import React, { useState } from "react";
import {
    ExportButton,
    List as RefineList,
    useTable,
} from "@refinedev/antd";
import { useExport, useGetIdentity } from "@refinedev/core";
import type { HttpError } from "@refinedev/core";
import {
    Banknote,
    CheckCircle2,
    Clock,
    Coins,
} from "lucide-react";
import {
    Card,
    Col,
    Radio,
    Row,
    Statistic,
    Table,
    Tag,
    Typography,
    theme,
} from "antd";
import dayjs from "dayjs";
import type { IGoldLoan } from "../../libs/interfaces";

export default function GoldLedgerReports() {
    const { token } = theme.useToken();
    const { data: identity } = useGetIdentity<{ id: string }>();
    const userId = identity?.id;

    const [activeTab, setActiveTab] = useState<"running" | "closed">("running");

    const { tableProps, tableQuery } = useTable<IGoldLoan, HttpError>(
        {
            resource: "gold_loans",
            filters: {
                permanent: [
                    ...(userId ? [{ field: "user_id", operator: "eq" as const, value: userId }] : []),
                    { field: "status", operator: "eq" as const, value: activeTab },
                ],
            },
            sorters: {
                initial: [{ field: "loan_date", order: "desc" }],
            },
            syncWithLocation: false,
            queryOptions: { enabled: !!userId },
        }
    );

    const loans = (tableQuery?.data?.data || []) as IGoldLoan[];
    const isLoading = tableQuery?.isLoading;

    const totalPrincipal = loans.reduce((sum: number, l: IGoldLoan) => sum + Number(l.loan_amount || 0), 0);
    const totalInterest = loans.reduce((sum: number, l: IGoldLoan) => sum + Number(l.interest_amount || 0), 0);
    const totalPayable = loans.reduce((sum: number, l: IGoldLoan) => sum + Number(l.total_amount || 0), 0);

    const { triggerExport, isLoading: exportLoading } = useExport<IGoldLoan>({
        resource: "gold_loans",
        filters: [
            ...(userId ? [{ field: "user_id", operator: "eq" as const, value: userId }] : []),
            { field: "status", operator: "eq" as const, value: activeTab },
        ],
        mapData: (item: IGoldLoan) => ({
            "Customer": item.customer_name,
            "Contact": item.contact_no,
            "Metal": item.metal_type,
            "Purity": item.purity,
            "Ornament": item.ornament_details,
            "Loan Amount": item.loan_amount,
            "Interest Rate": `${item.interest_rate}%`,
            "Interest Amount": item.interest_amount,
            "Total Amount": item.total_amount,
            "Loan Date": item.loan_date,
            "Closure Date": item.closure_date || "—",
        }),
    });

    const cardStyle: React.CSSProperties = {
        background: token.colorBgContainer,
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: token.boxShadowTertiary,
    };

    const titleStyle: React.CSSProperties = {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.05em",
        color: token.colorTextSecondary,
        textTransform: "uppercase",
    };

    return (
        <RefineList
            title={`Gold Ledger Reports — ${activeTab === "running" ? "Running Loans" : "Closed Loans"}`}
            headerButtons={() => (
                <ExportButton onClick={triggerExport} loading={exportLoading}>
                    Export Report
                </ExportButton>
            )}
        >
            {/* Tabs Selector */}
            <div style={{ marginBottom: 20 }}>
                <Radio.Group
                    value={activeTab}
                    onChange={(e) => setActiveTab(e.target.value)}
                    buttonStyle="solid"
                    size="middle"
                >
                    <Radio.Button value="running">
                        <Clock size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                        Running Loans
                    </Radio.Button>
                    <Radio.Button value="closed">
                        <CheckCircle2 size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                        Closed Loans
                    </Radio.Button>
                </Radio.Group>
            </div>

            {/* Aggregated KPI Cards (Theme Aware) */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={cardStyle} styles={{ body: { padding: "16px 20px" } }}>
                        <Statistic
                            title={<span style={titleStyle}>Total Loans</span>}
                            value={loans.length}
                            loading={isLoading}
                            valueStyle={{ color: token.colorText, fontWeight: 700, fontSize: 22 }}
                        />
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={cardStyle} styles={{ body: { padding: "16px 20px" } }}>
                        <Statistic
                            title={<span style={titleStyle}>Principal Amount</span>}
                            value={totalPrincipal}
                            loading={isLoading}
                            prefix={<Coins size={16} style={{ color: token.colorWarning, marginRight: 6, verticalAlign: "middle" }} />}
                            formatter={(val) => `₹${Number(val).toLocaleString("en-IN")}`}
                            valueStyle={{ color: token.colorText, fontWeight: 700, fontSize: 22 }}
                        />
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={cardStyle} styles={{ body: { padding: "16px 20px" } }}>
                        <Statistic
                            title={<span style={titleStyle}>Total Interest</span>}
                            value={totalInterest}
                            loading={isLoading}
                            prefix={<Banknote size={16} style={{ color: token.colorWarning, marginRight: 6, verticalAlign: "middle" }} />}
                            formatter={(val) => `₹${Number(val).toLocaleString("en-IN")}`}
                            valueStyle={{ color: token.colorWarning, fontWeight: 700, fontSize: 22 }}
                        />
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={cardStyle} styles={{ body: { padding: "16px 20px" } }}>
                        <Statistic
                            title={<span style={titleStyle}>Total Payable</span>}
                            value={totalPayable}
                            loading={isLoading}
                            formatter={(val) => `₹${Number(val).toLocaleString("en-IN")}`}
                            valueStyle={{ color: token.colorSuccess, fontWeight: 700, fontSize: 22 }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Loans Table */}
            <Table
                {...tableProps}
                rowKey="id"
                size="small"
                scroll={{ x: 1200 }}
            >
                <Table.Column<IGoldLoan>
                    title="LOAN DATE"
                    dataIndex="loan_date"
                    key="loan_date"
                    width={110}
                    sorter
                    render={(val: string) => (
                        <Typography.Text style={{ color: token.colorText }}>
                            {dayjs(val).format("YYYY-MM-DD")}
                        </Typography.Text>
                    )}
                />

                {activeTab === "closed" && (
                    <Table.Column<IGoldLoan>
                        title="CLOSURE DATE"
                        dataIndex="closure_date"
                        key="closure_date"
                        width={120}
                        sorter
                        render={(val: string) => (
                            <Typography.Text style={{ color: token.colorSuccess }}>
                                {val ? dayjs(val).format("YYYY-MM-DD") : "—"}
                            </Typography.Text>
                        )}
                    />
                )}

                <Table.Column<IGoldLoan>
                    title="CUSTOMER"
                    dataIndex="customer_name"
                    key="customer_name"
                    render={(_: unknown, record: IGoldLoan) => (
                        <div>
                            <Typography.Text strong style={{ color: token.colorText }}>
                                {record.customer_name}
                            </Typography.Text>
                            <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
                                {record.contact_no}
                            </div>
                        </div>
                    )}
                />

                <Table.Column<IGoldLoan>
                    title="ORNAMENT & METAL"
                    key="ornament"
                    render={(_: unknown, record: IGoldLoan) => (
                        <div>
                            <Tag color={record.metal_type === "Gold" ? "gold" : "default"}>
                                {record.metal_type} ({record.purity})
                            </Tag>
                            <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 4 }}>
                                {record.ornament_details}
                            </div>
                        </div>
                    )}
                />

                <Table.Column<IGoldLoan>
                    title="PRINCIPAL"
                    dataIndex="loan_amount"
                    key="loan_amount"
                    align="right"
                    sorter
                    render={(val: number) => (
                        <Typography.Text strong style={{ color: token.colorText }}>
                            ₹{Number(val).toLocaleString("en-IN")}
                        </Typography.Text>
                    )}
                />

                <Table.Column<IGoldLoan>
                    title="INTEREST RATE"
                    dataIndex="interest_rate"
                    key="interest_rate"
                    align="center"
                    render={(val: number) => <Tag color="blue">{val}% p.a.</Tag>}
                />

                <Table.Column<IGoldLoan>
                    title="INTEREST ACCRUED"
                    dataIndex="interest_amount"
                    key="interest_amount"
                    align="right"
                    render={(val: number) => (
                        <Typography.Text style={{ color: token.colorWarning }}>
                            ₹{Number(val).toLocaleString("en-IN")}
                        </Typography.Text>
                    )}
                />

                <Table.Column<IGoldLoan>
                    title="TOTAL AMOUNT"
                    dataIndex="total_amount"
                    key="total_amount"
                    align="right"
                    sorter
                    render={(val: number) => (
                        <Typography.Text strong style={{ color: token.colorSuccess }}>
                            ₹{Number(val).toLocaleString("en-IN")}
                        </Typography.Text>
                    )}
                />
            </Table>
        </RefineList>
    );
}
