"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserProfile {
  id?: string;
  name: string;
  email: string;
  role: "user" | "admin" | string;
  memberSince: string;
}

function formatMemberSince(dateValue?: string): string {
  if (!dateValue) return "Recently joined";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "Recently joined";

  return parsed.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function UserDashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const fetchCurrentUser = useCallback(async () => {
    setLoading(true);
    setUnauthorized(false);

    try {
      const res = await fetch("/api/me", {
        cache: "no-store",
      });

      if (res.status === 401 || res.status === 404) {
        setUnauthorized(true);
        setUser(null);
        return;
      }

      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = await res.json();
      const current = data?.user;

      if (current) {
        const formatted: UserProfile = {
          id: current.id,
          name: current.name || "User",
          email: current.email || "",
          role: current.role || "user",
          memberSince: formatMemberSince(current.createdAt),
        };
        setUser(formatted);
        setNameInput(formatted.name);
      }
    } catch (err) {
      console.error("Failed to fetch current user:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nameInput.trim() || !user) return;

    setUser((prev) => (prev ? { ...prev, name: nameInput.trim() } : prev));
    setIsEditing(false);
    setSavedMessage("Profile updated in view.");
    setTimeout(() => setSavedMessage(""), 2500);
  };

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST", cache: "no-store" });
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF7EB] flex items-center justify-center px-4">
        <p className="text-sm font-medium text-gray-600">
          Loading account profile...
        </p>
      </div>
    );
  }

  if (unauthorized || !user) {
    return (
      <div className="min-h-screen bg-[#FBF7EB] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-[#E6D49A] rounded-2xl p-6 shadow-sm text-center space-y-4">
          <h2 className="text-xl font-bold text-gray-900">
            Session Not Found
          </h2>
          <p className="text-sm text-gray-600">
            Please sign in to view your profile and account information.
          </p>
          <Link
            href="/login"
            className="inline-block px-5 py-2.5 rounded-lg bg-[#C89B1E] hover:bg-[#B38815] text-gray-950 font-semibold text-sm transition"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF7EB] text-gray-900">
      <div className="h-1.5 bg-[#C89B1E] w-full" />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <section className="bg-white border border-[#E6D49A] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-[#F5EBC8] text-[#7A5B09] mb-2">
              {user.role === "admin" ? "Admin Area" : "Member Area"}
            </span>
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome back, {user.name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage your account details and session status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {user.role === "admin" && (
              <Link
                href="/dashboard/admin/orders"
                className="px-4 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white font-semibold text-sm shadow-sm transition"
              >
                Admin Orders
              </Link>
            )}

            <button
              type="button"
              onClick={() => {
                setNameInput(user.name);
                setIsEditing((prev) => !prev);
              }}
              className="px-4 py-2.5 rounded-lg bg-[#C89B1E] hover:bg-[#B38815] active:bg-[#96710F] text-gray-950 font-semibold text-sm shadow-sm transition cursor-pointer"
            >
              {isEditing ? "Cancel Edit" : "Edit Profile"}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2.5 rounded-lg bg-white hover:bg-red-50 text-red-700 border border-red-200 font-semibold text-sm transition cursor-pointer"
            >
              Logout
            </button>
          </div>
        </section>

        {savedMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
            {savedMessage}
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border border-[#E6D49A] rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Account Information
            </h3>

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-800 mb-1.5"
                  >
                    Display Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNameInput(e.target.value)
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C89B1E] focus:border-[#C89B1E]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1.5">
                    Email Address (Read-only)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#C89B1E] hover:bg-[#B38815] text-gray-950 font-semibold text-sm shadow-sm transition cursor-pointer"
                >
                  Save Changes
                </button>
              </form>
            ) : (
              <dl className="divide-y divide-gray-100 text-sm">
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-gray-500">Full Name</dt>
                  <dd className="font-medium text-gray-900">{user.name}</dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-gray-500">Email</dt>
                  <dd className="font-medium text-gray-900">{user.email}</dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-gray-500">Account Role</dt>
                  <dd>
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#F5EBC8] text-[#7A5B09]">
                      {user.role}
                    </span>
                  </dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-gray-500">Member Since</dt>
                  <dd className="font-medium text-gray-900">
                    {user.memberSince}
                  </dd>
                </div>
              </dl>
            )}
          </div>

          <div className="bg-white border border-[#E6D49A] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Session Status
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Authenticated via HTTP-only cookie session.
              </p>
              <div className="p-3.5 rounded-xl bg-[#FBF7EB] border border-[#E6D49A] text-xs text-[#7A5B09] font-medium">
                {user.role === "admin"
                  ? "Active Administrator Access"
                  : "Active Standard Access"}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col gap-2 text-sm">
              <Link
                href="/login"
                className="text-[#A87F12] hover:underline font-medium"
              >
                Switch Account
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}