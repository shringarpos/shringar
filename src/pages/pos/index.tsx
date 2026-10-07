import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Card, Grid, Skeleton } from "antd";
import { SaleForm } from "../../components/invoices/sale-form";
import { MobilePOS } from "./mobile-pos";
import type { ICustomer, IInvoice, IInvoiceItem } from "../../libs/interfaces";
import { supabaseClient } from "../../providers/supabase-client";

const { useBreakpoint } = Grid;

type CloneData = IInvoice & { invoice_items?: IInvoiceItem[]; customer?: ICustomer };

export default function CreateSale() {
  const [searchParams] = useSearchParams();
  const cloneId = searchParams.get("clone");
  const screens = useBreakpoint();

  const [cloneData, setCloneData] = useState<CloneData | null>(null);
  const [loading, setLoading] = useState(!!cloneId);

  useEffect(() => {
    if (!cloneId) return;
    setLoading(true);
    supabaseClient
      .from("invoices")
      .select("*, customer:customers(*), invoice_items(*)")
      .eq("id", cloneId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setCloneData(data as CloneData);
        setLoading(false);
      });
  }, [cloneId]);

  if (loading) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  // App-first Mobile POS on small viewports
  if (!screens.md) {
    return (
      <MobilePOS
        mode={cloneId ? "clone" : "create"}
        existingInvoice={cloneData ?? undefined}
      />
    );
  }

  // Desktop Comprehensive POS
  return (
    <SaleForm
      mode={cloneId ? "clone" : "create"}
      existingInvoice={cloneData ?? undefined}
    />
  );
}
