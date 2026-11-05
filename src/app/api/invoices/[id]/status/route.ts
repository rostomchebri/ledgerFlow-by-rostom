import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { readJson } from "@/lib/api";
import { fieldErrorsFromZod } from "@/lib/clients/schema";
import { requireApiFirmContext } from "@/lib/firm-context";
import { invoiceStatusSchema } from "@/lib/invoices/schema";
import {
  InvoiceNotFoundError,
  InvoiceStatusError,
  setInvoiceStatus,
} from "@/lib/invoices/service";
import { assertPermission } from "@/lib/rbac";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { firmId, role, userId } = await requireApiFirmContext();
    assertPermission(role, "invoice.write");
    const { id } = await params;
    const parsed = invoiceStatusSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "Invalid invoice status.", {
        details: { fields: fieldErrorsFromZod(parsed.error) },
      });
    }

    try {
      return NextResponse.json({
        data: await setInvoiceStatus(firmId, id, parsed.data.status, userId),
      });
    } catch (error) {
      if (error instanceof InvoiceNotFoundError) throw new ApiError("NOT_FOUND", error.message);
      if (error instanceof InvoiceStatusError) throw new ApiError("CONFLICT", error.message);
      throw error;
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
