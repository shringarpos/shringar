import React from "react";
import { Card, Col, Row, Statistic, theme } from "antd";
import { Banknote, CheckCircle2, Clock, Coins } from "lucide-react";
import type { IGoldLoan } from "../../libs/interfaces";

interface LoanStatsCardsProps {
    loans: IGoldLoan[];
    loading?: boolean;
}

export const LoanStatsCards: React.FC<LoanStatsCardsProps> = ({ loans, loading }) => {
    const { token } = theme.useToken();

    const runningLoans = loans.filter((l) => l.status === "running");
    const closedLoans = loans.filter((l) => l.status === "closed");

    const totalRunningAmount = runningLoans.reduce((sum, l) => sum + Number(l.loan_amount || 0), 0);
    const totalRunningInterest = runningLoans.reduce((sum, l) => sum + Number(l.interest_amount || 0), 0);

    const cardStyle: React.CSSProperties = {
        background: token.colorBgContainer,
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: token.boxShadowTertiary,
        transition: "all 0.2s ease",
    };

    const titleStyle: React.CSSProperties = {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.05em",
        color: token.colorTextSecondary,
        textTransform: "uppercase",
    };

    return (
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={12} lg={6}>
                <Card bordered={false} style={cardStyle} styles={{ body: { padding: "16px 20px" } }}>
                    <Statistic
                        title={<span style={titleStyle}>Running Loan Amount</span>}
                        value={totalRunningAmount}
                        loading={loading}
                        prefix={<Coins size={18} style={{ color: token.colorWarning, marginRight: 8, verticalAlign: "middle" }} />}
                        formatter={(val) => `₹${Number(val).toLocaleString("en-IN")}`}
                        valueStyle={{ color: token.colorText, fontWeight: 700, fontSize: 22 }}
                    />
                </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
                <Card bordered={false} style={cardStyle} styles={{ body: { padding: "16px 20px" } }}>
                    <Statistic
                        title={<span style={titleStyle}>Total Interest (Running)</span>}
                        value={totalRunningInterest}
                        loading={loading}
                        prefix={<Banknote size={18} style={{ color: token.colorSuccess, marginRight: 8, verticalAlign: "middle" }} />}
                        formatter={(val) => `₹${Number(val).toLocaleString("en-IN")}`}
                        valueStyle={{ color: token.colorText, fontWeight: 700, fontSize: 22 }}
                    />
                </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
                <Card bordered={false} style={cardStyle} styles={{ body: { padding: "16px 20px" } }}>
                    <Statistic
                        title={<span style={titleStyle}>Running Loans</span>}
                        value={runningLoans.length}
                        loading={loading}
                        prefix={<Clock size={18} style={{ color: token.colorPrimary, marginRight: 8, verticalAlign: "middle" }} />}
                        valueStyle={{ color: token.colorText, fontWeight: 700, fontSize: 22 }}
                    />
                </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
                <Card bordered={false} style={cardStyle} styles={{ body: { padding: "16px 20px" } }}>
                    <Statistic
                        title={<span style={titleStyle}>Closed Loans</span>}
                        value={closedLoans.length}
                        loading={loading}
                        prefix={<CheckCircle2 size={18} style={{ color: token.colorSuccess, marginRight: 8, verticalAlign: "middle" }} />}
                        valueStyle={{ color: token.colorText, fontWeight: 700, fontSize: 22 }}
                    />
                </Card>
            </Col>
        </Row>
    );
};
