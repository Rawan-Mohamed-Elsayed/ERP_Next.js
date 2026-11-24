import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Product from "@/models/product";

export async function GET() {
  try {
    await connectDB();
    const products = await Product.find().sort({ createdAt: -1 });
    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { message: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body.name || body.price === undefined) {
      return NextResponse.json(
        { message: "Product name and price are required" },
        { status: 400 }
      );
    }

    const product = await Product.create({
      name: String(body.name).trim(),
      price: Number(body.price),
      description: body.description ? String(body.description) : "",
      image: body.image ? String(body.image) : "",
      category: body.category ? String(body.category).trim() : "General",
      status: body.status === "Draft" ? "Draft" : "Active",
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("POST /api/products error:", error);
    return NextResponse.json(
      { message: "Failed to create product" },
      { status: 500 }
    );
  }
}