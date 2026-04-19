import { create } from 'zustand';
import type { Product, CartItem, PaymentMethod } from '@/types/models';

interface CartState {
  items: CartItem[];
  manualAmount: number | null;
  method: PaymentMethod;
  customerPhone: string;
  
  // Actions
  addItem: (product: Product, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setManualAmount: (amount: number | null) => void;
  setMethod: (method: PaymentMethod) => void;
  setCustomerPhone: (phone: string) => void;
  clear: () => void;
  
  // Computed
  total: () => number;
  cogs: () => number;
  grossProfit: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  // Initial state
  items: [],
  manualAmount: null,
  method: 'cash',
  customerPhone: '',

  // Add item to cart
  addItem: (product, quantity) => {
    const { items } = get();
    const existingItem = items.find((item) => item.product.id === product.id);

    if (existingItem) {
      // Update quantity
      set({
        items: items.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                lineTotal: (item.quantity + quantity) * product.sellingPrice,
              }
            : item
        ),
      });
    } else {
      // Add new item
      set({
        items: [
          ...items,
          {
            product,
            quantity,
            lineTotal: quantity * product.sellingPrice,
          },
        ],
      });
    }
  },

  // Remove item from cart
  removeItem: (productId) => {
    set({ items: get().items.filter((item) => item.product.id !== productId) });
  },

  // Update quantity
  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    set({
      items: get().items.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity,
              lineTotal: quantity * item.product.sellingPrice,
            }
          : item
      ),
    });
  },

  // Set manual amount (for quick sale without items)
  setManualAmount: (amount) => {
    set({ manualAmount: amount, items: [] });
  },

  // Set payment method
  setMethod: (method) => {
    set({ method });
  },

  // Set customer phone
  setCustomerPhone: (phone) => {
    set({ customerPhone: phone });
  },

  // Clear cart
  clear: () => {
    set({ items: [], manualAmount: null, customerPhone: '' });
  },

  // Computed: total amount
  total: () => {
    const { items, manualAmount } = get();
    if (manualAmount !== null) {
      return manualAmount;
    }
    return items.reduce((sum, item) => sum + item.lineTotal, 0);
  },

  // Computed: COGS
  cogs: () => {
    const { items } = get();
    return items.reduce((sum, item) => {
      const cost = item.product.costPrice || 0;
      return sum + cost * item.quantity;
    }, 0);
  },

  // Computed: gross profit
  grossProfit: () => {
    const { total, cogs } = get();
    return total() - cogs();
  },

  // Computed: item count
  itemCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  },
}));
