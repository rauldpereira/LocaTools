import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Truck, Store, Gift, HelpCircle, X, CheckCircle, Info } from 'lucide-react';
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

    // --- ESTADOS DE LOJA ---
    const [loyaltyConfig, setLoyaltyConfig] = useState<{ num: number, pct: number, ativo: boolean } | null>(null);
    const [lojaConfig, setLojaConfig] = useState<any>(null);
    const [completedOrders, setCompletedOrders] = useState(0);
    const [showManual, setShowManual] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    // BUSCA CONFIGURAÇÕES E HISTÓRICO
    useEffect(() => {
        const fetchStoreData = async () => {
            try {
                // Busca config da loja
                const { data: storeConfig } = await axios.get(`${import.meta.env.VITE_API_URL}/api/config`);
                if (storeConfig) {
                    setLojaConfig(storeConfig);
                    setLoyaltyConfig({
                        num: storeConfig.fidelidade_num_pedidos,
                        pct: parseFloat(storeConfig.fidelidade_desconto_pct),
                        ativo: !!storeConfig.fidelidade_ativo
                    });
                    if (storeConfig.frete?.endereco_origem) {
                        setLojaAddress("Nosso endereço: " + storeConfig.frete.endereco_origem);
                    } else {
                        setLojaAddress('Endereço não configurado.');
                    }
                }

                if (token) {
                    const configAuth = { headers: { Authorization: `Bearer ${token}` } };
                    const { data: myOrders } = await axios.get(`${import.meta.env.VITE_API_URL}/api/reservations/my`, configAuth);
                    const count = myOrders.filter((o: any) => o.status !== 'cancelada').length;
                    setCompletedOrders(count);
                }
            } catch (error) {
                console.error('Erro ao buscar dados da loja:', error);
            }
        };
        fetchStoreData();
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
            
            if (lojaConfig?.momento_pagamento === 'entrega') {
                setSuccessMessage('Reserva realizada com sucesso! O pagamento será feito presencialmente.');
                setTimeout(() => navigate('/my-reservations'), 3000);
            } else {
                // Passa os IDs separados por vírgula na URL (ex: /payment-multi?ids=101,102)
                navigate(`/payment-multi?ids=${newOrder.ids.join(',')}`);
            }
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
                {successMessage && (
                    <div style={{
                        backgroundColor: "#ecfdf5",
                        color: "#047857",
                        padding: "15px",
                        borderRadius: "8px",
                        marginBottom: "20px",
                        border: "1px solid #a7f3d0",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        fontWeight: "bold",
                        animation: "fadeIn 0.3s ease"
                    }}>
                        <CheckCircle size={20} />
                        {successMessage}
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h1 className="cart-title" style={{ margin: 0 }}>Meu Carrinho</h1>
                    <button
                        onClick={() => setShowManual(true)}
                        title="Dúvidas sobre Frete e Retirada?"
                        style={{ 
                            display: "flex", alignItems: "center", justifyContent: "center", gap: '8px',
                            padding: "8px 15px", borderRadius: "20px", border: "1px solid #e2e8f0", 
                            backgroundColor: "#fff", color: "#2563eb", cursor: "pointer", 
                            transition: "all 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                            fontWeight: 'bold', fontSize: '0.9rem'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#fff"; }}
                    >
                        <HelpCircle size={20} /> Como Funciona?
                    </button>
                </div>
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
                                    <h3 style={{ borderBottom: '2px solid #007bff', paddingBottom: '10px', marginTop: 0, color: '#007bff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {deliveryType === 'entrega' 
                                            ? <><Truck size={20} /> Viagem {index + 1}: Dia {date}</>
                                            : <><Store size={20} /> Retirada {index + 1}: Dia {date}</>
                                        }
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
                                    <label htmlFor="retirada" style={{ marginLeft: '10px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Store size={20} color="#007bff"/> Retirar na Loja
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
                                    <label htmlFor="entrega" style={{ marginLeft: '10px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Truck size={20} color="#28a745"/> Entrega no Local
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
                                    <p style={{ margin: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}><Gift size={18}/> Fidelidade Ativada!</p>
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

                            {lojaConfig && (
                                <p style={{ color: 'green', fontWeight: 'bold' }}>
                                    {lojaConfig.sinal_porcentagem < 100 &&
                                        `Sinal de ${lojaConfig.sinal_porcentagem}% a pagar agora: R$ ${(valorTotalComFrete * (lojaConfig.sinal_porcentagem / 100)).toFixed(2)}`
                                    }
                                </p>
                            )}

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

            {/* MODAL MANUAL */}
            {showManual && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, animation: "fadeIn 0.2s ease" }} onClick={() => setShowManual(false)}>
                    <div style={{ backgroundColor: "#fff", borderRadius: "16px", width: "90%", maxWidth: "600px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 30px", borderBottom: "1px solid #f1f5f9" }}>
                            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", color: "#1e293b" }}>
                                <HelpCircle size={22} color="#2563eb" /> Como funciona o Carrinho?
                            </h3>
                            <button onClick={() => setShowManual(false)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center" }}><X size={22} /></button>
                        </div>

                        <div style={{ padding: "30px", overflowY: "auto", flexGrow: 1 }}>
                            <div style={{ color: "#475569", lineHeight: "1.6" }}>
                                <p style={{ marginBottom: "25px", fontSize: "1rem" }}>
                                    Revise os itens que você selecionou e escolha como prefere receber seus equipamentos:
                                </p>

                                <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}><Store size={14}/></div>
                                    <div>
                                        <strong>Retirar na Loja:</strong>
                                        <p style={{ margin: "5px 0 0 0" }}>Você não paga taxa de frete. Basta comparecer ao nosso endereço na data combinada para a retirada dos equipamentos.</p>
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#28a745", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}><Truck size={14}/></div>
                                    <div>
                                        <strong>Entrega no Local (Frete):</strong>
                                        <p style={{ margin: "5px 0 0 0" }}>Nós levamos até a sua obra! Insira o CEP e o sistema calculará a taxa de frete automaticamente baseada na distância em KM da nossa loja até você.</p>
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#fffbf1", borderRadius: "12px", border: "1px solid #fef08a" }}>
                                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#eab308", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}><Info size={14}/></div>
                                    <div>
                                        <strong>Datas Múltiplas (Viagens):</strong>
                                        <p style={{ margin: "5px 0 0 0" }}>Se você alugou equipamentos para datas de início diferentes, nós precisaremos fazer viagens separadas para entregar cada um. O sistema identificará isso automaticamente e multiplicará o valor da viagem de entrega pelo número de dias distintos.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default CartPage;