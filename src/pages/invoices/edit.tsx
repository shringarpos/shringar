import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import { App, Card, Skeleton } from "antd";
import { SaleForm } from "../../components/invoices/sale-form";
import type { ICustomer, IInvoice, IInvoiceItem } from "../../../src/libs/interfaces";
import { supabaseClient } from "../../../src/providers/supabase-client";

type EditData = IInvoice & { invoice_items?: IInvoiceItem[]; customer?: ICustomer };

export default function InvoiceEdit() {
  const { id } = useParams<{ id: string }>();
  const { notification } = App.useApp();

  const [data, setData] = useState<EditData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabaseClient
      .from("invoices")
      .select("*, customer:customers(*), invoice_items(*)")
      .eq("id", id)
      .single()
      .then(({ data: inv, error }) => {
        if (error) {
          notification.error({ message: "Failed to load invoice" });
        } else {
          setData(inv as EditData);
        }
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  if (!data) return null;

  // Prevent editing cancelled invoices
  if (data.is_cancelled) {
    return (
      <Card>
        <p>This invoice is cancelled and cannot be edited.</p>
      </Card>
    );
  }

  return <SaleForm mode="edit" existingInvoice={data} />;
}
