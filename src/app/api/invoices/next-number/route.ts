import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { requireApiFirmContext } from "@/lib/firm-context";
import { nextInvoiceNumber } from "@/lib/invoices/service";
import { assertPermission } from "@/lib/rbac";

export async function GET() {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "invoice.read");
    return NextResponse.json({ data: { number: await nextInvoiceNumber(firmId) } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
