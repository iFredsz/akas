// app/api/pay/route.ts
import { NextRequest, NextResponse } from "next/server";

interface PakasirTransactionResponse {
  payment?: {
    payment_number: string;
    project: string;
    order_id: string;
    amount: number;
    payment_method: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { order_id: string; amount: number };

    const { order_id, amount } = body;

    if (!order_id || !amount) {
      return NextResponse.json({ error: "Missing order_id or amount" }, { status: 400 });
    }

    const res = await fetch("https://app.pakasir.com/api/transactioncreate/qris", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project: "movie18",
        order_id,
        amount,
        api_key: process.env.PAKASIR_API_KEY
      })
    });

    const data: PakasirTransactionResponse = await res.json();

    if (!data.payment?.payment_number) {
      return NextResponse.json({ error: "Gagal membuat transaksi" }, { status: 500 });
    }

    // URL QRIS only
    const payment_url = `https://app.pakasir.com/pay/movie18/${amount}?order_id=${order_id}&qris_only=1`;

    return NextResponse.json({ payment_url, data });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
