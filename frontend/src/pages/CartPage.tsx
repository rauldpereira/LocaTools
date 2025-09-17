import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/CartPage.css';

const CartPage: React.FC = () => {
    const { cartItems, removeFromCart, clearCart } = useCart();
    const { token } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const calculateTotal = () => {
        return cartItems.reduce((total, item) => {
            const oneDay = 24 * 60 * 60 * 1000;
            const startDate = new Date(item.data_inicio);
            const endDate = new Date(item.data_fim);
            const diffDays = Math.round(Math.abs((endDate.getTime() - startDate.getTime()) / oneDay)) + 1;
            return total + (item.preco * item.quantidade * diffDays);
        }, 0);
    };

    const handleCheckout = async () => {
        if (!token) {
            navigate('/login');
            return;
        }
        if (cartItems.length === 0) {
            setError('O carrinho está vazio.');
            return;
        }

        setLoading(true);
        setError(null);

        const itemsToReserve = cartItems.map(item => ({
            id_equipamento: item.id_equipamento,
            quantidade: item.quantidade,
            data_inicio: item.data_inicio,
            data_fim: item.data_fim,
        }));

        try {
            const config = {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            };
            await axios.post('http://localhost:3001/api/reservations', { itens: itemsToReserve }, config);
            clearCart();
            navigate('/my-reservations');
        } catch (err) {
            setError('Erro ao finalizar a reserva. Tente novamente.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="cart-container">
                <h1 className="cart-title">Meu Carrinho</h1>
                {cartItems.length === 0 ? (
                    <p className="empty-cart-message">Seu carrinho está vazio.</p>
                ) : (
                    <>
                        <ul className="cart-list">
                            {cartItems.map(item => (
                                <li key={item.id_equipamento} className="cart-item">
                                    <div className="item-details">
                                        <h3>{item.nome}</h3>
                                        <p>Quantidade: {item.quantidade}</p>
                                        <p>Preço unitário: R$ {item.preco.toFixed(2)}</p>
                                        <p>De: {new Date(item.data_inicio).toLocaleDateString()} até {new Date(item.data_fim).toLocaleDateString()}</p>
                                    </div>
                                    <button className="remove-button" onClick={() => removeFromCart(item.id_equipamento)}>Remover</button>
                                </li>
                            ))}
                        </ul>
                        <div className="cart-summary">
                            <h2>Total: R$ {calculateTotal().toFixed(2)}</h2>
                            <button
                                className="checkout-button"
                                onClick={handleCheckout}
                                disabled={loading}
                            >
                                {loading ? 'Finalizando...' : 'Finalizar Reserva'}
                            </button>
                            {error && <p className="error-message">{error}</p>}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CartPage;