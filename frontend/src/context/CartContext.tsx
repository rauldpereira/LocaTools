import React, { createContext, useState, useContext, useEffect, type ReactNode } from 'react';

interface CartItem {
  id_equipamento: number;
  nome: string;
  quantidade: number;
  data_inicio: string;
  data_fim: string;
  preco: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: number) => void;
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

  const addToCart = (item: CartItem) => {
    setCartItems(prevItems => {
      const itemExists = prevItems.find(i => i.id_equipamento === item.id_equipamento);
      if (itemExists) {
        return prevItems.map(i =>
          i.id_equipamento === item.id_equipamento ? { ...i, quantidade: i.quantidade + item.quantidade } : i
        );
      }
      return [...prevItems, item];
    });
  };

  const removeFromCart = (id: number) => {
    setCartItems(prevItems => prevItems.filter(item => item.id_equipamento !== id));
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