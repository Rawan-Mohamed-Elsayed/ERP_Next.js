import connectDB from "@/lib/db";

import User from "@/models/user";
import Product from "@/models/product";

import { NextResponse } from "next/server";

export async function GET() {
  await connectDB();

  const users = await User.countDocuments();
  const products = await Product.countDocuments();

  const orders = 20;
  const visits = 40;
  const total_accaunts = 70 ;
  const product = 50 ;

  return NextResponse.json({
    users,
    products,
    orders,
    visits,
    total_accaunts,
    product,
  });
}