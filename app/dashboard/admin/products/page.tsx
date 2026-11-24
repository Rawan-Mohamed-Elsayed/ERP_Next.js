"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface Product {
  _id: string;
  name: string;
  price: number | string;
  description?: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    price: "",
    description: "",
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/products");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setProducts(data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setMessage("Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      description: form.description.trim(),
    };

    try {
      if (editingId) {
        const res = await fetch(`/api/products/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setEditingId(null);
          setMessage("Product updated successfully.");
        } else {
          setMessage("Failed to update product.");
        }
      } else {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setMessage("Product added successfully.");
        } else {
          setMessage("Failed to add product.");
        }
      }

      setForm({ name: "", price: "", description: "" });
      await fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      setMessage("Something went wrong while saving.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure to delete this product?")) return;

    try {
      setMessage(null);
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessage("Product deleted successfully.");
        await fetchProducts();
      } else {
        setMessage("Failed to delete product.");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      setMessage("Something went wrong while deleting.");
    }
  };

  const handleEdit = (product: Product) => {
    setMessage(null);
    setForm({
      name: product.name,
      price: String(product.price),
      description: product.description || "",
    });

    setEditingId(product._id);
  };

  return (
    <div className="min-h-screen bg-[#FBF7EB] text-gray-900">
      {/* Top Mustard Accent Bar */}
      <div className="h-1.5 bg-[#C89B1E] w-full" />

      {/* Header */}
      <header className="bg-white border-b border-[#E6D49A]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-[#C89B1E] text-gray-950">
              ADMIN
            </span>
            <h1 className="text-xl font-bold text-gray-900">
              Products Management
            </h1>
          </div>

       
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {message && (
          <div className="px-4 py-3 rounded-xl bg-[#F5EBC8] border border-[#E6D49A] text-sm font-medium text-[#7A5B09]">
            {message}
          </div>
        )}

        {/* Add / Edit Product Form */}
        <section className="bg-white border border-[#E6D49A] rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {editingId ? "Edit Product" : "Add New Product"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Product name"
                  required
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#C89B1E] focus:border-[#C89B1E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Price ($)
                </label>
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#C89B1E] focus:border-[#C89B1E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Product description"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#C89B1E] focus:border-[#C89B1E]"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-[#C89B1E] hover:bg-[#B28818] text-gray-950 font-semibold text-sm transition cursor-pointer disabled:opacity-60"
              >
                {submitting
                  ? "Saving..."
                  : editingId
                  ? "Update Product"
                  : "Add Product"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ name: "", price: "", description: "" });
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-medium text-sm transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Products List */}
        <section className="bg-white border border-[#E6D49A] rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#F0E4BD] flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">All Products</h2>
              <p className="text-sm text-gray-500">
                Manage catalog items stored in MongoDB.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#7A5B09] bg-[#F5EBC8] px-3 py-1 rounded-full">
              {products.length} {products.length === 1 ? "Item" : "Items"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FBF7EB] border-b border-[#E6D49A] text-xs font-semibold uppercase text-[#7A5B09]">
                  <th className="py-3.5 px-6">Name</th>
                  <th className="py-3.5 px-6">Price</th>
                  <th className="py-3.5 px-6">Description</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {loading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-gray-500"
                    >
                      Loading products...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-gray-500"
                    >
                      No products available yet.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr
                      key={product._id}
                      className="hover:bg-[#FBF7EB]/50 transition"
                    >
                      <td className="py-4 px-6 font-medium text-gray-900">
                        {product.name}
                      </td>
                      <td className="py-4 px-6 font-semibold text-[#8A670C]">
                        ${Number(product.price).toFixed(2)}
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        {product.description || "—"}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#C89B1E] text-[#8A670C] hover:bg-[#F5EBC8] transition cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product._id)}
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