"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useCart, CartProduct, CartItem } from "@/app/context/cartcontext";

interface ApiProductDoc {
  _id?: string;
  id?: string;
  name?: string;
  category?: string;
  price?: number | string;
}

const isValidObjectId = (value: string): boolean =>
  /^[a-f\d]{24}$/i.test(value);

export default function CartPage() {
  const {
    items,
    totalUnits,
    totalPrice,
    submitting,
    addItem,
    incrementItem,
    decrementItem,
    removeItem,
    clearCart,
    placeOrder,
  } = useCart();

  const [catalog, setCatalog] = useState<CartProduct[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(true);
  const [statusBanner, setStatusBanner] = useState<{
    type: "success" | "error";
    text: string;
    orderId?: string;
    needsLogin?: boolean;
  } | null>(null);

  const loadProductsFromDB = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      if (!res.ok) {
        setCatalog([]);
        return;
      }

      const rawData:
        | ApiProductDoc[]
        | { products?: ApiProductDoc[]; data?: ApiProductDoc[] } =
        await res.json();

      const list: ApiProductDoc[] | undefined = Array.isArray(rawData)
        ? rawData
        : rawData.products ?? rawData.data;

      if (Array.isArray(list)) {
        const mapped: CartProduct[] = list
          .map((doc: ApiProductDoc, idx: number): CartProduct => ({
            id: String(doc._id ?? doc.id ?? `item-${idx}`),
            name: doc.name ?? "Untitled Product",
            category: doc.category ?? "General",
            price: Number(doc.price ?? 0),
          }))
          .filter((prod: CartProduct) => isValidObjectId(prod.id));

        setCatalog(mapped);
      }
    } catch {
      setCatalog([]);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    loadProductsFromDB();
  }, [loadProductsFromDB]);

  const handleAddProduct = (product: CartProduct) => {
    setStatusBanner(null);
    addItem(product, 1);
  };

  const handleConfirmOrder = async () => {
    if (items.length === 0 || submitting) return;
    setStatusBanner(null);

    const hasInvalidProductId = items.some(
      (entry: CartItem) => !isValidObjectId(entry.product.id)
    );
    if (hasInvalidProductId) {
      setStatusBanner({
        type: "error",
        text: "Some items do not have a valid MongoDB product ID. Please add products from the database catalog.",
      });
      return;
    }

    const result = await placeOrder();

    if (!result.ok) {
      setStatusBanner({
        type: "error",
        text: result.message,
        needsLogin: result.status === 401,
      });
      return;
    }

    setStatusBanner({
      type: "success",
      text: result.message,
      orderId: result.orderId,
    });
  };

  return (
    <div className="min-h-screen bg-[#FBF7EB] text-gray-900">
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
       
            <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
            <p className="text-sm text-gray-500">
              Description {" "}
            </p>
          </div>


        </div>

        {/* Status Banner */}
        {statusBanner && (
          <div
            className={`p-4 rounded-2xl border text-sm flex flex-wrap items-center justify-between gap-3 ${
              statusBanner.type === "success"
                ? "bg-white border-[#C89B1E] text-gray-900 shadow-sm"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold">{statusBanner.text}</span>
              {statusBanner.orderId && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#F5EBC8] text-[#7A5B09] text-xs font-bold">
                  Order ID: {statusBanner.orderId}
                </span>
              )}
              {statusBanner.needsLogin && (
                <Link
                  href="/login"
                  className="px-3 py-1 rounded-lg bg-[#C89B1E] hover:bg-[#B28818] text-gray-950 font-bold text-xs transition"
                >
                  Login
                </Link>
              )}
            </div>

            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-xs font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Cart Items + Order Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <section className="lg:col-span-2 bg-white border border-[#E6D49A] rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#F0E4BD] flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Cart Items ({totalUnits})
              </h2>

              {items.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition cursor-pointer"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-500">
                No items in your cart yet. Select a product below to start an
                order.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map((entry: CartItem) => (
                  <div
                    key={entry.product.id}
                    className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FBF7EB]/50 transition"
                  >
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {entry.product.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {entry.product.category} · $
                        {entry.product.price.toFixed(2)} each
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="inline-flex items-center rounded-lg border border-[#E6D49A] bg-[#FBF7EB]">
                        <button
                          type="button"
                          onClick={() => decrementItem(entry.product.id)}
                          className="px-3 py-1.5 text-sm font-bold text-[#7A5B09] hover:bg-[#F5EBC8] rounded-l-lg transition cursor-pointer"
                        >
                          −
                        </button>
                        <span className="px-3.5 py-1.5 text-sm font-bold text-gray-900 min-w-[2.5rem] text-center">
                          {entry.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => incrementItem(entry.product.id)}
                          className="px-3 py-1.5 text-sm font-bold text-[#7A5B09] hover:bg-[#F5EBC8] rounded-r-lg transition cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <span className="text-sm font-bold text-gray-900 min-w-[72px] text-right">
                        ${(entry.product.price * entry.quantity).toFixed(2)}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeItem(entry.product.id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Summary Card */}
          <aside className="bg-white border border-[#E6D49A] rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="text-lg font-bold text-gray-900 border-b border-[#F0E4BD] pb-3">
              Order Summary
            </h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Products</span>
                <span className="font-semibold text-gray-900">
                  {items.length}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total Units</span>
                <span className="font-semibold text-gray-900">
                  {totalUnits}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#F0E4BD] flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900">
                Total Price
              </span>
              <span className="text-2xl font-bold text-[#A87F12]">
                ${totalPrice.toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleConfirmOrder}
              disabled={items.length === 0 || submitting}
              className="w-full py-3 px-4 rounded-xl bg-[#C89B1E] hover:bg-[#B28818] disabled:opacity-50 text-gray-950 font-bold text-sm transition cursor-pointer shadow-sm"
            >
              {submitting ? "Saving to Database..." : "Place Order"}
            </button>
          </aside>
        </div>

        {/* Products from MongoDB */}
        <section className="bg-white border border-[#E6D49A] rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#F0E4BD] flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Database Products
              </h2>
              <p className="text-sm text-gray-500">
                Loaded from <code className="text-[#7A5B09]">/api/products</code>.
              </p>
            </div>
            {loadingCatalog && (
              <span className="text-xs font-medium text-[#7A5B09]">
                Loading products...
              </span>
            )}
          </div>

          {!loadingCatalog && catalog.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No products found . Add products first so orders can
              reference real product IDs.
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalog.map((product: CartProduct) => (
                <div
                  key={product.id}
                  className="p-4 rounded-xl bg-[#FBF7EB]/70 border border-[#E6D49A] flex flex-col justify-between gap-4"
                >
                  <div>
                    <span className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full bg-[#F5EBC8] text-[#7A5B09] mb-1.5">
                      {product.category}
                    </span>
                    <h3 className="font-bold text-gray-900">{product.name}</h3>
                    <p className="text-lg font-bold text-[#A87F12] mt-1">
                      ${product.price.toFixed(2)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddProduct(product)}
                    className="w-full py-2 px-3 rounded-lg bg-[#C89B1E] hover:bg-[#B28818] text-gray-950 font-semibold text-xs transition cursor-pointer"
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}