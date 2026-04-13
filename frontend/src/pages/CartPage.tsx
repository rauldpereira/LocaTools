import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';
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

    const [showAuthModal, setShowAuthModal] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lojaAddress, setLojaAddress] = useState('Carregando endereço...');

    const [deliveryType, setDeliveryType] = useState('retirada');

    const [baseFreight, setBaseFreight] = useState(0);
    const [freightInfo, setFreightInfo] = useState<{ distancia: string } | null>(null);
    const [complemento, setComplemento] = useState('');

    const [address, setAddress] = useState({
        cep: '',
        rua: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: ''
    });

    // --- ESTADOS DE FIDELIDADE ---
    const [loyaltyConfig, setLoyaltyConfig] = useState<{ num: number, pct: number, ativo: boolean } | null>(null);
    const [completedOrders, setCompletedOrders] = useState(0);

    // BUSCA CONFIGURAÇÕES DE FIDELIDADE E HISTÓRICO
    useEffect(() => {
        const fetchLoyaltyData = async () => {
            if (!token) return;
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                
                // Busca config da loja
                const { data: storeConfig } = await axios.get(`${import.meta.env.VITE_API_URL}/api/config`);
                if (storeConfig) {
                    setLoyaltyConfig({
                        num: storeConfig.fidelidade_num_pedidos,
                        pct: parseFloat(storeConfig.fidelidade_desconto_pct),
                        ativo: !!storeConfig.fidelidade_ativo
                    });
                }

                // Busca pedidos do usuário para contar os válidos
                const { data: myOrders } = await axios.get(`${import.meta.env.VITE_API_URL}/api/reservations/my`, config);
                // Conta todos os que NÃO estão cancelados
                const count = myOrders.filter((o: any) => o.status !== 'cancelada').length;
                setCompletedOrders(count);
            } catch (error) {
                console.error('Erro ao buscar dados de fidelidade:', error);
            }
        };
        fetchLoyaltyData();
    }, [token]);

    // Conta quantas datas diferentes existem no carrinho
    const datasDeEntrega = cartItems.map(item => item.data_inicio.split('T')[0]);
    const viagensNecessarias = new Set(datasDeEntrega).size || 1;
    const freightCost = baseFreight * viagensNecessarias;

    const groupedItems = cartItems.reduce((acc, item) => {
        const dateKey = parseDateStringAsLocal(item.data_inicio).toLocaleDateString('pt-BR');
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(item);
        return acc;
    }, {} as Record<string, typeof cartItems>);

    // BUSCA O ENDEREÇO DA LOJA 
    useEffect(() => {
        const fetchLojaConfig = async () => {
            try {
                const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
                
                const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/frete/config`, config);
                
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
    }, [token]); 

    // Reseta o frete se mudar para retirada
    useEffect(() => {
        if (deliveryType === 'retirada') {
            setBaseFreight(0);
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

    // CALCULA O FRETE NO BACKEND
    const calculateFreightCost = async () => {
        if (!address.rua || !address.numero || !address.cep) {
            setError('Preencha Rua, Número e CEP para calcular.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const fullAddress = `${address.rua}, ${address.numero} - ${address.bairro}, ${address.cidade}/${address.estado}, ${address.cep}`;

            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/frete/calcular`, {
                endereco_destino: fullAddress
            });

            const { valor_total_frete, distancia_km } = response.data;

            // Salva apenas o valor de 1 viagem
            setBaseFreight(Number(valor_total_frete));
            setFreightInfo({
                distancia: distancia_km + ' km'
            });

        } catch (err: any) {
            console.error('Erro Frete:', err);
            setBaseFreight(0);
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
            
            let itemTotal = 0;
            if (item.tipo_locacao === 'diaria') {
                itemTotal = item.preco * item.quantidade * diffDays;
            } else {
                itemTotal = item.preco * item.quantidade;
            }
            return total + itemTotal;
        }, 0);
    };

    const subtotal = calculateSubtotal();
    
    // Se (Pedidos Existentes + este atual) atingir a meta.
    const isLoyaltyEligible = loyaltyConfig && loyaltyConfig.ativo && (completedOrders + 1) % loyaltyConfig.num === 0;
    
    const discountAmount = isLoyaltyEligible ? subtotal * (loyaltyConfig.pct / 100) : 0;
    const valorTotalComFrete = (subtotal - discountAmount) + freightCost;

    const handleCheckout = async () => {
        if (!token) {
            setShowAuthModal(true);
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

        const formattedAddress = `${address.rua}, ${address.numero}${complemento ? ' - ' + complemento : ''} - ${address.bairro}, ${address.cidade}/${address.estado} - CEP: ${address.cep}`;

        const reservationData = {
            itens: cartItems.map(({ cartItemId, ...item }) => item),
            tipo_entrega: deliveryType,
            endereco_entrega: deliveryType === 'entrega' ? formattedAddress : null,
            valor_frete: freightCost // O backend vai pegar esse total e dividir pelas OS!
        };

        try {
            const config = {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            };
            const { data: newOrder } = await axios.post(`${import.meta.env.VITE_API_URL}/api/reservations`, reservationData, config);
            clearCart();
            // Passa os IDs separados por vírgula na URL (ex: /payment-multi?ids=101,102)
            navigate(`/payment-multi?ids=${newOrder.ids.join(',')}`);
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
                        <div>
                            {Object.entries(groupedItems).map(([date, items], index) => (
                                <div key={date} style={{
                                    marginBottom: '20px', border: '1px solid #ccc', borderRadius: '8px',
                                    padding: '15px', background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                                }}>
                                    <h3 style={{ borderBottom: '2px solid #007bff', paddingBottom: '10px', marginTop: 0, color: '#007bff' }}>
                                        {deliveryType === 'entrega' ? `🚚 Viagem ${index + 1}` : `🏪 Retirada ${index + 1}`}: Dia {date}
                                    </h3>

                                    <ul className="cart-list" style={{ marginTop: '15px' }}>
                                        {items.map(item => (
                                            <li key={item.cartItemId} className="cart-item" style={{ border: 'none', borderBottom: '1px dashed #eee', paddingBottom: '15px' }}>
                                                <div className="item-details">
                                                    <h3 style={{ color: '#666' }}>{item.nome}</h3>
                                                    <p>Quantidade: {item.quantidade}</p>
                                                    <p>Preço unitário: R$ {item.preco.toFixed(2)} ({item.tipo_locacao})</p>
                                                    <p>
                                                        Período: {parseDateStringAsLocal(item.data_inicio).toLocaleDateString()} até {parseDateStringAsLocal(item.data_fim).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <button className="remove-button" onClick={() => removeFromCart(item.cartItemId)}>Remover</button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        <div className="delivery-section" style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '2rem' }}>
                            <h3>Opção de Entrega / Retirada</h3>

                            {/* RETIRADA */}
                            <div style={{ 
                                marginBottom: '15px', 
                                border: deliveryType === 'retirada' ? '2px solid #007bff' : '1px solid #ccc',
                                borderRadius: '8px',
                                padding: '15px',
                                backgroundColor: deliveryType === 'retirada' ? '#f0f7ff' : '#fff',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease-in-out'
                            }} onClick={() => setDeliveryType('retirada')}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type="radio" id="retirada" name="delivery"
                                        value="retirada"
                                        checked={deliveryType === 'retirada'}
                                        onChange={() => setDeliveryType('retirada')}
                                        style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="retirada" style={{ marginLeft: '10px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', color: '#333' }}>
                                        🏪 Retirar na Loja
                                    </label>
                                </div>
                                
                                {/* CAIXA DE ENDEREÇO  */}
                                {deliveryType === 'retirada' && (
                                    <div style={{ 
                                        marginTop: '12px', 
                                        marginLeft: '25px', 
                                        padding: '12px', 
                                        backgroundColor: '#e6f2ff', 
                                        borderRadius: '6px',
                                        borderLeft: '4px solid #007bff'
                                    }}>
                                        <p style={{ margin: 0, color: '#0056b3', fontWeight: '600', fontSize: '0.9rem' }}>ENDEREÇO PARA RETIRADA:</p>
                                        <p style={{ margin: '5px 0 0 0', color: '#333', fontSize: '0.95rem', lineHeight: '1.4' }}>
                                            {lojaAddress.replace('Nosso endereço: ', '')} 
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* ENTREGA */}
                            <div style={{ 
                                marginBottom: '10px', 
                                border: deliveryType === 'entrega' ? '2px solid #28a745' : '1px solid #ccc',
                                borderRadius: '8px',
                                padding: '15px',
                                backgroundColor: deliveryType === 'entrega' ? '#f2fdf5' : '#fff',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease-in-out'
                            }} onClick={() => setDeliveryType('entrega')}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type="radio" id="entrega" name="delivery"
                                        value="entrega"
                                        checked={deliveryType === 'entrega'}
                                        onChange={() => setDeliveryType('entrega')}
                                        style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="entrega" style={{ marginLeft: '10px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', color: '#333' }}>
                                        🚚 Entrega no Local
                                    </label>
                                </div>
                            </div>

                            {/* FORMULÁRIO DE ENTREGA */}
                            {deliveryType === 'entrega' && (
                                <div style={{
                                    marginTop: '15px', padding: '20px', backgroundColor: '#f8f9fa',
                                    borderRadius: '8px', border: '1px solid #e9ecef'
                                }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <input
                                                name="cep" value={address.cep} onChange={handleAddressChange} onBlur={handleCepBlur}
                                                placeholder="CEP (Digite para buscar)" maxLength={9} required
                                                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                                            />
                                        </div>

                                        <input name="rua" value={address.rua} onChange={handleAddressChange} placeholder="Rua / Avenida" required style={{ gridColumn: '1 / -1', padding: '10px' }} />

                                        <input id="input-numero" name="numero" value={address.numero} onChange={handleAddressChange} placeholder="Número" required style={{ padding: '10px' }} />
                                        <input name="bairro" value={address.bairro} onChange={handleAddressChange} placeholder="Bairro" required style={{ padding: '10px' }} />
                                        <input name="cidade" value={address.cidade} onChange={handleAddressChange} placeholder="Cidade" required style={{ padding: '10px' }} />
                                        <input name="estado" value={address.estado} onChange={handleAddressChange} placeholder="UF" maxLength={2} required style={{ padding: '10px' }} />

                                        <input
                                            type="text" placeholder="Complemento (Ex: Apto 42, Bloco B)"
                                            value={complemento} onChange={(e) => setComplemento(e.target.value)}
                                            style={{ flex: 2, padding: '8px' }}
                                        />
                                    </div>

                                    <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                        <button
                                            onClick={calculateFreightCost}
                                            disabled={loading || !address.rua || !address.numero}
                                            style={{
                                                padding: '10px 20px', backgroundColor: '#28a745', color: '#fff',
                                                border: 'none', borderRadius: '5px', cursor: 'pointer',
                                                opacity: (!address.rua || !address.numero) ? 0.6 : 1
                                            }}
                                        >
                                            {loading ? 'Calculando...' : 'Calcular Frete'}
                                        </button>

                                        {/* PREÇO DO FRETE MOSTRANDO A MULTIPLICAÇÃO */}
                                        {baseFreight > 0 && (
                                            <div style={{ textAlign: 'right', color: '#155724' }}>
                                                <p style={{ margin: 0, fontWeight: 'bold' }}>Frete Total: R$ {freightCost.toFixed(2)}</p>
                                                {viagensNecessarias > 1 && (
                                                    <small style={{ display: 'block', color: '#666' }}>
                                                        ({viagensNecessarias} entregas de R$ {baseFreight.toFixed(2)})
                                                    </small>
                                                )}
                                                {freightInfo && <small>Distância base: {freightInfo.distancia}</small>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="cart-summary">
                            <p>Subtotal dos Itens: R$ {subtotal.toFixed(2)}</p>

                            {isLoyaltyEligible && (
                                <div style={{ 
                                    backgroundColor: '#d4edda', 
                                    color: '#155724', 
                                    padding: '10px', 
                                    borderRadius: '8px', 
                                    marginBottom: '10px',
                                    border: '1px solid #c3e6cb'
                                }}>
                                    <p style={{ margin: 0, fontWeight: 'bold' }}>🎁 Fidelidade Ativada!</p>
                                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                        A cada {loyaltyConfig?.num} pedidos você ganha {loyaltyConfig?.pct}% de desconto. 
                                        Como este é o seu {completedOrders + 1}º pedido, o benefício foi aplicado!
                                    </p>
                                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>
                                        Desconto: - R$ {discountAmount.toFixed(2)}
                                    </p>
                                </div>
                            )}

                            {deliveryType === 'entrega' && (
                                <p style={{ color: freightCost > 0 ? '#333' : 'red' }}>
                                    Frete: {freightCost > 0 ? `R$ ${freightCost.toFixed(2)}` : 'A calcular'}
                                </p>
                            )}

                            <h2 style={{ borderTop: '1px solid #ccc', paddingTop: '10px' }}>
                                Total: R$ {valorTotalComFrete.toFixed(2)}
                            </h2>

                            <p style={{ color: 'green', fontWeight: 'bold' }}>
                                Sinal de 50% a pagar agora: R$ {(valorTotalComFrete * 0.5).toFixed(2)}
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

            <AuthModal 
                isOpen={showAuthModal} 
                onClose={() => setShowAuthModal(false)} 
            />
        </div>
    );
};

export default CartPage;