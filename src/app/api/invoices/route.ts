import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { readJson } from "@/lib/api";
import { fieldErrorsFromZod } from "@/lib/clients/schema";
import { requireApiFirmContext } from "@/lib/firm-context";
import { invoiceInputSchema } from "@/lib/invoices/schema";
import {
  createInvoice,
  InvoiceConflictError,
  InvoiceReferenceError,
  listInvoices,
  parseInvoiceQuery,
} from "@/lib/invoices/service";
import { assertPermission } from "@/lib/rbac";

export async function GET(request: Request) {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "invoice.read");
    const query = parseInvoiceQuery(
      Object.fromEntries(new URL(request.url).searchParams) as Record<string, string>,
    );
    return NextResponse.json({ data: await listInvoices(firmId, query) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { firmId, role, userId } = await requireApiFirmContext();
    assertPermission(role, "invoice.write");

    const body = await readJson(request);
    if (body === undefined) throw new ApiError("BAD_REQUEST", "Request body must be valid JSON.");

    const parsed = invoiceInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "Please correct the highlighted fields.", {
        details: { fields: fieldErrorsFromZod(parsed.error) },
      });
    }

    try {
      return NextResponse.json(
        { data: await createInvoice(firmId, parsed.data, userId) },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof InvoiceConflictError) {
        throw new ApiError("CONFLICT", error.message);
      }
      if (error instanceof InvoiceReferenceError) {
        throw new ApiError("BAD_REQUEST", error.message);
      }
      throw error;
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
