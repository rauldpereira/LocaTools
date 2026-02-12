import React, { useState, useEffect } from 'react';
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
    const [lojaAddress, setLojaAddress] = useState('Carregando endereço...');

    const [deliveryType, setDeliveryType] = useState('retirada');
    const [freightCost, setFreightCost] = useState(0);
    const [freightInfo, setFreightInfo] = useState<{ distancia: string } | null>(null);

    const [address, setAddress] = useState({
        cep: '',
        rua: '',
        numero: '',
        bairro: '',
        cidade: 'Pindamonhangaba',
        estado: 'SP'
    });

    // BUSCA O  ENDEREÇO DA LOJA 
    useEffect(() => {
        const fetchLojaConfig = async () => {
            try {
                const response = await axios.get('http://localhost:3001/api/frete/config');
                if (response.data && response.data.endereco_origem) {
                    setLojaAddress("Nosso endereço: " + response.data.endereco_origem);
                } else {
                    setLojaAddress('Endereço não configurado.');
                }
            } catch (error) {
                console.error('Erro ao buscar endereço da loja:', error);
                setLojaAddress('Entre em contato para saber o endereço.');
            }
        };
        fetchLojaConfig();
    }, []);

    // Reseta o frete se mudar para retirada
    useEffect(() => {
        if (deliveryType === 'retirada') {
            setFreightCost(0);
            setFreightInfo(null);
            setError(null);
        }
    }, [deliveryType]);

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setAddress(prev => ({ ...prev, [name]: value }));
    };

    // BUSCA O CEP
    const handleCepBlur = async () => {
        const cepLimpo = address.cep.replace(/\D/g, '');
        if (cepLimpo.length !== 8) return;

        try {
            const { data } = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            if (!data.erro) {
                setAddress(prev => ({
                    ...prev,
                    rua: data.logradouro,
                    bairro: data.bairro,
                    cidade: data.localidade,
                    estado: data.uf
                }));
                document.getElementById('input-numero')?.focus();
            }
        } catch (error) {
            console.error('Erro ViaCEP', error);
        }
    };

    //CALCULA O FRETE NO BACKEND
    const calculateFreightCost = async () => {
        if (!address.rua || !address.numero || !address.cep) {
            setError('Preencha Rua, Número e CEP para calcular.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const fullAddress = `${address.rua}, ${address.numero} - ${address.bairro}, ${address.cidade}/${address.estado}, ${address.cep}`;

            const response = await axios.post('http://localhost:3001/api/frete/calcular', {
                endereco_destino: fullAddress
            });

            const { valor_total_frete, distancia_km } = response.data;

            setFreightCost(Number(valor_total_frete));
            setFreightInfo({
                distancia: distancia_km + ' km'
            });
            
        } catch (err: any) {
            console.error('Erro Frete:', err);
            setFreightCost(0);
            setFreightInfo(null);
            setError(err.response?.data?.error || 'Erro ao calcular frete. Verifique o endereço.');
        } finally {
            setLoading(false);
        }
    };

    const calculateSubtotal = () => {
        return cartItems.reduce((total, item) => {
            const oneDay = 24 * 60 * 60 * 1000;
            const startDate = parseDateStringAsLocal(item.data_inicio);
            const endDate = parseDateStringAsLocal(item.data_fim);
            const diffDays = Math.round(Math.abs((endDate.getTime() - startDate.getTime()) / oneDay)) + 1;
            return total + (item.preco * item.quantidade * diffDays);
        }, 0);
    };

    const valorTotalComFrete = calculateSubtotal() + freightCost;

    const handleCheckout = async () => {
        if (!token) {
            navigate('/login');
            return;
        }
        if (cartItems.length === 0) {
            setError('O carrinho está vazio.');
            return;
        }

        if (deliveryType === 'entrega') {
            if (!address.rua.trim() || !address.numero.trim()) {
                setError('Por favor, preencha o endereço de entrega.');
                return;
            }
            if (freightCost === 0) {
                setError('Por favor, clique em "Calcular Frete" antes de finalizar.');
                return;
            }
        }

        setLoading(true);
        setError(null);

        const formattedAddress = `${address.rua}, ${address.numero} - ${address.bairro}, ${address.cidade}/${address.estado} - CEP: ${address.cep}`;

        const reservationData = {
            itens: cartItems.map(({ cartItemId, ...item }) => item),
            tipo_entrega: deliveryType,
            endereco_entrega: deliveryType === 'entrega' ? formattedAddress : null,
            valor_frete: freightCost
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
                                        <h3 style={{ color: '#666' }}>{item.nome}</h3>
                                        <p>Quantidade: {item.quantidade}</p>
                                        <p>Preço unitário: R$ {item.preco.toFixed(2)}</p>
                                        <p>
                                            Período: {parseDateStringAsLocal(item.data_inicio).toLocaleDateString()} até {parseDateStringAsLocal(item.data_fim).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button className="remove-button" onClick={() => removeFromCart(item.cartItemId)}>Remover</button>
                                </li>
                            ))}
                        </ul>

                        <div className="delivery-section" style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '2rem' }}>
                            <h3>Opção de Entrega</h3>
                            
                            {/* RETIRADA */}
                            <div style={{marginBottom: '10px'}}>
                                <input 
                                    type="radio" id="retirada" name="delivery" 
                                    value="retirada" 
                                    checked={deliveryType === 'retirada'} 
                                    onChange={() => setDeliveryType('retirada')} 
                                />
                                <label htmlFor="retirada" style={{ marginLeft: '8px', fontWeight: 'bold' }}>Retirar na Loja</label>
                                <p style={{ fontSize: '0.9em', color: '#666', margin: '5px 0 0 25px' }}>
                                {lojaAddress}
                                </p>
                            </div>

                            {/* ENTREGA */}
                            <div>
                                <input 
                                    type="radio" id="entrega" name="delivery" 
                                    value="entrega" 
                                    checked={deliveryType === 'entrega'} 
                                    onChange={() => setDeliveryType('entrega')} 
                                />
                                <label htmlFor="entrega" style={{ marginLeft: '8px', fontWeight: 'bold' }}>Entrega</label>
                            </div>

                            {/* FORMULÁRIO DE ENTREGA */}
                            {deliveryType === 'entrega' && (
                                <div style={{ 
                                    marginTop: '15px', 
                                    padding: '20px', 
                                    backgroundColor: '#f8f9fa', 
                                    borderRadius: '8px', 
                                    border: '1px solid #e9ecef' 
                                }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <input 
                                                name="cep" 
                                                value={address.cep} 
                                                onChange={handleAddressChange} 
                                                onBlur={handleCepBlur} 
                                                placeholder="CEP (Digite para buscar)" 
                                                maxLength={9}
                                                required 
                                                style={{width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc'}}
                                            />
                                        </div>

                                        <input name="rua" value={address.rua} onChange={handleAddressChange} placeholder="Rua / Avenida" required style={{ gridColumn: '1 / -1', padding: '10px' }} />
                                        
                                        <input 
                                            id="input-numero"
                                            name="numero" 
                                            value={address.numero} 
                                            onChange={handleAddressChange} 
                                            placeholder="Número" 
                                            required 
                                            style={{ padding: '10px' }}
                                        />
                                        
                                        <input name="bairro" value={address.bairro} onChange={handleAddressChange} placeholder="Bairro" required style={{ padding: '10px' }} />
                                        <input name="cidade" value={address.cidade} onChange={handleAddressChange} placeholder="Cidade" required style={{ padding: '10px' }} />
                                        <input name="estado" value={address.estado} onChange={handleAddressChange} placeholder="UF" maxLength={2} required style={{ padding: '10px' }} />
                                    </div>

                                    <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                        <button 
                                            onClick={calculateFreightCost}
                                            disabled={loading || !address.rua || !address.numero}
                                            style={{
                                                padding: '10px 20px',
                                                backgroundColor: '#28a745',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '5px',
                                                cursor: 'pointer',
                                                opacity: (!address.rua || !address.numero) ? 0.6 : 1
                                            }}
                                        >
                                            {loading ? 'Calculando...' : 'Calcular Frete'}
                                        </button>

                                        {/* PREÇO DO FRETE */}
                                        {freightCost > 0 && (
                                            <div style={{ textAlign: 'right', color: '#155724' }}>
                                                <p style={{ margin: 0, fontWeight: 'bold' }}>Frete: R$ {freightCost.toFixed(2)}</p>
                                                {freightInfo && <small>Distância: {freightInfo.distancia}</small>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="cart-summary">
                            <p>Subtotal dos Itens: R$ {calculateSubtotal().toFixed(2)}</p>
                            
                            {deliveryType === 'entrega' && (
                                <p style={{ color: freightCost > 0 ? '#333' : 'red' }}>
                                    Frete: {freightCost > 0 ? `R$ ${freightCost.toFixed(2)}` : 'A calcular'}
                                </p>
                            )}
                            
                            <h2 style={{ borderTop: '1px solid #ccc', paddingTop: '10px' }}>
                                Total: R$ {valorTotalComFrete.toFixed(2)}
                            </h2>
                            
                            <p style={{ color: 'green', fontWeight: 'bold' }}>
                                Sinal de 50% a pagar: R$ {(valorTotalComFrete * 0.5).toFixed(2)}
                            </p>
                            
                            {error && (
                                <div style={{ 
                                    backgroundColor: '#f8d7da', color: '#721c24', 
                                    padding: '10px', borderRadius: '5px', marginBottom: '10px', marginTop: '10px' 
                                }}>
                                {error}
                                </div>
                            )}

                            <button className="checkout-button" onClick={handleCheckout} disabled={loading}>
                                {loading ? 'Processando...' : 'Ir para Pagamento'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CartPage;