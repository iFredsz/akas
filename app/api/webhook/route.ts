// app/api/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
  const data = await req.json();

  const { order_id, status } = data;

  if (status === "completed") {
    // Update movie atau transaksi di Firebase
    const movieRef = doc(db, "movies", order_id);
    await updateDoc(movieRef, {
      paid: true, // flag agar frontend tahu pembayaran sukses
      completed_at: data.completed_at
    });
  }

  return NextResponse.json({ received: true });
}
