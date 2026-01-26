"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Receipt, Download, MoreHorizontal, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateInvoice } from "@/lib/actions/billing";
import { formatPrice } from "@/lib/billing/plans";

interface Invoice {
  id: string;
  invoice_id: string | null;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded";
  period_start: string;
  period_end: string;
  created_at: string;
  metadata: unknown;
}

interface InvoiceHistoryProps {
  invoices: Invoice[];
  organizationId: string;
  isOwner: boolean;
}

export function InvoiceHistory({
  invoices,
  organizationId,
  isOwner,
}: InvoiceHistoryProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateInvoice = async () => {
    if (!isOwner) {
      toast.error("Only organization owners can generate invoices");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateInvoice(organizationId);
      if (result.success) {
        toast.success("Invoice generated successfully");
      } else {
        toast.error(result.error || "Failed to generate invoice");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-600">Paid</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "refunded":
        return <Badge variant="outline">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Invoice History
            </CardTitle>
            <CardDescription>View and download your invoices</CardDescription>
          </div>
          {isOwner && (
            <Button onClick={handleGenerateInvoice} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Generate Invoice
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="mt-4 text-muted-foreground">No invoices yet</p>
            <p className="text-sm text-muted-foreground">
              Invoices will appear here after your first billing cycle
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <span className="font-mono text-sm">
                      {invoice.invoice_id
                        ? `INV-${invoice.invoice_id.slice(0, 8)}`
                        : `#${invoice.id.slice(0, 8)}`}
                    </span>
                  </TableCell>
                  <TableCell>
                    {formatPeriod(invoice.period_start, invoice.period_end)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatPrice(invoice.amount)}
                  </TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(invoice.created_at)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
