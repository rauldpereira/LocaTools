import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import PrejuizoModal from '../components/Admin/PrejuizoModal'; 

interface TipoAvaria {
    id: number;
    descricao: string;
    preco: string;
}
interface AvariaEncontrada {
    id: number;
    id_tipo_avaria: number;
    TipoAvaria: TipoAvaria;
}
interface DetalheVistoria {
    id: number;
    id_unidade: number; 
    comentarios: string;
    avariasEncontradas: AvariaEncontrada[];
}
interface Vistoria {
    id: number;
    tipo_vistoria: 'entrega' | 'devolucao';
    detalhes: DetalheVistoria[];
}
interface ItemReserva { 
    id: number; 
    status?: string; 
    Unidade: { 
        id: number; 
        Equipamento: { nome: string; } 
    };
    prejuizo?: {
        id: number;
        tipo: string;
        valor_prejuizo: string | number;
        observacao: string;
        resolvido: boolean;
    } | null;
}
interface OrderDetails {
    id: number;
    valor_total: string;
    valor_sinal: string;
    taxa_remarcacao?: string;
    status: string;
    ItemReservas: ItemReserva[];
    Vistorias: Vistoria[];
    custo_frete: string;
    taxa_avaria: string;
    taxa_cancelamento?: string;
    valor_reembolsado?: string;
    tipo_entrega: string;
    endereco_entrega?: string;
    data_inicio: string;
    data_fim: string;
}

interface ReturnInspectionNote {
    idUnidade: number;
    nomeEquipamento: string;
    comentarios: string;
    marcouOutros: boolean;
    novasAvarias: TipoAvaria[];
    avariasAntigas: TipoAvaria[]; // 👈 O ERRO DO TYPESCRIPT FOI CORRIGIDO AQUI!
}

const parseDateStringAsLocal = (dateString: string) => {
    const dateOnly = dateString.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const FinalizePaymentPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);

    const [inspectionNotes, setInspectionNotes] = useState<ReturnInspectionNote[]>([]);
    const [outrosFee, setOutrosFee] = useState(0);
    const [selectedItemForPrejuizo, setSelectedItemForPrejuizo] = useState<ItemReserva | null>(null);

    const [multaAtraso, setMultaAtraso] = useState(0);
    const [diasAtraso, setDiasAtraso] = useState(0);

    const backendUrl = 'http://localhost:3001';

    const fetchOrderDetails = async () => {
        if (!token || !orderId) return;
        try {
            setLoading(true);
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const { data } = await axios.get(`${backendUrl}/api/reservations/${orderId}`, config);
            setOrder(data);
            calculateNewDamageFee(data);

            if (!['finalizada', 'cancelada', 'PREJUIZO'].includes(data.status)) {
                try {
                    const resMulta = await axios.get(`${backendUrl}/api/reservations/${orderId}/calculate-penalty`, config);
                    if (resMulta.data.diasAtraso > 0) {
                        setDiasAtraso(resMulta.data.diasAtraso);
                        setMultaAtraso(resMulta.data.valorMulta);
                    }
                } catch (err) {
                    console.warn("Não foi possível calcular multa automática.");
                }
            }

        } catch (error) {
            console.error("Erro ao buscar detalhes:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderDetails();
    }, [orderId, token]);

    const calculateNewDamageFee = (orderData: OrderDetails) => {
        const vistoriaSaida = orderData.Vistorias.find(v => v.tipo_vistoria === 'entrega');
        const vistoriaDevolucao = orderData.Vistorias.find(v => v.tipo_vistoria === 'devolucao');
        
        const notes: ReturnInspectionNote[] = [];

        if (vistoriaDevolucao) {
            orderData.ItemReservas.forEach(item => {
                const detalheDev = vistoriaDevolucao.detalhes.find(d => d.id_unidade === item.Unidade.id);
                const detalheSaida = vistoriaSaida?.detalhes.find(d => d.id_unidade === item.Unidade.id);
                
                if (detalheDev) {
                    const avariasSaidaIDs = new Set(detalheSaida?.avariasEncontradas?.map(a => a.id_tipo_avaria) || []);
                    
                    let marcouOutros = false;
                    const novasAvarias: TipoAvaria[] = [];
                    const avariasAntigas: TipoAvaria[] = [];

                    // Tratamento seguro caso venha null ou vazio
                    const avariasDevolucao = detalheDev.avariasEncontradas || [];
                    
                    avariasDevolucao.forEach(avaria => {
                        if (!avaria || !avaria.TipoAvaria) return; // Evita quebra se o BD mandar nulo
                        
                        const desc = avaria.TipoAvaria.descricao.toLowerCase();
                        
                        if (desc === 'outros') {
                            marcouOutros = true;
                        } else if (!avariasSaidaIDs.has(avaria.id_tipo_avaria)) {
                            // Nova!
                            novasAvarias.push(avaria.TipoAvaria);
                        } else {
                            // Antiga!
                            avariasAntigas.push(avaria.TipoAvaria);
                        }
                    });

                    if (marcouOutros || novasAvarias.length > 0 || avariasAntigas.length > 0 || detalheDev.comentarios) {
                        notes.push({
                            idUnidade: item.Unidade.id,
                            nomeEquipamento: item.Unidade.Equipamento.nome,
                            comentarios: detalheDev.comentarios || '',
                            marcouOutros,
                            novasAvarias,
                            avariasAntigas
                        });
                    }
                }
            });
        }
        setInspectionNotes(notes);
    };

    const valorRestante = order ? Number(order.valor_total) - Number(order.valor_sinal) : 0;
    const taxaRemarcacao = order ? Number(order.taxa_remarcacao || 0) : 0;
    
    // Soma apenas as avarias tabeladas (com preço fixo) DAS NOVAS AVARIAS
    const calculatedFee = inspectionNotes.reduce((acc, note) => {
        const sum = note.novasAvarias.reduce((s, a) => s + Number(a.preco || 0), 0);
        return acc + sum;
    }, 0);
    
    const totalPrejuizos = order ? order.ItemReservas.reduce((acc, item) => {
        return acc + (item.prejuizo ? Number(item.prejuizo.valor_prejuizo) : 0);
    }, 0) : 0;

    const valorFinal = valorRestante + calculatedFee + outrosFee + taxaRemarcacao + totalPrejuizos + multaAtraso;

    const handleManualConfirmation = async () => {
        if (!order) return;
        const totalExtras = calculatedFee + outrosFee + totalPrejuizos;

        if (!window.confirm(`Confirmar recebimento de R$ ${valorFinal.toFixed(2)} e finalizar ordem?`)) return;

        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const body = { 
                damageFee: totalExtras,
                lateFee: multaAtraso
            };
            await axios.put(`${backendUrl}/api/reservations/${orderId}/confirm-manual-payment`, body, config);
            alert("Pagamento confirmado e ordem finalizada!");
            navigate('/admin');
        } catch (error) {
            console.error("Erro ao confirmar:", error);
            alert("Falha ao finalizar ordem.");
        } finally {
            setLoading(false);
        }
    };

    const handleFinishWithDebt = async () => {
        if (!window.confirm("ATENÇÃO: Você está encerrando SEM confirmar o pagamento total.\n\nO pedido ficará com status 'PREJUÍZO' e o valor ficará como pendência. Deseja continuar?")) return;

        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.put(`${backendUrl}/api/reservations/${orderId}/finish-with-debt`, {}, config);
            alert("Ordem encerrada com pendências financeiras.");
            navigate('/admin');
        } catch (error) {
            console.error("Erro ao finalizar com dívida:", error);
            alert("Falha ao encerrar ordem.");
        } finally {
            setLoading(false);
        }
    };

    if (loading || !order) return <p style={{textAlign:'center', marginTop:'50px'}}>Carregando...</p>;

    const temAvariaOutrosGlobal = inspectionNotes.some(n => n.marcouOutros);

    return (
        <div style={{ padding: '2rem', marginTop: '60px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>Finalizar Pedido #{orderId}</h1>
            
            {order.status === 'PREJUIZO' && (
                <div style={{backgroundColor: '#ffe6e6', padding: '15px', border: '1px solid red', borderRadius: '5px', marginBottom: '2rem'}}>
                    <h3 style={{color: 'red', margin: '0 0 10px 0'}}>⚠️ Atenção: Este pedido possui B.O./Prejuízo registrado</h3>
                    <p style={{margin: 0}}>O valor dos itens perdidos foi adicionado ao total abaixo.</p>
                </div>
            )}

            {diasAtraso > 0 && (
                <div style={{marginBottom: '2rem', padding: '1rem', backgroundColor: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '8px', color: '#856404'}}>
                    <h3 style={{marginTop: 0, display:'flex', alignItems:'center'}}>⚠️ Atraso na Devolução Detectado</h3>
                    <p>Este pedido deveria ter sido devolvido em <strong>{parseDateStringAsLocal(order.data_fim).toLocaleDateString()}</strong>.</p>
                    <p>Atraso calculado: <strong>{diasAtraso} dias</strong>.</p>
                    <p style={{fontSize: '1.1rem'}}>Multa sugerida (Art. 575 CC): <strong>R$ {multaAtraso.toFixed(2)}</strong></p>
                    
                    <div style={{marginTop: '10px', fontSize: '0.9rem', fontStyle: 'italic'}}>
                        * Este valor já foi adicionado automaticamente ao total abaixo.
                    </div>
                </div>
            )}

            <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
                <h3>Itens do Pedido</h3>
                {order.ItemReservas.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee' }}>
                        <div>
                            <strong>{item.Unidade.Equipamento.nome}</strong> <span style={{color: '#666', fontSize: '0.9rem'}}>(ID: {item.Unidade.id})</span>
                            {item.prejuizo && (
                                <div style={{color: '#dc3545', fontSize: '0.9rem', marginTop: '5px'}}>
                                    <strong>🚨 {item.prejuizo.tipo}:</strong> R$ {Number(item.prejuizo.valor_prejuizo).toFixed(2)}
                                </div>
                            )}
                        </div>
                        {item.status === 'FINALIZADO_COM_PREJUIZO' ? (
                            <span style={{color: 'red', fontWeight: 'bold', border: '1px solid red', padding: '2px 5px', borderRadius: '4px'}}>B.O. REGISTRADO</span>
                        ) : (
                            <button onClick={() => setSelectedItemForPrejuizo(item)} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>
                                🚨 Registrar Prejuízo
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* RELATÓRIO DA VISTORIA */}
            <div className="damage-assessment" style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', backgroundColor: temAvariaOutrosGlobal ? '#fff5f5' : 'white' }}>
                <h3 style={{ color: temAvariaOutrosGlobal ? '#c62828' : '#333' }}>Relatório da Vistoria de Devolução</h3>
                
                {inspectionNotes.length > 0 ? (
                    <div>
                        {inspectionNotes.map((note, idx) => (
                            <div key={idx} style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#fdfdfd', border: '1px solid #ccc', borderRadius: '8px' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#0056b3' }}>{note.nomeEquipamento} <span style={{color:'#666', fontSize:'0.9rem'}}>(ID: {note.idUnidade})</span></h4>
                                
                                {/* AVARIAS NOVAS (SÃO COBRADAS) */}
                                {note.novasAvarias.length > 0 && (
                                    <div style={{ marginBottom: '10px' }}>
                                        <strong style={{ color: '#dc3545' }}>🚨 Avarias Novas (A Cobrar):</strong>
                                        <ul style={{ margin: '5px 0', paddingLeft: '20px', color: '#dc3545', fontWeight: 'bold' }}>
                                            {note.novasAvarias.map((a, i) => (
                                                <li key={i}>{a.descricao} - R$ {Number(a.preco).toFixed(2)}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* AVARIAS VELHAS (NÃO SÃO COBRADAS) */}
                                {note.avariasAntigas.length > 0 && (
                                    <div style={{ marginBottom: '10px' }}>
                                        <strong style={{ color: '#6c757d' }}>✅ Avarias Pré-existentes (Já estavam na Saída):</strong>
                                        <ul style={{ margin: '5px 0', paddingLeft: '20px', color: '#6c757d', fontStyle: 'italic' }}>
                                            {note.avariasAntigas.map((a, i) => (
                                                <li key={i}>{a.descricao} - Não cobrar (R$ 0,00)</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {note.marcouOutros && (
                                    <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba', borderRadius: '4px', fontWeight: 'bold' }}>
                                        ⚠️ A opção "Outros" foi MARCADA. Leia o comentário abaixo e adicione o valor no campo de Taxa Extra.
                                    </div>
                                )}

                                <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderLeft: '4px solid #6c757d', fontSize: '0.95rem', color: '#333' }}>
                                    <strong>💬 Observações do Vistoriador:</strong><br/>
                                    <span style={{ fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{note.comentarios || "Nenhum comentário deixado."}</span>
                                </div>
                            </div>
                        ))}
                        
                        <p style={{fontWeight: 'bold', textAlign: 'right', fontSize: '1.1rem'}}>Subtotal Avarias Tabeladas: R$ {calculatedFee.toFixed(2)}</p>
                    </div>
                ) : <p style={{color: '#666'}}>Nenhuma observação ou avaria registrada na devolução.</p>}

                <hr style={{ margin: '1rem 0', borderColor: '#eee' }} />
                
                <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px dashed #ccc' }}>
                    <label style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 'bold', color: '#0056b3'}}>
                        Adicionar Valor Manual (Outros / Taxa Extra):
                        <div style={{display: 'flex', alignItems: 'center'}}>
                            R$ 
                            <input
                                type="number"
                                value={outrosFee}
                                onChange={(e) => setOutrosFee(Number(e.target.value))}
                                min="0"
                                style={{marginLeft: '10px', padding: '8px', width: '120px', textAlign: 'right', fontSize: '1.1rem', fontWeight: 'bold', border: '2px solid #007bff', borderRadius: '6px'}}
                            />
                        </div>
                    </label>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px', marginBottom: 0 }}>
                        * Use este campo se o vistoriador marcou "Outros" ou se houver alguma negociação extra.
                    </p>
                </div>
            </div>

            <div className="summary" style={{ border: '2px solid #333', padding: '1.5rem', borderRadius: '8px', backgroundColor: '#fdfdfd' }}>
                <h2 style={{marginTop: 0, borderBottom: '2px solid #333', color: "#000", paddingBottom: '10px'}}>Resumo Final</h2>
                <div style={{fontSize: '1.1rem', lineHeight: '1.8'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                        <span style={{color: "#000"}}>Valor Restante do Aluguel:</span>
                        <span style={{color: "#000"}}>R$ {valorRestante.toFixed(2)}</span>
                    </div>
                    {taxaRemarcacao > 0 && (
                        <div style={{display: 'flex', justifyContent: 'space-between', color: '#e67e22'}}>
                            <span>Taxa de Remarcação:</span>
                            <span>+ R$ {taxaRemarcacao.toFixed(2)}</span>
                        </div>
                    )}
                    {(calculatedFee + outrosFee) > 0 && (
                        <div style={{display: 'flex', justifyContent: 'space-between', color: '#dc3545'}}>
                            <span>Avarias e Extras:</span>
                            <span>+ R$ {(calculatedFee + outrosFee).toFixed(2)}</span>
                        </div>
                    )}
                    {totalPrejuizos > 0 && (
                        <div style={{display: 'flex', justifyContent: 'space-between', color: '#b00020', fontWeight: 'bold'}}>
                            <span>Roubos / Extravios / B.O.:</span>
                            <span>+ R$ {totalPrejuizos.toFixed(2)}</span>
                        </div>
                    )}
                    {multaAtraso > 0 && (
                        <div style={{display: 'flex', justifyContent: 'space-between', color: '#d35400', fontWeight: 'bold', backgroundColor:'#fff3cd', padding:'0 5px'}}>
                            <span>Multa por Atraso ({diasAtraso} dias):</span>
                            <span>+ R$ {multaAtraso.toFixed(2)}</span>
                        </div>
                    )}

                    <hr style={{margin: '10px 0'}} />
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745'}}>
                        <span>TOTAL A RECEBER:</span>
                        <span>R$ {valorFinal.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
                <button 
                    onClick={handleFinishWithDebt} 
                    disabled={loading}
                    style={{ 
                        padding: '1rem', fontSize: '1rem', fontWeight: 'bold',
                        backgroundColor: 'white', color: '#e67e22', 
                        border: '2px solid #e67e22', borderRadius: '8px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <span style={{fontSize: '1.5rem', marginBottom: '5px'}}>⚠️</span>
                    Encerrar com Pendência
                    <span style={{fontSize: '0.8rem', fontWeight: 'normal'}}>(Gerar Dívida / Não Pago)</span>
                </button>

                <button 
                    onClick={handleManualConfirmation} 
                    disabled={loading}
                    style={{ 
                        padding: '1rem', fontSize: '1rem', fontWeight: 'bold',
                        backgroundColor: '#28a745', color: 'white', 
                        border: 'none', borderRadius: '8px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                >
                    <span style={{fontSize: '1.5rem', marginBottom: '5px'}}>✅</span>
                    Confirmar Recebimento Total
                    <span style={{fontSize: '0.8rem', fontWeight: 'normal'}}>(R$ {valorFinal.toFixed(2)})</span>
                </button>
            </div>

            {selectedItemForPrejuizo && (
                <PrejuizoModal 
                    item={selectedItemForPrejuizo}
                    onClose={() => setSelectedItemForPrejuizo(null)}
                    onSuccess={() => { setSelectedItemForPrejuizo(null); fetchOrderDetails(); }}
                />
            )}
        </div>
    );
};

export default FinalizePaymentPage;