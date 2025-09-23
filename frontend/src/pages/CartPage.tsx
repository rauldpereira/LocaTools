import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/CartPage.css';

const parseDateStringAsLocal = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const CartPage: React.FC = () => {
    const { cartItems, removeFromCart, clearCart } = useCart();
    const { token } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [deliveryType, setDeliveryType] = useState('retirada');
    const [address, setAddress] = useState({
        rua: '',
        numero: '',
        bairro: '',
        cidade: 'Pindamonhangaba',
        estado: 'SP',
        cep: ''
    });

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setAddress(prev => ({ ...prev, [name]: value }));
    };

    const calculateTotal = () => {
        return cartItems.reduce((total, item) => {
            const oneDay = 24 * 60 * 60 * 1000;
            const startDate = parseDateStringAsLocal(item.data_inicio);
            const endDate = parseDateStringAsLocal(item.data_fim);
            const diffDays = Math.round(Math.abs((endDate.getTime() - startDate.getTime()) / oneDay)) + 1;
            return total + (item.preco * item.quantidade * diffDays);
        }, 0);
    };

    const CUSTO_FRETE = 15.00;
    const valorTotalComFrete = deliveryType === 'entrega' ? calculateTotal() + CUSTO_FRETE : calculateTotal();

    const handleCheckout = async () => {
        if (!token) {
            navigate('/login');
            return;
        }
        if (cartItems.length === 0) {
            setError('O carrinho está vazio.');
            return;
        }
        if (deliveryType === 'entrega' && (!address.rua.trim() || !address.numero.trim() || !address.cidade.trim() || !address.estado.trim() || !address.cep.trim())) {
            setError('Por favor, preencha todos os campos do endereço de entrega.');
            return;
        }

        setLoading(true);
        setError(null);

        const formattedAddress = `${address.rua}, ${address.numero} - ${address.bairro}, ${address.cidade}/${address.estado} - CEP: ${address.cep}`;

        const reservationData = {
            itens: cartItems.map(({ cartItemId, ...item }) => item),
            tipo_entrega: deliveryType,
            endereco_entrega: deliveryType === 'entrega' ? formattedAddress : null
        };

        try {
            const config = {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            };
            const { data: newOrder } = await axios.post('http://localhost:3001/api/reservations', reservationData, config);
            clearCart();
            navigate(`/payment/${newOrder.id}`);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao finalizar a reserva. Tente novamente.');
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
                                <li key={item.cartItemId} className="cart-item">
                                    <div className="item-details">
                                        <h3>{item.nome}</h3>
                                        <p>Quantidade: {item.quantidade}</p>
                                        <p>Preço unitário: R$ {item.preco.toFixed(2)}</p>
                                        <p>
                                            De: {parseDateStringAsLocal(item.data_inicio).toLocaleDateString()}
                                            até {parseDateStringAsLocal(item.data_fim).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button className="remove-button" onClick={() => removeFromCart(item.cartItemId)}>Remover</button>
                                </li>
                            ))}
                        </ul>

                        <div className="delivery-section" style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '2rem' }}>
                            <h3>Opção de Entrega</h3>
                            <div>
                                <input type="radio" id="retirada" name="delivery" value="retirada" checked={deliveryType === 'retirada'} onChange={() => setDeliveryType('retirada')} />
                                <label htmlFor="retirada" style={{ marginLeft: '8px' }}>Retirar na Loja (Grátis)</label>
                                <p style={{ fontSize: '0.9em', color: '#666', margin: '5px 0 15px 0' }}>Nosso endereço: Rua eng orlando drumond murgel, 123, Pindamonhangaba/SP</p>
                            </div>
                            <div>
                                <input type="radio" id="entrega" name="delivery" value="entrega" checked={deliveryType === 'entrega'} onChange={() => setDeliveryType('entrega')} />
                                <label htmlFor="entrega" style={{ marginLeft: '8px' }}>Receber em Casa (Frete: R$ {CUSTO_FRETE.toFixed(2)})</label>
                            </div>
                            {deliveryType === 'entrega' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                                    <input name="rua" value={address.rua} onChange={handleAddressChange} placeholder="Rua / Avenida" required style={{ gridColumn: '1 / -1' }} />
                                    <input name="numero" value={address.numero} onChange={handleAddressChange} placeholder="Número" required />
                                    <input name="bairro" value={address.bairro} onChange={handleAddressChange} placeholder="Bairro" required />
                                    <input name="cidade" value={address.cidade} onChange={handleAddressChange} placeholder="Cidade" required />
                                    <input name="estado" value={address.estado} onChange={handleAddressChange} placeholder="Estado (UF)" maxLength={2} required />
                                    <input name="cep" value={address.cep} onChange={handleAddressChange} placeholder="CEP" required style={{ gridColumn: '1 / -1' }} />
                                </div>
                            )}
                        </div>

                        <div className="cart-summary">
                            <p>Subtotal dos Itens: R$ {calculateTotal().toFixed(2)}</p>
                            {deliveryType === 'entrega' && <p>Frete: R$ {CUSTO_FRETE.toFixed(2)}</p>}
                            <h2 style={{ borderTop: '1px solid #ccc', paddingTop: '10px' }}>Total: R$ {valorTotalComFrete.toFixed(2)}</h2>
                            <p style={{ color: 'green', fontWeight: 'bold' }}>Sinal de 50% a pagar: R$ {(valorTotalComFrete * 0.5).toFixed(2)}</p>
                            <button className="checkout-button" onClick={handleCheckout} disabled={loading}>
                                {loading ? 'Processando...' : 'Ir para Pagamento'}
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