import connectDB from "@/lib/db";
import Order from "@/models/orders";
import "@/models/product";
import "@/models/user";
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
    console.error("ADMIN ORDERS AUTH ERROR:", authErr);
    return NextResponse.json(
      { message: "Invalid or expired token" },
      { status: 401 }
    );
  }

  if (payload?.role !== "admin") {
    return NextResponse.json(
      { message: "Forbidden: Admin access required" },
      { status: 403 }
    );
  }

  try {
    await connectDB();

    const orders = await Order.find({})
      .populate("user", "name email role")
      .populate("items.product")
      .sort({ createdAt: -1 });

    return NextResponse.json(orders, { status: 200 });
  } catch (err) {
    console.error("ADMIN ORDERS GET ERROR:", err);
    return NextResponse.json(
      { message: "Server Error" },
      { status: 500 }
    );
  }
}