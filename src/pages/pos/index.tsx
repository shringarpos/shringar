import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Card, Skeleton } from "antd";
import { SaleForm } from "../../components/invoices/sale-form";
import type { ICustomer, IInvoice, IInvoiceItem } from "../../libs/interfaces";
import { supabaseClient } from "../../providers/supabase-client";

type CloneData = IInvoice & { invoice_items?: IInvoiceItem[]; customer?: ICustomer };

export default function CreateSale() {
  const [searchParams] = useSearchParams();
  const cloneId = searchParams.get("clone");

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

  return (
    <SaleForm
      mode={cloneId ? "clone" : "create"}
      existingInvoice={cloneData ?? undefined}
    />
  );
}
