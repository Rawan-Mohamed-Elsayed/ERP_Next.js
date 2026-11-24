import connectDB from "@/lib/db";
import Order from "@/models/orders";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, JWTPayload } from "jose";

interface CustomJWTPayload extends JWTPayload {
  id?: string;
  userId?: string;
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");

export async function POST(req: NextRequest) {
  let payload: CustomJWTPayload;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const verified = await jwtVerify(token, secret);
    payload = verified.payload as CustomJWTPayload;
  } catch (authError) {
    console.error("JWT verification failed:", authError);
    return NextResponse.json(
      { message: "Invalid or expired token" },
      { status: 401 }
    );
  }

  const userId = payload.id ?? payload.userId;
  if (!userId) {
    return NextResponse.json(
      { message: "User ID not found in token" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { items, totalPrice } = body ?? {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { message: "Items are required" },
        { status: 400 }
      );
    }

    const numericTotal = Number(totalPrice);
    if (Number.isNaN(numericTotal) || numericTotal < 0) {
      return NextResponse.json(
        { message: "Valid totalPrice is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const order = await Order.create({
      user: userId,
      items,
      totalPrice: numericTotal,
      status: "pending",
    });

    return NextResponse.json(
      { message: "Order created successfully", order },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/orders error:", error);

    const err = error as { name?: string; message?: string };
    if (err?.name === "ValidationError" || err?.name === "CastError") {
      return NextResponse.json(
        { message: err.message || "Invalid order data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Failed to create order" },
      { status: 500 }
    );
  }
}