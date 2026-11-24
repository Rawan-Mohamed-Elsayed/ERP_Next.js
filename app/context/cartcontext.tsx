"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
} from "react";

export interface CartProduct {
  id: string;
  name: string;
  category: string;
  price: number;
}

export interface CartItem {
  product: CartProduct;
  quantity: number;
}

export interface OrderItemPayload {
  product: string;
  quantity: number;
}

export interface PlaceOrderResult {
  ok: boolean;
  status: number;
  message: string;
  orderId?: string;
}

interface CartContextValue {
  items: CartItem[];
  totalUnits: number;
  totalPrice: number;
  submitting: boolean;
  addItem: (product: CartProduct, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  incrementItem: (productId: string) => void;
  decrementItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  getOrderPayload: () => { items: OrderItemPayload[]; totalPrice: number };
  placeOrder: () => Promise<PlaceOrderResult>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const addItem = useCallback((product: CartProduct, quantity: number = 1) => {
    const qtyToAdd = Math.max(1, Math.floor(quantity));
    setItems((prev: CartItem[]) => {
      const existingIndex = prev.findIndex(
        (entry: CartItem) => entry.product.id === product.id
      );
      if (existingIndex > -1) {
        return prev.map((entry: CartItem, idx: number) =>
          idx === existingIndex
            ? { ...entry, quantity: entry.quantity + qtyToAdd }
            : entry
        );
      }
      return [...prev, { product, quantity: qtyToAdd }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev: CartItem[]) =>
        prev.filter((entry: CartItem) => entry.product.id !== productId)
      );
      return;
    }

    const nextQty = Math.floor(quantity);
    setItems((prev: CartItem[]) =>
      prev.map((entry: CartItem) =>
        entry.product.id === productId ? { ...entry, quantity: nextQty } : entry
      )
    );
  }, []);

  const incrementItem = useCallback((productId: string) => {
    setItems((prev: CartItem[]) =>
      prev.map((entry: CartItem) =>
        entry.product.id === productId
          ? { ...entry, quantity: entry.quantity + 1 }
          : entry
      )
    );
  }, []);

  const decrementItem = useCallback((productId: string) => {
    setItems((prev: CartItem[]) =>
      prev
        .map((entry: CartItem) =>
          entry.product.id === productId
            ? { ...entry, quantity: entry.quantity - 1 }
            : entry
        )
        .filter((entry: CartItem) => entry.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev: CartItem[]) =>
      prev.filter((entry: CartItem) => entry.product.id !== productId)
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalUnits = useMemo<number>(() => {
    return items.reduce((sum: number, entry: CartItem) => sum + entry.quantity, 0);
  }, [items]);

  const totalPrice = useMemo<number>(() => {
    const sum = items.reduce(
      (acc: number, entry: CartItem) => acc + entry.product.price * entry.quantity,
      0
    );
    return Number(sum.toFixed(2));
  }, [items]);

  const getOrderPayload = useCallback(() => {
    const payloadItems: OrderItemPayload[] = items.map(
      (entry: CartItem): OrderItemPayload => ({
        product: entry.product.id,
        quantity: entry.quantity,
      })
    );
    return {
      items: payloadItems,
      totalPrice,
    };
  }, [items, totalPrice]);

  const placeOrder = useCallback(async (): Promise<PlaceOrderResult> => {
    if (items.length === 0) {
      return {
        ok: false,
        status: 400,
        message: "Cart is empty.",
      };
    }

    setSubmitting(true);
    try {
      const payload = getOrderPayload();
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        order?: { _id?: string; id?: string };
      };

      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          message: data.message || "Failed to place order.",
        };
      }

      const orderId = data.order?._id ?? data.order?.id;
      clearCart();

      return {
        ok: true,
        status: res.status,
        message: data.message || "Order created successfully.",
        orderId,
      };
    } catch {
      return {
        ok: false,
        status: 500,
        message: "Network error while placing order.",
      };
    } finally {
      setSubmitting(false);
    }
  }, [items.length, getOrderPayload, clearCart]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      totalUnits,
      totalPrice,
      submitting,
      addItem,
      updateQuantity,
      incrementItem,
      decrementItem,
      removeItem,
      clearCart,
      getOrderPayload,
      placeOrder,
    }),
    [
      items,
      totalUnits,
      totalPrice,
      submitting,
      addItem,
      updateQuantity,
      incrementItem,
      decrementItem,
      removeItem,
      clearCart,
      getOrderPayload,
      placeOrder,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}