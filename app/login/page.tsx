"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      setSuccess(data.message || "Login successful");
      setFormData({ email: "", password: "" });
      setLoading(false);

      const role = String(data?.user?.role || "").toLowerCase();
      const destination =
        role === "admin" ? "/dashboard/admin/orders" : "/dashboard";

      setTimeout(() => {
        router.push(destination);
        router.refresh();
      }, 600);
    } catch (err) {
      console.error("LOGIN SUBMIT ERROR:", err);
      setError("Network error, please try again");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF7EB] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#E6D49A] rounded-2xl shadow-lg overflow-hidden">
        <div className="h-2 bg-[#C89B1E] w-full" />

        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Login</h1>
            <p className="text-sm text-gray-500 mt-1">
              Enter your email and password to access your account.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-800 mb-1.5"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C89B1E] focus:border-[#C89B1E] transition"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-800 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C89B1E] focus:border-[#C89B1E] transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-[#C89B1E] hover:bg-[#B38815] active:bg-[#96710F] text-gray-950 font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition cursor-pointer"
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#A87F12] hover:text-[#8A670C] hover:underline"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}