import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { readJson } from "@/lib/api";
import { fieldErrorsFromZod } from "@/lib/clients/schema";
import { requireApiFirmContext } from "@/lib/firm-context";
import { invoiceUpdateSchema } from "@/lib/invoices/schema";
import {
  deleteInvoice,
  getInvoice,
  InvoiceConflictError,
  InvoiceNotFoundError,
  InvoiceReferenceError,
  InvoiceStatusError,
  updateInvoice,
} from "@/lib/invoices/service";
import { assertPermission } from "@/lib/rbac";

type RouteContext = { params: Promise<{ id: string }> };

function mapError(error: unknown): unknown {
  if (error instanceof InvoiceNotFoundError) return new ApiError("NOT_FOUND", error.message);
  if (error instanceof InvoiceConflictError) return new ApiError("CONFLICT", error.message);
  if (error instanceof InvoiceReferenceError) return new ApiError("BAD_REQUEST", error.message);
  if (error instanceof InvoiceStatusError) return new ApiError("CONFLICT", error.message);
  return error;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "invoice.read");
    const { id } = await params;
    const invoice = await getInvoice(firmId, id);
    if (!invoice) throw new ApiError("NOT_FOUND", "Invoice not found.");
    return NextResponse.json({ data: invoice });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { firmId, role, userId } = await requireApiFirmContext();
    assertPermission(role, "invoice.write");
    const { id } = await params;
    const body = await readJson(request);
    if (body === undefined) throw new ApiError("BAD_REQUEST", "Request body must be valid JSON.");

    const parsed = invoiceUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "Please correct the highlighted fields.", {
        details: { fields: fieldErrorsFromZod(parsed.error) },
      });
    }

    try {
      return NextResponse.json({
        data: await updateInvoice(firmId, id, parsed.data, userId),
      });
    } catch (error) {
      throw mapError(error);
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { firmId, role, userId } = await requireApiFirmContext();
    assertPermission(role, "invoice.write");
    const { id } = await params;
    try {
      await deleteInvoice(firmId, id, userId);
      return NextResponse.json({ data: { id } });
    } catch (error) {
      throw mapError(error);
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
