import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { readJson } from "@/lib/api";
import { fieldErrorsFromZod } from "@/lib/clients/schema";
import { requireApiFirmContext } from "@/lib/firm-context";
import { invoiceBulkSchema } from "@/lib/invoices/schema";
import { bulkSetInvoiceStatus } from "@/lib/invoices/service";
import { assertPermission } from "@/lib/rbac";

export async function POST(request: Request) {
  try {
    const { firmId, role, userId } = await requireApiFirmContext();
    assertPermission(role, "invoice.write");
    const parsed = invoiceBulkSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "Invalid bulk action.", {
        details: { fields: fieldErrorsFromZod(parsed.error) },
      });
    }

    return NextResponse.json({
      data: {
        updated: await bulkSetInvoiceStatus(
          firmId,
          parsed.data.ids,
          parsed.data.action,
          userId,
        ),
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
