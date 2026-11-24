"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/app/context/cartcontext";

interface CurrentUser {
  id?: string;
  name?: string;
  email?: string;
  role?: "admin" | "user" | string;
}

export default function Header() {
  const pathname = usePathname();
  const { totalUnits } = useCart();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);

  useEffect(() => {
    let active = true;

    async function loadHeaderData() {
      try {
        const meRes = await fetch("/api/me", { cache: "no-store" });
        if (!meRes.ok) {
          if (active) {
            setUser(null);
            setPendingOrdersCount(0);
          }
          return;
        }

        const meData = await meRes.json();
        const currentUser: CurrentUser | null = meData?.user ?? meData ?? null;

        if (!active) return;
        setUser(currentUser);

        // If user is admin, fetch pending orders count for the ERP Cart/Approvals badge
        if (currentUser?.role === "admin") {
          const ordersRes = await fetch("/api/admin/orders", {
            cache: "no-store",
          });
          if (ordersRes.ok) {
            const ordersData = await ordersRes.json();
            const list = Array.isArray(ordersData)
              ? ordersData
              : ordersData?.orders ?? [];
            const pendingCount = list.filter(
              (o: { status?: string }) =>
                (o?.status || "pending").toLowerCase() === "pending"
            ).length;

            if (active) setPendingOrdersCount(pendingCount);
          }
        }
      } catch (err) {
        console.error("Header fetch error:", err);
      } finally {
        if (active) setLoadingUser(false);
      }
    }

    loadHeaderData();
    return () => {
      active = false;
    };
  }, [pathname]);

  const isAdmin = user?.role === "admin";
  const isLoggedIn = Boolean(user && (user.email || user.id || user.role));

  // Admin goes to /dashboard/admin/orders to Accept or Reject pending orders;
  // Regular user goes to /cart to submit their order.
  const cartHref = isAdmin ? "/dashboard/admin/orders" : "/cart";
  const badgeCount = isAdmin ? pendingOrdersCount : totalUnits;

  return (
    <>
      {/* Top Mustard Accent Bar */}
      <div className="h-1.5 bg-[#C89B1E] w-full" />

      {/* Header */}
      <header className="bg-white border-b border-[#E6D49A]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Next<span className="text-[#C89B1E]">Pro</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-5 text-sm font-medium">
            {isAdmin ? (
              <>
                <Link
                  href="/dashboard/admin"
                  className="text-gray-600 hover:text-[#A87F12] transition"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/admin/products"
                  className="text-gray-600 hover:text-[#A87F12] transition"
                >
                  Products
                </Link>
                <Link
                  href="/profile"
                  className="text-gray-600 hover:text-[#A87F12] transition"
                >
                  Profile
                </Link>

                {/* ERP Approvals / Orders Cart for Admin */}
                <Link
                  href={cartHref}
                  title="Review & Accept/Reject Orders"
                  className="relative inline-flex items-center gap-1.5 text-gray-800 hover:text-[#A87F12] font-semibold transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                    />
                  </svg>
                  <span>Cart</span>
                  {badgeCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#C89B1E] text-gray-950">
                      {badgeCount}
                    </span>
                  )}
                </Link>
              </>
            ) : isLoggedIn ? (
              <>

                  <Link
                  href="/dashboard/admin"
                  className="text-gray-600 hover:text-[#A87F12] transition"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/admin/products"
                  className="text-gray-600 hover:text-[#A87F12] transition"
                >
                  Products
                </Link>
                <Link
                  href="/orders"
                  className="text-gray-600 hover:text-[#A87F12] transition"
                >
                  Orders
                </Link>
                <Link
                  href="/profile"
                  className="text-gray-600 hover:text-[#A87F12] transition"
                >
                  Profile
                </Link>

                {/* User Shopping/Requisition Cart */}
                <Link
                  href={cartHref}
                  className="relative inline-flex items-center gap-1.5 text-gray-800 hover:text-[#A87F12] font-semibold transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                    />
                  </svg>
                  <span>Cart</span>
                  {badgeCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#C89B1E] text-gray-950">
                      {badgeCount}
                    </span>
                  )}
                </Link>
              </>
            ) : null}

            {!loadingUser && !isLoggedIn ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-[#A87F12] font-semibold transition"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-lg bg-[#C89B1E] hover:bg-[#B28818] text-gray-950 font-semibold transition"
                >
                  Register
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg bg-[#C89B1E] hover:bg-[#B28818] text-gray-950 font-semibold transition"
              >
                Logout
              </Link>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}