"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: string;
}

interface ProductItem {
  id: string;
  name: string;
  category: string;
  price: number;
  status: "Active" | "Draft";
}

interface StatsData {
  users: number;
  products: number;
  orders: number;
  visits: number;
  newUsersLast30Days?: number;
}

interface ApiUserRecord {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  createdAt?: string;
}

interface ApiProductRecord {
  _id?: string;
  id?: string;
  name?: string;
  category?: string;
  price?: number | string;
  status?: string;
}

interface DailySignupPoint {
  dateKey: string;
  label: string;
  count: number;
}

const initialUsers: UserItem[] = [
  {
    id: "1",
    name: "Rawan Mohamed",
    email: "rawan@example.com",
    role: "admin",
    createdAt: "2026-11-20",
  },
  {
    id: "2",
    name: "Ahmed Hassan",
    email: "ahmed@example.com",
    role: "user",
    createdAt: "2026-11-21",
  },
  {
    id: "3",
    name: "Sara Ali",
    email: "sara@example.com",
    role: "user",
    createdAt: "2026-11-22",
  },
];

const initialProducts: ProductItem[] = [
  {
    id: "p1",
    name: "Pro UI Kit",
    category: "Templates",
    price: 49,
    status: "Active",
  },
  {
    id: "p2",
    name: "Analytics Starter",
    category: "Tools",
    price: 29,
    status: "Active",
  },
];

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [stats, setStats] = useState<StatsData>({
    users: initialUsers.length,
    products: initialProducts.length,
    orders: 0,
    visits: 0,
  });

  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [search, setSearch] = useState<string>("");
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "user">("all");

  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [prodName, setProdName] = useState<string>("");
  const [prodCategory, setProdCategory] = useState<string>("");
  const [prodPrice, setProdPrice] = useState<string>("");
  const [prodStatus, setProdStatus] = useState<"Active" | "Draft">("Active");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hoveredDayKey, setHoveredDayKey] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Partial<StatsData>;
      setStats({
        users: typeof data.users === "number" ? data.users : 0,
        products: typeof data.products === "number" ? data.products : 0,
        orders: typeof data.orders === "number" ? data.orders : 0,
        visits: typeof data.visits === "number" ? data.visits : 0,
        newUsersLast30Days:
          typeof data.newUsersLast30Days === "number"
            ? data.newUsersLast30Days
            : undefined,
      });
    } catch {
      // Keep current stats if endpoint is unavailable
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    await fetchStats();

    try {
      const usersRes = await fetch("/api/admin/users", { cache: "no-store" });
      if (usersRes.ok) {
        const usersData: ApiUserRecord[] | { users?: ApiUserRecord[] } =
          await usersRes.json();
        const list: ApiUserRecord[] | undefined = Array.isArray(usersData)
          ? usersData
          : usersData.users;

        if (Array.isArray(list)) {
          setUsers(
            list.map((u: ApiUserRecord, idx: number): UserItem => ({
              id: String(u._id ?? u.id ?? idx),
              name: u.name ?? "Unknown",
              email: u.email ?? "",
              role: u.role === "admin" ? "admin" : "user",
              createdAt: u.createdAt
                ? String(u.createdAt).slice(0, 10)
                : formatDateKey(new Date()),
            }))
          );
        }
      }
    } catch {
      // Fallback to initialUsers
    }

    try {
      const prodRes = await fetch("/api/products", { cache: "no-store" });
      if (prodRes.ok) {
        const prodData: ApiProductRecord[] | { products?: ApiProductRecord[] } =
          await prodRes.json();
        const list: ApiProductRecord[] | undefined = Array.isArray(prodData)
          ? prodData
          : prodData.products;

        if (Array.isArray(list)) {
          setProducts(
            list.map((p: ApiProductRecord, idx: number): ProductItem => ({
              id: String(p._id ?? p.id ?? `p-${idx}`),
              name: p.name ?? "",
              category: p.category ?? "General",
              price: Number(p.price ?? 0),
              status: p.status === "Draft" ? "Draft" : "Active",
            }))
          );
        }
      }
    } catch {
      // Fallback to initialProducts
    } finally {
      setLoading(false);
    }
  }, [fetchStats]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const last30DaysSeries = useMemo<DailySignupPoint[]>(() => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 29);

    const countByDay = new Map<string, number>();

    users.forEach((u: UserItem) => {
      const parsed = new Date(u.createdAt);
      if (Number.isNaN(parsed.getTime())) return;
      const dayStart = new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate()
      );
      if (dayStart >= startDate && dayStart <= now) {
        const key = formatDateKey(dayStart);
        countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
      }
    });

    const points: DailySignupPoint[] = [];
    for (let i = 0; i < 30; i += 1) {
      const current = new Date(startDate);
      current.setDate(startDate.getDate() + i);
      const key = formatDateKey(current);
      points.push({
        dateKey: key,
        label: formatShortLabel(current),
        count: countByDay.get(key) ?? 0,
      });
    }

    return points;
  }, [users]);

  const computedNewUsersCount = useMemo<number>(() => {
    if (typeof stats.newUsersLast30Days === "number") {
      return stats.newUsersLast30Days;
    }
    return last30DaysSeries.reduce(
      (acc: number, pt: DailySignupPoint) => acc + pt.count,
      0
    );
  }, [stats.newUsersLast30Days, last30DaysSeries]);

  const peakDay = useMemo<DailySignupPoint>(() => {
    return last30DaysSeries.reduce(
      (best: DailySignupPoint, item: DailySignupPoint) =>
        item.count > best.count ? item : best,
      last30DaysSeries[0] ?? {
        dateKey: "",
        label: "N/A",
        count: 0,
      }
    );
  }, [last30DaysSeries]);

  const maxDailyCount = Math.max(
    ...last30DaysSeries.map((pt: DailySignupPoint) => pt.count),
    1
  );

  const hoveredPoint = useMemo<DailySignupPoint | null>(() => {
    if (!hoveredDayKey) return null;
    return (
      last30DaysSeries.find(
        (pt: DailySignupPoint) => pt.dateKey === hoveredDayKey
      ) ?? null
    );
  }, [hoveredDayKey, last30DaysSeries]);

  const filteredUsers = users.filter((u: UserItem) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleRoleToggle = async (id: string) => {
    const target = users.find((u: UserItem) => u.id === id);
    if (!target) return;

    const nextRole: "admin" | "user" =
      target.role === "admin" ? "user" : "admin";

    setUsers((prev: UserItem[]) =>
      prev.map((u: UserItem) => (u.id === id ? { ...u, role: nextRole } : u))
    );

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!res.ok) {
        setNotice(
          "Role updated locally (ensure PATCH /api/admin/users/[id] is configured)."
        );
      }
    } catch {
      setNotice("Role updated locally.");
    }
  };

  const handleDeleteUser = async (id: string) => {
    setUsers((prev: UserItem[]) => prev.filter((u: UserItem) => u.id !== id));

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchStats();
      } else {
        setNotice("User removed from the current view.");
      }
    } catch {
      setNotice("User removed from the current view.");
    }
  };

  const resetProductForm = () => {
    setProdName("");
    setProdCategory("");
    setProdPrice("");
    setProdStatus("Active");
    setEditingId(null);
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const numericPrice = Number(prodPrice);
    if (
      !prodName.trim() ||
      !prodCategory.trim() ||
      Number.isNaN(numericPrice) ||
      numericPrice <= 0
    ) {
      return;
    }

    setSubmitting(true);
    setNotice(null);

    const payload: Omit<ProductItem, "id"> = {
      name: prodName.trim(),
      category: prodCategory.trim(),
      price: numericPrice,
      status: prodStatus,
    };

    try {
      if (editingId) {
        const res = await fetch(`/api/products/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        setProducts((prev: ProductItem[]) =>
          prev.map((p: ProductItem) =>
            p.id === editingId ? { ...p, ...payload } : p
          )
        );

        if (res.ok) {
          await fetchStats();
        } else {
          setNotice(
            "Product updated locally (ensure PATCH /api/products/[id] is configured)."
          );
        }
        resetProductForm();
        return;
      }

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created = (await res.json()) as ApiProductRecord;
        const newProduct: ProductItem = {
          id: String(created._id ?? created.id ?? `p-${Date.now()}`),
          name: created.name ?? payload.name,
          category: created.category ?? payload.category,
          price: Number(created.price ?? payload.price),
          status: created.status === "Draft" ? "Draft" : "Active",
        };
        setProducts((prev: ProductItem[]) => [newProduct, ...prev]);
        await fetchStats();
      } else {
        const fallbackProduct: ProductItem = {
          id: `p-${Date.now()}`,
          ...payload,
        };
        setProducts((prev: ProductItem[]) => [fallbackProduct, ...prev]);
        setNotice(
          "Product added locally (ensure POST /api/products is configured)."
        );
      }

      resetProductForm();
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProduct = (product: ProductItem) => {
    setEditingId(product.id);
    setProdName(product.name);
    setProdCategory(product.category);
    setProdPrice(String(product.price));
    setProdStatus(product.status);
  };

  const handleDeleteProduct = async (id: string) => {
    setProducts((prev: ProductItem[]) =>
      prev.filter((p: ProductItem) => p.id !== id)
    );
    if (editingId === id) {
      resetProductForm();
    }

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchStats();
      } else {
        setNotice("Product removed from the current view.");
      }
    } catch {
      setNotice("Product removed from the current view.");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const totalAdmins = users.filter((u: UserItem) => u.role === "admin").length;
  const totalRegularUsers = users.filter(
    (u: UserItem) => u.role === "user"
  ).length;

  return (
    <div className="min-h-screen bg-[#FBF7EB] text-gray-900">
      <div className="h-1.5 bg-[#C89B1E] w-full" />

      <header className="bg-white border-b border-[#E6D49A]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-[#C89B1E] text-gray-950">
              ADMIN
            </span>
            <h1 className="text-xl font-bold text-gray-900">
              Control Dashboard
            </h1>
          </div>


        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {notice && (
          <div className="p-3.5 rounded-xl bg-[#F5EBC8] border border-[#E6D49A] text-sm text-[#7A5B09] flex items-center justify-between gap-4">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-xs font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Stats Cards (KPIs) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white border border-[#E6D49A] rounded-2xl p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Total Users
            </p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {loading ? "..." : stats.users}
            </p>
            <span className="inline-block mt-2 text-xs text-[#7A5B09] bg-[#F5EBC8] px-2.5 py-0.5 rounded-full font-medium">
              Admins: {totalAdmins} · Users: {totalRegularUsers}
            </span>
          </div>

          <div className="bg-white border border-[#E6D49A] rounded-2xl p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Products
            </p>
            <p className="text-3xl font-bold text-[#A87F12] mt-2">
              {loading ? "..." : stats.products}
            </p>
            <span className="inline-block mt-2 text-xs text-gray-600">
              Catalog items
            </span>
          </div>

          <div className="bg-white border border-[#E6D49A] rounded-2xl p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Orders
            </p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {loading ? "..." : stats.orders}
            </p>
            <span className="inline-block mt-2 text-xs text-gray-600">
              Total orders
            </span>
          </div>

          <div className="bg-white border border-[#E6D49A] rounded-2xl p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Visits
            </p>
            <p className="text-3xl font-bold text-[#A87F12] mt-2">
              {loading ? "..." : stats.visits}
            </p>
            <span className="inline-block mt-2 text-xs text-gray-600">
              Total visits
            </span>
          </div>
        </section>

        {/* New Users Last 30 Days Chart */}
        <section className="bg-white border border-[#E6D49A] rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#F0E4BD] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                New Users (Last 30 Days)
              </h2>
              <p className="text-sm text-gray-500">
                Daily user registrations over the past 30 days.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#F5EBC8] text-[#7A5B09]">
                30d Signups: {loading ? "..." : computedNewUsersCount}
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#FBF7EB] border border-[#E6D49A] text-gray-700">
                Peak: {loading ? "..." : `${peakDay.count} (${peakDay.label})`}
              </span>
              <button
                type="button"
                onClick={fetchDashboardData}
                className="text-xs font-semibold px-3 py-1 rounded-full bg-[#FBF7EB] hover:bg-[#F5EBC8] border border-[#E6D49A] text-[#7A5B09] transition cursor-pointer"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="h-60 w-full bg-[#FBF7EB] animate-pulse rounded-xl border border-[#F0E4BD]" />
            ) : (
              <div className="bg-[#FBF7EB]/60 border border-[#F0E4BD] rounded-xl p-4">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                  <span>
                    {hoveredPoint
                      ? `${hoveredPoint.label} (${hoveredPoint.dateKey}): ${hoveredPoint.count} new user(s)`
                      : "Hover over any day bar to inspect daily new users"}
                  </span>
                  <span className="font-semibold text-[#7A5B09]">
                    Avg/day: {(computedNewUsersCount / 30).toFixed(1)}
                  </span>
                </div>

                <svg
                  viewBox="0 0 720 220"
                  className="w-full h-52 overflow-visible"
                  role="img"
                  aria-label="New users last 30 days bar chart"
                >
                  {[0, 0.5, 1].map((ratio: number) => {
                    const y = 170 - ratio * 130;
                    const tickVal = Math.round(maxDailyCount * ratio);
                    return (
                      <g key={ratio}>
                        <line
                          x1="36"
                          y1={y}
                          x2="704"
                          y2={y}
                          stroke="#E6D49A"
                          strokeDasharray={ratio === 0 ? undefined : "4 4"}
                          strokeWidth="1"
                        />
                        <text
                          x="28"
                          y={y + 4}
                          textAnchor="end"
                          fontSize="10"
                          fill="#7A5B09"
                          fontWeight="600"
                        >
                          {tickVal}
                        </text>
                      </g>
                    );
                  })}

                  {last30DaysSeries.map(
                    (pt: DailySignupPoint, idx: number) => {
                      const plotWidth = 704 - 44;
                      const step = plotWidth / last30DaysSeries.length;
                      const barWidth = Math.max(8, step * 0.62);
                      const x = 44 + idx * step + (step - barWidth) / 2;
                      const ratio = pt.count / maxDailyCount;
                      const barHeight = Math.max(
                        pt.count > 0 ? 10 : 3,
                        ratio * 130
                      );
                      const y = 170 - barHeight;
                      const isHovered = hoveredDayKey === pt.dateKey;
                      const showXLabel =
                        idx === 0 ||
                        idx === 9 ||
                        idx === 19 ||
                        idx === last30DaysSeries.length - 1;

                      return (
                        <g
                          key={pt.dateKey}
                          onMouseEnter={() => setHoveredDayKey(pt.dateKey)}
                          onMouseLeave={() => setHoveredDayKey(null)}
                          className="cursor-pointer"
                        >
                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barHeight}
                            rx="4"
                            fill={
                              isHovered
                                ? "#9A740E"
                                : pt.count > 0
                                ? "#C89B1E"
                                : "#E6D49A"
                            }
                            opacity={
                              hoveredDayKey && !isHovered ? 0.55 : 1
                            }
                          />

                          {pt.count > 0 && (
                            <text
                              x={x + barWidth / 2}
                              y={y - 6}
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="700"
                              fill="#111827"
                            >
                              {pt.count}
                            </text>
                          )}

                          {showXLabel && (
                            <text
                              x={x + barWidth / 2}
                              y="194"
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="600"
                              fill="#4B5563"
                            >
                              {pt.label}
                            </text>
                          )}
                        </g>
                      );
                    }
                  )}
                </svg>
              </div>
            )}
          </div>
        </section>

        {/* Product Management Section */}
        <section className="bg-white border border-[#E6D49A] rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#F0E4BD]">
            <h2 className="text-lg font-bold text-gray-900">
              Product Management
            </h2>
            <p className="text-sm text-gray-500">
              Add, edit, or delete products in the catalog.
            </p>
          </div>

          <form
            onSubmit={handleSaveProduct}
            className="p-6 bg-[#FBF7EB]/60 border-b border-[#F0E4BD] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Product Name
              </label>
              <input
                type="text"
                placeholder="e.g. Design System"
                value={prodName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setProdName(e.target.value)
                }
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#C89B1E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                placeholder="e.g. UI Kits"
                value={prodCategory}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setProdCategory(e.target.value)
                }
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#C89B1E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Price ($)
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="49"
                value={prodPrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setProdPrice(e.target.value)
                }
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#C89B1E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Status
              </label>
              <select
                value={prodStatus}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setProdStatus(e.target.value as "Active" | "Draft")
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#C89B1E]"
              >
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg bg-[#C89B1E] hover:bg-[#B28818] disabled:opacity-60 text-gray-950 transition cursor-pointer"
              >
                {submitting ? "Saving..." : editingId ? "Update" : "Add Product"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetProductForm}
                  className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FBF7EB] border-b border-[#E6D49A] text-xs font-semibold uppercase text-[#7A5B09]">
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Price</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No products added yet.
                    </td>
                  </tr>
                ) : (
                  products.map((product: ProductItem) => (
                    <tr
                      key={product.id}
                      className="hover:bg-[#FBF7EB]/50 transition"
                    >
                      <td className="py-4 px-6 font-medium text-gray-900">
                        {product.name}
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        {product.category}
                      </td>
                      <td className="py-4 px-6 font-semibold text-gray-900">
                        ${product.price.toFixed(2)}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                            product.status === "Active"
                              ? "bg-[#C89B1E] text-gray-950"
                              : "bg-[#F5EBC8] text-[#7A5B09]"
                          }`}
                        >
                          {product.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleEditProduct(product)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#C89B1E] text-[#8A670C] hover:bg-[#F5EBC8] transition cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(product.id)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Users Management Table */}
        <section className="bg-white border border-[#E6D49A] rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#F0E4BD] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                User Management
              </h2>
              <p className="text-sm text-gray-500">
                Manage roles and remove accounts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Search name or email..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearch(e.target.value)
                }
                className="px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C89B1E] focus:border-[#C89B1E]"
              />

              <select
                value={filterRole}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFilterRole(e.target.value as "all" | "admin" | "user")
                }
                className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#C89B1E] focus:border-[#C89B1E]"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FBF7EB] border-b border-[#E6D49A] text-xs font-semibold uppercase text-[#7A5B09]">
                  <th className="py-3.5 px-6">Name</th>
                  <th className="py-3.5 px-6">Email</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6">Joined</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No users match your search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user: UserItem) => (
                    <tr
                      key={user.id}
                      className="hover:bg-[#FBF7EB]/50 transition"
                    >
                      <td className="py-4 px-6 font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="py-4 px-6 text-gray-600">{user.email}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                            user.role === "admin"
                              ? "bg-[#C89B1E] text-gray-950"
                              : "bg-[#F5EBC8] text-[#7A5B09]"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-500">
                        {user.createdAt}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleRoleToggle(user.id)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#C89B1E] text-[#8A670C] hover:bg-[#F5EBC8] transition cursor-pointer"
                        >
                          {user.role === "admin"
                            ? "Demote to User"
                            : "Make Admin"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user.id)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}