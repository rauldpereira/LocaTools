import React, { createContext, useState, useContext, useEffect, type ReactNode } from 'react';

interface CartItem {
  cartItemId: string;
  id_equipamento: number;
  nome: string;
  quantidade: number;
  data_inicio: string;
  data_fim: string;
  preco: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'cartItemId'>) => void; 
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const storedCart = localStorage.getItem('cart');
    return storedCart ? JSON.parse(storedCart) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (itemToAdd: Omit<CartItem, 'cartItemId'>) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(
        i =>
          i.id_equipamento === itemToAdd.id_equipamento &&
          i.data_inicio === itemToAdd.data_inicio &&
          i.data_fim === itemToAdd.data_fim
      );

      if (existingItem) {
        return prevItems.map(i =>
          i.cartItemId === existingItem.cartItemId
            ? { ...i, quantidade: i.quantidade + itemToAdd.quantidade }
            : i
        );
      } else {
        const newItem: CartItem = {
          ...itemToAdd,
          cartItemId: `item-${Date.now()}`
        };
        return [...prevItems, newItem];
      }
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart deve ser usado dentro de um CartProvider');
  }
  return context;
};