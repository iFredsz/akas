// app/api/transactiondetail/route.ts
import { NextRequest, NextResponse } from "next/server";

interface Transaction {
  amount: number;
  order_id: string;
  project: string;
  status: "completed" | "pending" | "failed";
  payment_method: string;
  completed_at?: string;
}

interface TransactionDetailResponse {
  transaction?: Transaction;
  error?: string;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const order_id = url.searchParams.get("order_id");
    const amount = url.searchParams.get("amount");

    if (!order_id || !amount) {
      return NextResponse.json({ error: "Missing order_id or amount" }, { status: 400 });
    }

    const res = await fetch(
      `https://app.pakasir.com/api/transactiondetail?project=movie18&order_id=${order_id}&amount=${amount}&api_key=${process.env.PAKASIR_API_KEY}`
    );

    const data: { transaction?: Transaction } = await res.json();

    return NextResponse.json(data);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
