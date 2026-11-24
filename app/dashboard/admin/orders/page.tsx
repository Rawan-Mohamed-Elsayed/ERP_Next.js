"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";

const ORDER_STATUSES = ["pending", "completed", "rejected"] as const;
type OrderStatus = (typeof ORDER_STATUSES)[number];

interface OrderProduct {
  _id?: string;
  name?: string;
  category?: string;
  price?: number;
}

interface OrderItem {
  product?: OrderProduct | string | null;
  quantity?: number;
}

interface OrderUser {
  _id?: string;
  name?: string;
  email?: string;
}

interface AdminOrder {
  _id: string;
  user?: OrderUser | null;
  items?: OrderItem[];
  totalPrice?: number;
  status?: string;
  createdAt?: string;
}

type AccessState = "ok" | "unauthorized" | "forbidden";

function normalizeOrderStatus(status?: string): OrderStatus {
  const val = (status || "pending").toLowerCase();
  if (val === "completed" || val === "approved") return "completed";
  if (val === "rejected" || val === "cancelled") return "rejected";
  return "pending";
}

function getStatusBadgeClass(status?: string): string {
  switch (normalizeOrderStatus(status)) {
    case "completed":
      return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    case "rejected":
      return "bg-red-100 text-red-700 border border-red-200";
    case "pending":
    default:
      return "bg-[#F5EBC8] text-[#7A5B09] border border-[#E6D49A]";
  }
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

export default function AdminOrdersDashboardPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [accessState, setAccessState] = useState<AccessState>("ok");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const fetchAllOrders = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    setAccessState("ok");

    try {
      const response = await fetch("/api/admin/orders", {
        cache: "no-store",
      });

      if (response.status === 401) {
        setAccessState("unauthorized");
        setOrders([]);
        return;
      }

      if (response.status === 403) {
        setAccessState("forbidden");
        setOrders([]);
        return;
      }

      if (!response.ok) {
        const errPayload = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        setErrorMessage(errPayload?.message || "Failed to load orders.");
        setOrders([]);
        return;
      }

      const data = (await response.json()) as
        | AdminOrder[]
        | { orders?: AdminOrder[] };
      const list = Array.isArray(data) ? data : data?.orders ?? [];
      setOrders(list);
    } catch (err) {
      console.error("Error fetching admin orders:", err);
      setErrorMessage("Network error while loading orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    if (!orderId || !ORDER_STATUSES.includes(nextStatus)) return;

    setUpdatingOrderId(orderId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        order?: { status?: string };
      };

      if (!response.ok) {
        setErrorMessage(
          payload?.message || "Could not update order status. Please try again."
        );
        return;
      }

      const resolvedStatus = normalizeOrderStatus(
        payload?.order?.status ?? nextStatus
      );

      setOrders((prevOrders) =>
        prevOrders.map((ord) =>
          ord._id === orderId
            ? {
                ...ord,
                status: resolvedStatus,
              }
            : ord
        )
      );

      setSuccessMessage(
        `Order #${String(orderId).slice(-8).toUpperCase()} status set to "${resolvedStatus}".`
      );
    } catch (err) {
      console.error("Error updating order status:", err);
      setErrorMessage("Network error while updating order status.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const pendingCount = orders.filter(
      (o) => normalizeOrderStatus(o.status) === "pending"
    ).length;
    const completedCount = orders.filter(
      (o) => normalizeOrderStatus(o.status) === "completed"
    ).length;
    const rejectedCount = orders.filter(
      (o) => normalizeOrderStatus(o.status) === "rejected"
    ).length;
    const totalRevenue = orders
      .filter((o) => normalizeOrderStatus(o.status) === "completed")
      .reduce((acc, o) => acc + Number(o.totalPrice ?? 0), 0);

    return {
      totalOrders,
      pendingCount,
      completedCount,
      rejectedCount,
      totalRevenue,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      const normalizedStatus = normalizeOrderStatus(order.status);
      const matchesStatus =
        statusFilter === "all" || normalizedStatus === statusFilter;

      if (!matchesStatus) return false;
      if (!query) return true;

      const orderIdMatch = String(order._id || "")
        .toLowerCase()
        .includes(query);
      const userNameMatch = String(order.user?.name || "")
        .toLowerCase()
        .includes(query);
      const userEmailMatch = String(order.user?.email || "")
        .toLowerCase()
        .includes(query);
      const productMatch = Array.isArray(order.items)
        ? order.items.some((line) => {
            const prod = line?.product;
            if (!prod || typeof prod !== "object") return false;
            const prodName = String(prod.name || "").toLowerCase();
            const prodCat = String(prod.category || "").toLowerCase();
            return prodName.includes(query) || prodCat.includes(query);
          })
        : false;

      return (
        orderIdMatch || userNameMatch || userEmailMatch || productMatch
      );
    });
  }, [orders, statusFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-[#FBF7EB] text-gray-900">
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-block px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#F5EBC8] text-[#7A5B09] mb-1">
              ADMIN WORKFLOW
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Orders Control Center
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Review incoming orders: approve to mark as completed or reject .
            </p>
          </div>

          <button
            type="button"
            onClick={fetchAllOrders}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-white hover:bg-[#F5EBC8]/60 text-gray-900 border border-[#E6D49A] shadow-sm transition cursor-pointer disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Orders"}
          </button>
        </div>

        {accessState === "unauthorized" && (
          <div className="p-6 rounded-2xl bg-white border border-[#E6D49A] shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Sign In Required
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Please sign in with an admin account to access orders management.
              </p>
            </div>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-bold rounded-lg bg-[#C89B1E] hover:bg-[#B28818] text-gray-950 transition"
            >
              Go to Login
            </Link>
          </div>
        )}

        {/*
        {accessState === "forbidden" && (
          <div className="p-6 rounded-2xl bg-red-50 border border-red-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-red-900">
                Access Denied (Admin Only)
              </h2>
              <p className="text-sm text-red-700 mt-0.5">
                Your current account does not have administrator privileges.
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 text-sm font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
            >
              Back to Store
            </Link>
          </div>
        )}
        */}

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

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center justify-between gap-4">
            <span>{successMessage}</span>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="text-xs font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {accessState === "ok" && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-[#E6D49A] rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Orders
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1.5">
                {loading ? "..." : metrics.totalOrders}
              </p>
            </div>

            <div className="bg-white border border-[#E6D49A] rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Pending
              </p>
              <p className="text-2xl font-bold text-[#7A5B09] mt-1.5">
                {loading ? "..." : metrics.pendingCount}
              </p>
            </div>

            <div className="bg-white border border-[#E6D49A] rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Completed
              </p>
              <p className="text-2xl font-bold text-emerald-700 mt-1.5">
                {loading ? "..." : metrics.completedCount}
              </p>
            </div>

            <div className="bg-white border border-[#E6D49A] rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Rejected
              </p>
              <p className="text-2xl font-bold text-red-700 mt-1.5">
                {loading ? "..." : metrics.rejectedCount}
              </p>
            </div>

            <div className="bg-white border border-[#E6D49A] rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Completed Value
              </p>
              <p className="text-2xl font-bold text-[#A87F12] mt-1.5">
                {loading ? "..." : `$${metrics.totalRevenue.toFixed(2)}`}
              </p>
            </div>
          </section>
        )}

        {accessState === "ok" && (
          <section className="bg-white border border-[#E6D49A] rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#F0E4BD] space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    All Customer Orders ({filteredOrders.length})
                  </h2>
                  <p className="text-sm text-gray-500">
                    Use Approve to set status to completed, Reject to set status to rejected, or leave as pending.
                  </p>
                </div>

                <input
                  type="text"
                  placeholder="Search order ID, customer, email, or item..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchQuery(e.target.value)
                  }
                  className="w-full md:w-80 px-3.5 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C89B1E]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {["all", ...ORDER_STATUSES].map((tab) => {
                  const isActive = statusFilter === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setStatusFilter(tab)}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-full capitalize transition cursor-pointer ${
                        isActive
                          ? "bg-[#C89B1E] text-gray-950"
                          : "bg-[#FBF7EB] text-gray-700 hover:bg-[#F5EBC8] border border-[#E6D49A]"
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>

            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-32 rounded-xl bg-[#FBF7EB] animate-pulse border border-[#F0E4BD]"
                  />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-700 font-semibold">
                  No orders found matching your current filter.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F0E4BD]">
                {filteredOrders.map((order) => {
                  const currentStatus = normalizeOrderStatus(order.status);
                  const isUpdating = updatingOrderId === order._id;
                  const customerName = order.user?.name || "Unknown User";
                  const customerEmail = order.user?.email || "No email";

                  return (
                    <div
                      key={order._id}
                      className="p-6 hover:bg-[#FBF7EB]/40 transition space-y-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wide text-[#7A5B09] bg-[#F5EBC8] px-2.5 py-0.5 rounded-full">
                              Order #{String(order._id || "").slice(-8).toUpperCase()}
                            </span>
                            <span
                              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${getStatusBadgeClass(
                                currentStatus
                              )}`}
                            >
                              {currentStatus}
                            </span>
                          </div>

                          <p className="text-sm font-medium text-gray-800">
                            Customer:{" "}
                            <span className="font-bold text-gray-900">
                              {customerName}
                            </span>{" "}
                            <span className="text-xs text-gray-500">
                              ({customerEmail})
                            </span>
                          </p>

                          <p className="text-xs text-gray-500">
                            Created on {formatOrderDate(order.createdAt)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Total Amount</p>
                            <p className="text-xl font-bold text-[#A87F12]">
                              ${Number(order.totalPrice ?? 0).toFixed(2)}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={isUpdating || currentStatus === "completed"}
                              onClick={() =>
                                handleStatusChange(order._id, "completed")
                              }
                              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Approve (Completed)
                            </button>

                            <button
                              type="button"
                              disabled={isUpdating || currentStatus === "rejected"}
                              onClick={() =>
                                handleStatusChange(order._id, "rejected")
                              }
                              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Reject
                            </button>

                            <select
                              aria-label={`Order ${order._id} status`}
                              value={currentStatus}
                              disabled={isUpdating}
                              onChange={(
                                e: React.ChangeEvent<HTMLSelectElement>
                              ) =>
                                handleStatusChange(
                                  order._id,
                                  normalizeOrderStatus(e.target.value)
                                )
                              }
                              className="px-3 py-2 text-xs font-bold rounded-xl border border-[#E6D49A] bg-[#FBF7EB] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C89B1E] cursor-pointer disabled:opacity-60"
                            >
                              {ORDER_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st.charAt(0).toUpperCase() + st.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#FBF7EB]/70 border border-[#E6D49A] rounded-xl divide-y divide-[#F0E4BD]">
                        {(order.items || []).map((line, idx) => {
                          const prod =
                            line?.product && typeof line.product === "object"
                              ? line.product
                              : null;
                          const itemName =
                            prod?.name || "Product (Deleted or Unavailable)";
                          const itemCategory = prod?.category || "General";
                          const unitPrice = Number(prod?.price ?? 0);
                          const qty = Number(line?.quantity ?? 0);

                          return (
                            <div
                              key={`${order._id}-line-${idx}`}
                              className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-sm"
                            >
                              <div>
                                <span className="font-semibold text-gray-900">
                                  {itemName}
                                </span>
                                <span className="ml-2 text-xs text-[#7A5B09] bg-[#F5EBC8] px-2 py-0.5 rounded-full">
                                  {itemCategory}
                                </span>
                              </div>

                              <div className="flex items-center gap-4 text-xs sm:text-sm">
                                <span className="text-gray-600">
                                  Qty:{" "}
                                  <strong className="text-gray-900">{qty}</strong>
                                </span>
                                {unitPrice > 0 && (
                                  <span className="font-semibold text-gray-900">
                                    ${(unitPrice * qty).toFixed(2)}
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