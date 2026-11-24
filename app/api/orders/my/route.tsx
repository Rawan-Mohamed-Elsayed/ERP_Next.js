import connectDB from "@/lib/db";
import Order from "@/models/orders";
import "@/models/product";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");

export async function GET() {
  let payload;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const verified = await jwtVerify(token, secret);
    payload = verified.payload;
  } catch (authErr) {
    console.error("ORDERS AUTH ERROR:", authErr);
    return NextResponse.json(
      { message: "Invalid or expired token" },
      { status: 401 }
    );
  }

  const userId = payload?.id ?? payload?.userId;
  if (!userId) {
    return NextResponse.json(
      { message: "Invalid token payload" },
      { status: 401 }
    );
  }

  try {
    await connectDB();

    const orders = await Order.find({ user: userId })
      .populate("items.product")
      .sort({ createdAt: -1 });

    return NextResponse.json(orders, { status: 200 });
  } catch (err) {
    console.error("ORDERS ERROR:", err);
    return NextResponse.json(
      { message: "Server Error" },
      { status: 500 }
    );
  }
}