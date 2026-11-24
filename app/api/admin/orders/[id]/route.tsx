import connectDB from "@/lib/db";
import Order from "@/models/orders";
import mongoose from "mongoose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, JWTPayload } from "jose";

interface AdminJWTPayload extends JWTPayload {
  role?: string;
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
const ALLOWED_STATUSES = ["pending", "processing", "completed", "cancelled"] as const;
type OrderStatus = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let payload: AdminJWTPayload;

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
    payload = verified.payload as AdminJWTPayload;
  } catch (authErr) {
    console.error("ADMIN ORDER PATCH AUTH ERROR:", authErr);
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
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid order ID" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const nextStatus = body?.status as OrderStatus;

    if (!ALLOWED_STATUSES.includes(nextStatus)) {
      return NextResponse.json(
        {
          message: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    await connectDB();

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status: nextStatus },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Order status updated", order: updatedOrder },
      { status: 200 }
    );
  } catch (err) {
    console.error("ADMIN ORDER PATCH ERROR:", err);
    return NextResponse.json(
      { message: "Server Error" },
      { status: 500 }
    );
  }
}