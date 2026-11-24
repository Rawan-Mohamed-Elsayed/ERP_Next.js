"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";

interface PopulatedProduct {
  _id?: string;
  id?: string;
  name?: string;
  category?: string;
  price?: number;
}

interface OrderLineItem {
  product?: PopulatedProduct | string | null;
  quantity: number;
}

interface MyOrder {
  _id: string;
  items: OrderLineItem[];
  totalPrice: number;
  status?: "pending" | "processing" | "completed" | "cancelled" | string;
  createdAt?: string;
}

function formatOrderDate(dateStr?: string): string {
  if (!dateStr) return "N/A";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadgeStyle(status: string): string {
  switch (status.toLowerCase()) {
    case "completed":
      return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    case "processing":
      return "bg-sky-100 text-sky-800 border border-sky-200";
    case "cancelled":
      return "bg-red-100 text-red-700 border border-red-200";
    case "pending":
    default:
      return "bg-[#F5EBC8] text-[#7A5B09] border border-[#E6D49A]";
  }
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [unauthorized, setUnauthorized] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchMyOrders = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    setUnauthorized(false);

    try {
      const res = await fetch("/api/orders/my", { cache: "no-store" });

      if (res.status === 401) {
        setUnauthorized(true);
        setOrders([]);
        return;
      }

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        setErrorMessage(errData.message || "Failed to load your orders.");
        setOrders([]);
        return;
      }

      const data = (await res.json()) as MyOrder[] | { orders?: MyOrder[] };
      const list = Array.isArray(data) ? data : data.orders ?? [];
      setOrders(list);
    } catch {
      setErrorMessage("Network error while fetching your orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyOrders();
  }, [fetchMyOrders]);

  const filteredOrders = useMemo<MyOrder[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orders;

    return orders.filter((order: MyOrder) => {
      const matchesId = order._id.toLowerCase().includes(q);
      const matchesProduct = order.items.some((item: OrderLineItem) => {
        if (item.product && typeof item.product === "object") {
          const name = item.product.name?.toLowerCase() ?? "";
          const category = item.product.category?.toLowerCase() ?? "";
          return name.includes(q) || category.includes(q);
        }
        return false;
      });
      return matchesId || matchesProduct;
    });
  }, [orders, searchQuery]);

  const totalSpent = useMemo<number>(() => {
    return orders.reduce(
      (sum: number, order: MyOrder) => sum + Number(order.totalPrice ?? 0),
      0
    );
  }, [orders]);

  const totalItemsPurchased = useMemo<number>(() => {
    return orders.reduce(
      (sum: number, order: MyOrder) =>
        sum +
        order.items.reduce(
          (itemSum: number, item: OrderLineItem) =>
            itemSum + Number(item.quantity ?? 0),
          0
        ),
      0
    );
  }, [orders]);

  return (
    <div className="min-h-screen bg-[#FBF7EB] text-gray-900">
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-block px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#F5EBC8] text-[#7A5B09] mb-1">
              ORDER HISTORY
            </span>
            <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
            <p className="text-sm text-gray-500">
              View all orders you have placed and inspect their items.
            </p>
          </div>
        </div>

        {/* Unauthorized State */}
        {unauthorized && (
          <div className="p-6 rounded-2xl bg-white border border-[#E6D49A] shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Authentication Required
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Please log in to view your personal order history.
              </p>
            </div>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-bold rounded-lg bg-[#C89B1E] hover:bg-[#B28818] text-gray-950 transition"
            >
              Login Now
            </Link>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between gap-4">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* KPI Cards */}
        {!unauthorized && (
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white border border-[#E6D49A] rounded-2xl p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Orders
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {loading ? "..." : orders.length}
              </p>
              <span className="inline-block mt-2 text-xs text-[#7A5B09] bg-[#F5EBC8] px-2.5 py-0.5 rounded-full font-medium">
                Saved in MongoDB
              </span>
            </div>

            <div className="bg-white border border-[#E6D49A] rounded-2xl p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Items Purchased
              </p>
              <p className="text-3xl font-bold text-[#A87F12] mt-2">
                {loading ? "..." : totalItemsPurchased}
              </p>
              <span className="inline-block mt-2 text-xs text-gray-600">
                Across all orders
              </span>
            </div>

            <div className="bg-white border border-[#E6D49A] rounded-2xl p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Spent
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {loading ? "..." : `$${totalSpent.toFixed(2)}`}
              </p>
              <span className="inline-block mt-2 text-xs text-[#7A5B09] bg-[#F5EBC8] px-2.5 py-0.5 rounded-full font-medium">
                All placed orders
              </span>
            </div>
          </section>
        )}

        {/* Orders List Section */}
        {!unauthorized && (
          <section className="bg-white border border-[#E6D49A] rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#F0E4BD] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Your Orders ({filteredOrders.length})
                </h2>
                <p className="text-sm text-gray-500">
                  Sorted from newest to oldest.
                </p>
              </div>

              <input
                type="text"
                placeholder="Search by order ID or product..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
                className="px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C89B1E]"
              />
            </div>

            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((item: number) => (
                  <div
                    key={item}
                    className="h-28 rounded-xl bg-[#FBF7EB] animate-pulse border border-[#F0E4BD]"
                  />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <p className="text-gray-700 font-semibold">
                  {orders.length === 0
                    ? "You haven't placed any orders yet."
                    : "No orders match your search."}
                </p>
                {orders.length === 0 && (
                  <Link
                    href="/cart"
                    className="inline-block px-4 py-2 text-sm font-semibold rounded-lg bg-[#C89B1E] hover:bg-[#B28818] text-gray-950 transition"
                  >
                    Create Your First Order
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#F0E4BD]">
                {filteredOrders.map((order: MyOrder) => {
                  const currentStatus = order.status || "pending";

                  return (
                    <div
                      key={order._id}
                      className="p-6 hover:bg-[#FBF7EB]/40 transition space-y-4"
                    >
                      {/* Order Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wide text-[#7A5B09] bg-[#F5EBC8] px-2.5 py-0.5 rounded-full">
                              Order #{order._id.slice(-8).toUpperCase()}
                            </span>
                            <span
                              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${getStatusBadgeStyle(
                                currentStatus
                              )}`}
                            >
                              {currentStatus}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Placed on {formatOrderDate(order.createdAt)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-gray-500">Total Amount</p>
                          <p className="text-xl font-bold text-[#A87F12]">
                            ${Number(order.totalPrice ?? 0).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Order Line Items */}
                      <div className="bg-[#FBF7EB]/70 border border-[#E6D49A] rounded-xl divide-y divide-[#F0E4BD]">
                        {order.items.map((line: OrderLineItem, idx: number) => {
                          const populated =
                            line.product && typeof line.product === "object"
                              ? line.product
                              : null;
                          const productName =
                            populated?.name ?? "Product (Deleted or Unavailable)";
                          const category = populated?.category ?? "General";
                          const unitPrice = Number(populated?.price ?? 0);

                          return (
                            <div
                              key={`${order._id}-item-${idx}`}
                              className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm"
                            >
                              <div>
                                <span className="font-semibold text-gray-900">
                                  {productName}
                                </span>
                                <span className="ml-2 text-xs text-[#7A5B09] bg-[#F5EBC8] px-2 py-0.5 rounded-full">
                                  {category}
                                </span>
                              </div>

                              <div className="flex items-center gap-4 text-xs sm:text-sm">
                                <span className="text-gray-600">
                                  Qty:{" "}
                                  <strong className="text-gray-900">
                                    {line.quantity}
                                  </strong>
                                </span>
                                {unitPrice > 0 && (
                                  <span className="font-semibold text-gray-900">
                                    ${(unitPrice * line.quantity).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}