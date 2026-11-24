"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";

interface CurrentUser {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: "user" | "admin";
}

interface UserProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  salesCount: number;
  status: "Active" | "Draft";
  createdAt: string;
  ownerId?: string;
}

interface ApiProductItem {
  _id?: string;
  id?: string;
  name?: string;
  category?: string;
  price?: number | string;
  salesCount?: number | string;
  sales?: number | string;
  status?: string;
  createdAt?: string;
  ownerId?: string;
  userId?: string;
  createdBy?: string;
}

interface SalesChartPoint {
  key: string;
  label: string;
  revenue: number;
  units: number;
}

const fallbackProducts: UserProduct[] = [
  {
    id: "up-1",
    name: "Minimal UI Pack",
    category: "Templates",
    price: 39,
    salesCount: 14,
    status: "Active",
    createdAt: "2026-11-12",
  },
  {
    id: "up-2",
    name: "Dashboard Wireframe Kit",
    category: "UI Kits",
    price: 25,
    salesCount: 9,
    status: "Active",
    createdAt: "2026-11-18",
  },
  {
    id: "up-3",
    name: "Notion Creator System",
    category: "Tools",
    price: 19,
    salesCount: 5,
    status: "Draft",
    createdAt: "2026-11-21",
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

export default function UserProductsSalesPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [products, setProducts] = useState<UserProduct[]>(fallbackProducts);

  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Draft">(
    "all"
  );

  // Quick add product state
  const [name, setName] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [status, setStatus] = useState<"Active" | "Draft">("Active");

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    let loggedInUser: CurrentUser | null = null;

    try {
      const meRes = await fetch("/api/me", { cache: "no-store" });
      if (meRes.ok) {
        const meData = (await meRes.json()) as CurrentUser | null;
        if (meData && (meData._id || meData.id || meData.email)) {
          loggedInUser = meData;
          setCurrentUser(meData);
        }
      }
    } catch {
      // Ignore if /api/me is unreachable
    }

    const userId = loggedInUser?._id ?? loggedInUser?.id;

    try {
      const endpoint = userId
        ? `/api/products?userId=${encodeURIComponent(userId)}`
        : "/api/products";
      const prodRes = await fetch(endpoint, { cache: "no-store" });

      if (prodRes.ok) {
        const rawData:
          | ApiProductItem[]
          | { products?: ApiProductItem[]; data?: ApiProductItem[] } =
          await prodRes.json();

        const list: ApiProductItem[] | undefined = Array.isArray(rawData)
          ? rawData
          : rawData.products ?? rawData.data;

        if (Array.isArray(list)) {
          const mapped: UserProduct[] = list.map(
            (item: ApiProductItem, idx: number): UserProduct => ({
              id: String(item._id ?? item.id ?? `prod-${idx}`),
              name: item.name ?? "Untitled Product",
              category: item.category ?? "General",
              price: Number(item.price ?? 0),
              salesCount: Number(item.salesCount ?? item.sales ?? 0),
              status: item.status === "Draft" ? "Draft" : "Active",
              createdAt: item.createdAt
                ? String(item.createdAt).slice(0, 10)
                : formatDateKey(new Date()),
              ownerId: item.ownerId ?? item.userId ?? item.createdBy,
            })
          );

          const owned = userId
            ? mapped.filter(
                (p: UserProduct) => !p.ownerId || p.ownerId === userId
              )
            : mapped;

          setProducts(owned.length > 0 ? owned : mapped);
        }
      }
    } catch {
      // Keep fallbackProducts if /api/products is unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const numericPrice = Number(price);
    if (
      !name.trim() ||
      !category.trim() ||
      Number.isNaN(numericPrice) ||
      numericPrice <= 0
    ) {
      return;
    }

    setSubmitting(true);
    setNotice(null);

    const userId = currentUser?._id ?? currentUser?.id;
    const payload = {
      name: name.trim(),
      category: category.trim(),
      price: numericPrice,
      status,
      ...(userId ? { userId, ownerId: userId } : {}),
    };

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created = (await res.json()) as ApiProductItem;
        const newItem: UserProduct = {
          id: String(created._id ?? created.id ?? `prod-${Date.now()}`),
          name: created.name ?? payload.name,
          category: created.category ?? payload.category,
          price: Number(created.price ?? payload.price),
          salesCount: Number(created.salesCount ?? created.sales ?? 0),
          status: created.status === "Draft" ? "Draft" : "Active",
          createdAt: created.createdAt
            ? String(created.createdAt).slice(0, 10)
            : formatDateKey(new Date()),
          ownerId: userId,
        };
        setProducts((prev: UserProduct[]) => [newItem, ...prev]);
      } else {
        const localItem: UserProduct = {
          id: `prod-${Date.now()}`,
          name: payload.name,
          category: payload.category,
          price: payload.price,
          salesCount: 0,
          status: payload.status,
          createdAt: formatDateKey(new Date()),
          ownerId: userId,
        };
        setProducts((prev: UserProduct[]) => [localItem, ...prev]);
        setNotice("Product added locally.");
      }

      setName("");
      setCategory("");
      setPrice("");
      setStatus("Active");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setProducts((prev: UserProduct[]) =>
      prev.filter((p: UserProduct) => p.id !== id)
    );

    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setNotice("Product removed from current view.");
      }
    } catch {
      setNotice("Product removed from current view.");
    }
  };

  const filteredProducts = useMemo<UserProduct[]>(() => {
    return products.filter((p: UserProduct) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  const totalUnitsSold = useMemo<number>(() => {
    return products.reduce(
      (sum: number, p: UserProduct) => sum + p.salesCount,
      0
    );
  }, [products]);

  const totalRevenue = useMemo<number>(() => {
    return products.reduce(
      (sum: number, p: UserProduct) => sum + p.price * p.salesCount,
      0
    );
  }, [products]);

  // Build 14-day sales chart series from products
  const salesChartPoints = useMemo<SalesChartPoint[]>(() => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 13);

    const mapByDay = new Map<string, SalesChartPoint>();
    for (let i = 0; i < 14; i += 1) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = formatDateKey(d);
      mapByDay.set(key, {
        key,
        label: formatShortLabel(d),
        revenue: 0,
        units: 0,
      });
    }

    products.forEach((p: UserProduct, idx: number) => {
      const parsed = new Date(p.createdAt);
      const dayStart = Number.isNaN(parsed.getTime())
        ? startDate
        : new Date(
            parsed.getFullYear(),
            parsed.getMonth(),
            parsed.getDate()
          );

      const targetKey =
        dayStart >= startDate && dayStart <= now
          ? formatDateKey(dayStart)
          : formatDateKey(
              new Date(
                startDate.getFullYear(),
                startDate.getMonth(),
                startDate.getDate() + (idx % 14)
              )
            );

      const current = mapByDay.get(targetKey);
      if (current) {
        current.units += p.salesCount;
        current.revenue += p.price * p.salesCount;
      }
    });

    return Array.from(mapByDay.values());
  }, [products]);

  const maxRevenue = Math.max(
    ...salesChartPoints.map((pt: SalesChartPoint) => pt.revenue),
    1
  );

  const hoveredPoint = useMemo<SalesChartPoint | null>(() => {
    if (!hoveredKey) return null;
    return (
      salesChartPoints.find((pt: SalesChartPoint) => pt.key === hoveredKey) ??
      null
    );
  }, [hoveredKey, salesChartPoints]);

  return (
    <div className="min-h-screen bg-[#FBF7EB] text-gray-900">
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Top Page Title & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-block px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#F5EBC8] text-[#7A5B09] mb-1">
              MY PRODUCTS & SALES
            </span>
            <h1 className="text-2xl font-bold text-gray-900">
              {currentUser?.name
                ? `${currentUser.name}'s Products`
                : "My Added Products"}
            </h1>
            <p className="text-sm text-gray-500">
              View the products you added and track your sales performance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadData}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-white hover:bg-[#F5EBC8] border border-[#E6D49A] text-[#7A5B09] transition cursor-pointer"
            >
              Refresh
            </button>
       
          </div>
        </div>

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

        {/* Summary KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white border border-[#E6D49A] rounded-2xl p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              My Products
            </p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {loading ? "..." : products.length}
            </p>
            <span className="inline-block mt-2 text-xs text-[#7A5B09] bg-[#F5EBC8] px-2.5 py-0.5 rounded-full font-medium">
              Added by you
            </span>
          </div>

          <div className="bg-white border border-[#E6D49A] rounded-2xl p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Units Sold
            </p>
            <p className="text-3xl font-bold text-[#A87F12] mt-2">
              {loading ? "..." : totalUnitsSold}
            </p>
            <span className="inline-block mt-2 text-xs text-gray-600">
              Total orders completed
            </span>
          </div>

          <div className="bg-white border border-[#E6D49A] rounded-2xl p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Total Sales Revenue
            </p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {loading ? "..." : `$${totalRevenue.toFixed(2)}`}
            </p>
            <span className="inline-block mt-2 text-xs text-[#7A5B09] bg-[#F5EBC8] px-2.5 py-0.5 rounded-full font-medium">
              Estimated earnings
            </span>
          </div>
        </section>

        {/* Sales Chart */}
        <section className="bg-white border border-[#E6D49A] rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#F0E4BD] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Sales Performance Chart
              </h2>
              <p className="text-sm text-gray-500">
                Revenue ($) and units sold across your products over the last 14
                days.
              </p>
            </div>

            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#F5EBC8] text-[#7A5B09]">
              Total Revenue: {loading ? "..." : `$${totalRevenue.toFixed(0)}`}
            </span>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="h-56 w-full bg-[#FBF7EB] animate-pulse rounded-xl border border-[#F0E4BD]" />
            ) : (
              <div className="bg-[#FBF7EB]/60 border border-[#F0E4BD] rounded-xl p-4">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                  <span>
                    {hoveredPoint
                      ? `${hoveredPoint.label}: $${hoveredPoint.revenue.toFixed(
                          2
                        )} (${hoveredPoint.units} sales)`
                      : "Hover over any bar to inspect daily sales"}
                  </span>
                  <span className="font-semibold text-[#7A5B09]">
                    Units Sold: {totalUnitsSold}
                  </span>
                </div>

                <svg
                  viewBox="0 0 680 215"
                  className="w-full h-52 overflow-visible"
                  role="img"
                  aria-label="User product sales chart"
                >
                  {[0, 0.5, 1].map((ratio: number) => {
                    const y = 165 - ratio * 125;
                    const tickValue = Math.round(maxRevenue * ratio);
                    return (
                      <g key={ratio}>
                        <line
                          x1="46"
                          y1={y}
                          x2="665"
                          y2={y}
                          stroke="#E6D49A"
                          strokeDasharray={ratio === 0 ? undefined : "4 4"}
                          strokeWidth="1"
                        />
                        <text
                          x="38"
                          y={y + 4}
                          textAnchor="end"
                          fontSize="10"
                          fill="#7A5B09"
                          fontWeight="600"
                        >
                          ${tickValue}
                        </text>
                      </g>
                    );
                  })}

                  {salesChartPoints.map(
                    (pt: SalesChartPoint, idx: number) => {
                      const plotWidth = 665 - 54;
                      const step = plotWidth / salesChartPoints.length;
                      const barWidth = Math.max(14, step * 0.56);
                      const x = 54 + idx * step + (step - barWidth) / 2;
                      const ratio = pt.revenue / maxRevenue;
                      const barHeight = Math.max(
                        pt.revenue > 0 ? 10 : 4,
                        ratio * 125
                      );
                      const y = 165 - barHeight;
                      const isHovered = hoveredKey === pt.key;

                      return (
                        <g
                          key={pt.key}
                          onMouseEnter={() => setHoveredKey(pt.key)}
                          onMouseLeave={() => setHoveredKey(null)}
                          className="cursor-pointer"
                        >
                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barHeight}
                            rx="6"
                            fill={
                              isHovered
                                ? "#9A740E"
                                : pt.revenue > 0
                                ? "#C89B1E"
                                : "#E6D49A"
                            }
                            opacity={hoveredKey && !isHovered ? 0.55 : 1}
                          />

                          {pt.revenue > 0 && (
                            <text
                              x={x + barWidth / 2}
                              y={y - 6}
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="700"
                              fill="#111827"
                            >
                              ${pt.revenue}
                            </text>
                          )}

                          <text
                            x={x + barWidth / 2}
                            y="188"
                            textAnchor="middle"
                            fontSize="10"
                            fontWeight="600"
                            fill="#4B5563"
                          >
                            {pt.label}
                          </text>
                        </g>
                      );
                    }
                  )}
                </svg>
              </div>
            )}
          </div>
        </section>

        {/* User's Added Products Section */}
        <section className="bg-white border border-[#E6D49A] rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#F0E4BD] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Your Added Products
              </h2>
              <p className="text-sm text-gray-500">
                Add a new product or inspect sales per item.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Search your products..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearch(e.target.value)
                }
                className="px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C89B1E]"
              />

              <select
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setStatusFilter(
                    e.target.value as "all" | "Active" | "Draft"
                  )
                }
                className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#C89B1E]"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>

          {/* Add Product Form */}
          <form
            onSubmit={handleAddProduct}
            className="p-6 bg-[#FBF7EB]/60 border-b border-[#F0E4BD] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Product Name
              </label>
              <input
                type="text"
                placeholder="e.g. Landing Page Kit"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setName(e.target.value)
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
                placeholder="e.g. Templates"
                value={category}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCategory(e.target.value)
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
                placeholder="29"
                value={price}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPrice(e.target.value)
                }
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#C89B1E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setStatus(e.target.value as "Active" | "Draft")
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#C89B1E]"
              >
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#C89B1E] hover:bg-[#B28818] disabled:opacity-60 text-gray-950 transition cursor-pointer"
            >
              {submitting ? "Adding..." : "Add Product"}
            </button>
          </form>

          {/* Products Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FBF7EB] border-b border-[#E6D49A] text-xs font-semibold uppercase text-[#7A5B09]">
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Price</th>
                  <th className="py-3.5 px-6">Sales</th>
                  <th className="py-3.5 px-6">Revenue</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product: UserProduct) => (
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
                      <td className="py-4 px-6 text-gray-700">
                        {product.salesCount} units
                      </td>
                      <td className="py-4 px-6 font-bold text-[#8A670C]">
                        ${(product.price * product.salesCount).toFixed(2)}
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
                      <td className="py-4 px-6 text-right">
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
      </main>
    </div>
  );
}