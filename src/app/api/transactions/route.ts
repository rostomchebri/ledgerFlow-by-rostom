import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { readJson } from "@/lib/api";
import { fieldErrorsFromZod } from "@/lib/clients/schema";
import { requireApiFirmContext } from "@/lib/firm-context";
import { listTransactions, parseTransactionQuery } from "@/lib/finance/service";
import { assertPermission } from "@/lib/rbac";
import { transactionInputSchema } from "@/lib/transactions/schema";
import {
  createTransaction,
  TransactionReferenceError,
} from "@/lib/transactions/service";

export async function GET(request: Request) {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "client.read");
    const query = parseTransactionQuery(
      Object.fromEntries(new URL(request.url).searchParams) as Record<string, string>,
    );
    return NextResponse.json({ data: await listTransactions(firmId, query) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { firmId, role, userId } = await requireApiFirmContext();
    assertPermission(role, "client.write");

    const parsed = transactionInputSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "Please correct the highlighted fields.", {
        details: { fields: fieldErrorsFromZod(parsed.error) },
      });
    }

    try {
      return NextResponse.json(
        { data: await createTransaction(firmId, parsed.data, userId) },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof TransactionReferenceError) {
        throw new ApiError("BAD_REQUEST", error.message);
      }
      throw error;
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
