import Link from "next/link";
import { useCart } from "../context/cartcontext";
export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FBF7EB] text-gray-900">
      {/* Top Mustard Accent Bar */}
      <div className="h-1.5 bg-[#C89B1E] w-full" />



      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 py-14 space-y-12">
        <section className="bg-white border border-[#E6D49A] rounded-2xl p-8 sm:p-10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-2xl space-y-4">
            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-[#F5EBC8] text-[#7A5B09]">
              Role-Based Access Control • Next.js & MongoDB
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
              Manage your workspace with role-aware access.
            </h1>
            <p className="text-gray-600 text-base leading-relaxed">
              Sign in to access your personalized dashboard—admins manage users
              and roles, while standard users browse products and manage their
              profile.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-xl bg-[#C89B1E] hover:bg-[#B28818] text-gray-950 font-semibold text-sm transition"
              >
                Open Dashboard
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-xl border border-[#E6D49A] bg-[#FBF7EB] hover:bg-[#F5EBC8] text-gray-900 font-semibold text-sm transition"
              >
                Create Account
              </Link>
            </div>
          </div>

          <div className="bg-[#FBF7EB] border border-[#E6D49A] rounded-2xl p-6 space-y-3 shrink-0 md:w-72">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8A670C]">
              Access Levels
            </p>
            <div className="space-y-2 text-sm">
              <div className="p-3 rounded-xl bg-white border border-[#E6D49A]">
                <p className="font-bold text-gray-900">Admin</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  /dashboard/admin • User & role control
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E6D49A]">
                <p className="font-bold text-gray-900">User</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  /dashboard/user • Personal workspace
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}