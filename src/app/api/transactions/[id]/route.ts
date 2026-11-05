import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { readJson } from "@/lib/api";
import { fieldErrorsFromZod } from "@/lib/clients/schema";
import { requireApiFirmContext } from "@/lib/firm-context";
import { assertPermission } from "@/lib/rbac";
import { transactionUpdateSchema } from "@/lib/transactions/schema";
import {
  deleteTransaction,
  TransactionNotFoundError,
  TransactionReferenceError,
  updateTransaction,
} from "@/lib/transactions/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { firmId, role, userId } = await requireApiFirmContext();
    assertPermission(role, "client.write");
    const { id } = await params;

    const parsed = transactionUpdateSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "Please correct the highlighted fields.", {
        details: { fields: fieldErrorsFromZod(parsed.error) },
      });
    }

    try {
      return NextResponse.json({
        data: await updateTransaction(firmId, id, parsed.data, userId),
      });
    } catch (error) {
      if (error instanceof TransactionNotFoundError) {
        throw new ApiError("NOT_FOUND", error.message);
      }
      if (error instanceof TransactionReferenceError) {
        throw new ApiError("BAD_REQUEST", error.message);
      }
      throw error;
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { firmId, role, userId } = await requireApiFirmContext();
    assertPermission(role, "client.write");
    const { id } = await params;
    try {
      await deleteTransaction(firmId, id, userId);
      return NextResponse.json({ data: { id } });
    } catch (error) {
      if (error instanceof TransactionNotFoundError) {
        throw new ApiError("NOT_FOUND", error.message);
      }
      throw error;
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
