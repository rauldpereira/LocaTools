import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import PrejuizoModal from '../components/Admin/PrejuizoModal'; 
import { useToast } from '../context/ToastContext';
import { AlertTriangle, Clock, FileText, CheckCircle, Plus, ShieldAlert, DollarSign, ArrowLeft, Info, Package } from 'lucide-react';

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
  const toast = useToast();
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
    const [valorPagoHoje, setValorPagoHoje] = useState<number>(0);
    const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, action: string, msg: string}>({isOpen: false, action: "", msg: ""});

    const backendUrl = import.meta.env.VITE_API_URL;

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
        setConfirmModal({
            isOpen: true,
            action: "payment",
            msg: `Confirmar recebimento de R$ ${valorFinal.toFixed(2)} e finalizar ordem?`
        });
    };

    const handleFinishWithDebt = async () => {
        const msg = valorPagoHoje > 0 
            ? `ATENÇÃO: Você está encerrando o pedido com um pagamento parcial de R$ ${valorPagoHoje.toFixed(2)}.\n\nO valor restante de R$ ${(valorFinal - valorPagoHoje).toFixed(2)} ficará como pendência (Status PREJUÍZO). Deseja continuar?`
            : `ATENÇÃO: Você está encerrando SEM confirmar o pagamento total.\n\nO pedido ficará com status 'PREJUÍZO' e o valor total de R$ ${valorFinal.toFixed(2)} ficará como pendência. Deseja continuar?`;

        setConfirmModal({
            isOpen: true,
            action: "debt",
            msg
        });
    };

    const executeAction = async () => {
        const { action } = confirmModal;
        setConfirmModal({ isOpen: false, action: "", msg: "" });

        if (action === "payment") {
            if (!order) return;
            const totalExtras = calculatedFee + outrosFee + totalPrejuizos;

            setLoading(true);
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const body = {
                    damageFee: totalExtras,
                    lateFee: multaAtraso
                };
                await axios.put(`${backendUrl}/api/reservations/${orderId}/confirm-manual-payment`, body, config);
                toast.success("Pagamento confirmado e ordem finalizada!");
                navigate('/admin');
            } catch (error) {
                console.error("Erro ao confirmar:", error);
                toast.error("Falha ao finalizar ordem.");
            } finally {
                setLoading(false);
            }
        } else if (action === "debt") {
            setLoading(true);
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const body = { 
                    damageFee: (calculatedFee + outrosFee),
                    lateFee: multaAtraso,
                    valor_pago: valorPagoHoje
                };
                await axios.put(`${backendUrl}/api/reservations/${orderId}/finish-with-debt`, body, config);
                toast.error("Ordem encerrada com pendências financeiras.");
                navigate('/admin');
            } catch (error) {
                console.error("Erro ao finalizar com dívida:", error);
                toast.error("Falha ao encerrar ordem.");
            } finally {
                setLoading(false);
            }
        }
    };

    if (loading || !order) return <p style={{textAlign:'center', marginTop:'50px'}}>Carregando...</p>;

    const temAvariaOutrosGlobal = inspectionNotes.some(n => n.marcouOutros);

    return (
        <div style={{ maxWidth: '850px', margin: '90px auto 50px auto', padding: '0 20px', animation: "fadeIn 0.3s ease", color: "#1e293b" }}>
            
            <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "30px" }}>
                <button onClick={() => navigate(-1)} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "50%", padding: "10px", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                    <ArrowLeft size={24} />
                </button>
                <div style={{ backgroundColor: "#ecfdf5", padding: "15px", borderRadius: "14px" }}>
                    <DollarSign size={32} color="#10b981" />
                </div>
                <div style={{ flex: 1 }}>
                    <h1 style={{ margin: 0, color: "#1e293b", fontSize: "1.8rem", fontWeight: 800 }}>
                        Fechamento Financeiro
                    </h1>
                    <p style={{ margin: "5px 0 0 0", color: "#64748b", fontWeight: "600", fontSize: "1rem" }}>
                        Pedido #{orderId}
                    </p>
                </div>
            </div>
            
            {order.status === 'PREJUIZO' && (
                <div style={{ display: "flex", gap: "15px", alignItems: "center", backgroundColor: '#fef2f2', padding: '15px 20px', border: '1px solid #fca5a5', borderRadius: '12px', marginBottom: '25px', boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)" }}>
                    <ShieldAlert size={32} color="#ef4444" style={{ flexShrink: 0 }} />
                    <div>
                        <h3 style={{ color: '#b91c1c', margin: '0 0 5px 0', fontSize: "1.1rem" }}>Atenção: Este pedido possui Ocorrência/Prejuízo registrado</h3>
                        <p style={{ margin: 0, color: "#991b1b", fontSize: "0.95rem" }}>O valor dos itens perdidos/avariados foi adicionado ao total abaixo.</p>
                    </div>
                </div>
            )}

            {diasAtraso > 0 && (
                <div style={{ display: "flex", gap: "15px", alignItems: "flex-start", marginBottom: '25px', padding: '20px', backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '12px', color: '#b45309', boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)" }}>
                    <Clock size={32} color="#d97706" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <h3 style={{ marginTop: 0, marginBottom: "10px", fontSize: "1.1rem", color: "#d97706" }}>Atraso na Devolução Detectado</h3>
                        <p style={{ margin: "0 0 5px 0" }}>Este pedido deveria ter sido devolvido em <strong>{parseDateStringAsLocal(order.data_fim).toLocaleDateString()}</strong>.</p>
                        <p style={{ margin: "0 0 10px 0" }}>Atraso calculado: <strong>{diasAtraso} dias</strong>.</p>
                        <p style={{ fontSize: '1.1rem', margin: 0 }}>Multa sugerida (Art. 575 CC): <strong>R$ {multaAtraso.toFixed(2)}</strong></p>
                        <div style={{ marginTop: '10px', fontSize: '0.85rem', fontStyle: 'italic', opacity: 0.8 }}>
                            * Este valor já foi adicionado automaticamente ao resumo final.
                        </div>
                    </div>
                </div>
            )}

            <div style={{ border: '1px solid #cbd5e1', padding: '25px', borderRadius: '16px', marginBottom: '30px', backgroundColor: "#fff", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)" }}>
                <h3 style={{ margin: "0 0 20px 0", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px", fontSize: "1.3rem" }}>
                    <Package size={22} color="#64748b" /> Itens do Pedido
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    {order.ItemReservas.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid #e2e8f0', borderRadius: "12px", backgroundColor: "#f8fafc" }}>
                            <div>
                                <strong style={{ color: "#334155", fontSize: "1.05rem" }}>{item.Unidade.Equipamento.nome}</strong> 
                                <span style={{ color: '#94a3b8', fontSize: '0.9rem', marginLeft: "8px", fontWeight: "bold" }}>(ID: {item.Unidade.id})</span>
                                {item.prejuizo && (
                                    <div style={{ color: '#ef4444', fontSize: '0.9rem', marginTop: '5px', display: "flex", alignItems: "center", gap: "5px", fontWeight: "600" }}>
                                        <AlertTriangle size={14} />
                                        <span>{item.prejuizo.tipo === "ROUBO" ? "Não Devolvido / Extraviado" : item.prejuizo.tipo === "CALOTE" ? "Inadimplência" : item.prejuizo.tipo === "AVARIA" ? "Perda Total" : item.prejuizo.tipo === "EXTRAVIO" ? "Extravio" : item.prejuizo.tipo}: R$ {Number(item.prejuizo.valor_prejuizo).toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                            {item.status === 'FINALIZADO_COM_PREJUIZO' ? (
                                <span style={{ color: '#ef4444', fontWeight: 'bold', border: '1px solid #fecaca', backgroundColor: "#fef2f2", padding: '6px 10px', borderRadius: '8px', fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "5px" }}>
                                    <ShieldAlert size={14} /> OCORRÊNCIA REGISTRADA
                                </span>
                            ) : (
                                <button onClick={() => setSelectedItemForPrejuizo(item)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px", transition: "0.2s" }} onMouseOver={e => e.currentTarget.style.backgroundColor = "#dc2626"} onMouseOut={e => e.currentTarget.style.backgroundColor = "#ef4444"}>
                                    <ShieldAlert size={16} /> Registrar Ocorrência
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* RELATÓRIO DA VISTORIA */}
            <div style={{ border: '1px solid #cbd5e1', padding: '25px', borderRadius: '16px', marginBottom: '30px', backgroundColor: temAvariaOutrosGlobal ? '#fff5f5' : '#fff', boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)" }}>
                <h3 style={{ margin: "0 0 20px 0", color: temAvariaOutrosGlobal ? '#b91c1c' : '#1e293b', display: "flex", alignItems: "center", gap: "8px", fontSize: "1.3rem" }}>
                    <FileText size={22} color={temAvariaOutrosGlobal ? '#b91c1c' : '#64748b'} /> Relatório da Vistoria de Devolução
                </h3>
                
                {inspectionNotes.length > 0 ? (
                    <div>
                        {inspectionNotes.map((note, idx) => (
                            <div key={idx} style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px' }}>
                                <h4 style={{ margin: '0 0 15px 0', color: '#334155', fontSize: "1.1rem" }}>{note.nomeEquipamento} <span style={{color:'#94a3b8', fontSize:'0.9rem'}}>(ID: {note.idUnidade})</span></h4>
                                
                                {/* AVARIAS NOVAS (SÃO COBRADAS) */}
                                {note.novasAvarias.length > 0 && (
                                    <div style={{ marginBottom: '15px' }}>
                                        <strong style={{ color: '#ef4444', display: "flex", alignItems: "center", gap: "5px" }}><Plus size={16}/> Avarias Novas (A Cobrar):</strong>
                                        <ul style={{ margin: '8px 0', paddingLeft: '25px', color: '#ef4444', fontWeight: 'bold' }}>
                                            {note.novasAvarias.map((a, i) => (
                                                <li key={i} style={{ marginBottom: "5px" }}>{a.descricao} - R$ {Number(a.preco).toFixed(2)}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* AVARIAS VELHAS (NÃO SÃO COBRADAS) */}
                                {note.avariasAntigas.length > 0 && (
                                    <div style={{ marginBottom: '15px' }}>
                                        <strong style={{ color: '#64748b', display: "flex", alignItems: "center", gap: "5px" }}><CheckCircle size={16}/> Avarias Pré-existentes (Já estavam na Saída):</strong>
                                        <ul style={{ margin: '8px 0', paddingLeft: '25px', color: '#64748b', fontStyle: 'italic' }}>
                                            {note.avariasAntigas.map((a, i) => (
                                                <li key={i} style={{ marginBottom: "5px" }}>{a.descricao} - Não cobrar (R$ 0,00)</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {note.marcouOutros && (
                                    <div style={{ marginBottom: '15px', padding: '12px 15px', backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: '8px', fontWeight: 'bold', display: "flex", alignItems: "center", gap: "8px" }}>
                                        <AlertTriangle size={18} /> A opção "Outros" foi MARCADA. Leia o comentário abaixo e adicione o valor no campo de Taxa Extra.
                                    </div>
                                )}

                                <div style={{ padding: '15px', backgroundColor: '#fff', borderLeft: '4px solid #94a3b8', borderRadius: "0 8px 8px 0", fontSize: '0.95rem', color: '#334155', borderTop: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
                                    <strong style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px" }}><Info size={16}/> Observações do Vistoriador:</strong>
                                    <span style={{ fontStyle: 'italic', whiteSpace: 'pre-wrap', color: "#475569" }}>{note.comentarios || "Nenhum comentário deixado."}</span>
                                </div>
                            </div>
                        ))}
                        
                        <p style={{fontWeight: 'bold', textAlign: 'right', fontSize: '1.1rem', color: "#1e293b", marginTop: "20px"}}>Subtotal Avarias Tabeladas: R$ {calculatedFee.toFixed(2)}</p>
                    </div>
                ) : <p style={{color: '#64748b', fontStyle: "italic"}}>Nenhuma observação ou avaria registrada na devolução.</p>}

                <hr style={{ margin: '20px 0', borderColor: '#e2e8f0' }} />
                
                <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <label style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 'bold', color: '#3b82f6', flexWrap: "wrap", gap: "10px"}}>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Plus size={18} /> Adicionar Valor Manual (Outros / Taxa Extra):</span>
                        <div style={{display: 'flex', alignItems: 'center'}}>
                            R$ 
                            <input
                                type="number"
                                value={outrosFee}
                                onChange={(e) => setOutrosFee(Number(e.target.value))}
                                min="0"
                                style={{marginLeft: '10px', padding: '10px 15px', width: '130px', textAlign: 'right', fontSize: '1.1rem', fontWeight: 'bold', border: '2px solid #3b82f6', borderRadius: '8px', outline: "none", color: "#1e293b"}}
                            />
                        </div>
                    </label>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '10px', marginBottom: 0, fontStyle: "italic" }}>
                        * Use este campo se o vistoriador marcou "Outros" ou se houver alguma negociação extra.
                    </p>
                </div>
            </div>

            <div style={{ border: '1px solid #cbd5e1', padding: '25px', borderRadius: '16px', backgroundColor: '#fff', boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)" }}>
                <h2 style={{ marginTop: 0, borderBottom: '2px solid #e2e8f0', color: "#1e293b", paddingBottom: '15px', fontSize: "1.5rem", display: "flex", alignItems: "center", gap: "8px" }}>
                    Resumo Final
                </h2>
                <div style={{ fontSize: '1.1rem', lineHeight: '2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: "#475569", fontWeight: "600" }}>
                        <span>Valor Restante do Aluguel:</span>
                        <span>R$ {valorRestante.toFixed(2)}</span>
                    </div>
                    {taxaRemarcacao > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706', fontWeight: "600" }}>
                            <span>Taxa de Remarcação:</span>
                            <span>+ R$ {taxaRemarcacao.toFixed(2)}</span>
                        </div>
                    )}
                    {(calculatedFee + outrosFee) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444', fontWeight: "600" }}>
                            <span>Avarias e Extras:</span>
                            <span>+ R$ {(calculatedFee + outrosFee).toFixed(2)}</span>
                        </div>
                    )}
                    {totalPrejuizos > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c', fontWeight: 'bold' }}>
                            <span>Perdas / Extravios / Ocorrências:</span>
                            <span>+ R$ {totalPrejuizos.toFixed(2)}</span>
                        </div>
                    )}
                    {multaAtraso > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ea580c', fontWeight: 'bold', backgroundColor: '#fef3c7', padding: '5px 10px', borderRadius: "8px", marginTop: "5px" }}>
                            <span>Multa por Atraso ({diasAtraso} dias):</span>
                            <span>+ R$ {multaAtraso.toFixed(2)}</span>
                        </div>
                    )}

                    <hr style={{ margin: '20px 0', borderColor: "#e2e8f0" }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.1rem', fontWeight: '900', color: '#10b981' }}>
                        <span>TOTAL A RECEBER:</span>
                        <span style={{ fontSize: '1.3rem' }}>R$ {valorFinal.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div style={{ border: '1px solid #cbd5e1', padding: '20px', borderRadius: '16px', marginTop: '20px', backgroundColor: '#f8fafc', boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#475569", display: "flex", alignItems: "center", gap: "6px", fontSize: "1rem", fontWeight: "800" }}>
                    <DollarSign size={18} color="#10b981" /> Pagamento Parcial na Devolução
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: '500px', lineHeight: '1.4' }}>
                        Se o cliente estiver pagando apenas uma parte do valor total hoje, informe o valor abaixo. O restante será gerado como pendência (dívida ativa / prejuízo).
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>
                        R$ 
                        <input
                            type="number"
                            value={valorPagoHoje || ""}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setValorPagoHoje(val);
                            }}
                            min="0"
                            max={valorFinal}
                            placeholder="0.00"
                            style={{ marginLeft: '10px', padding: '8px 12px', width: '120px', textAlign: 'right', fontSize: '1rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontWeight: 'bold', color: '#2563eb' }}
                        />
                    </div>
                </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px' }}>
                <button 
                    onClick={handleFinishWithDebt} 
                    disabled={loading}
                    style={{ 
                        padding: '20px', fontSize: '1.1rem', fontWeight: 'bold',
                        backgroundColor: 'white', color: '#ea580c', 
                        border: '2px solid #ea580c', borderRadius: '14px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: "8px", transition: "0.2s"
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = "#fff7ed"}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = "white"}
                >
                    <AlertTriangle size={32} />
                    Encerrar com Pendência
                    <span style={{fontSize: '0.85rem', fontWeight: '600', color: "#f97316"}}>
                        {valorPagoHoje > 0 
                            ? `(Pagar R$ ${valorPagoHoje.toFixed(2)} e Gerar Dívida de R$ ${(valorFinal - valorPagoHoje).toFixed(2)})`
                            : "(Gerar Dívida / Não Pago)"
                        }
                    </span>
                </button>

                <button 
                    onClick={handleManualConfirmation} 
                    disabled={loading}
                    style={{ 
                        padding: '20px', fontSize: '1.1rem', fontWeight: 'bold',
                        backgroundColor: '#10b981', color: 'white', 
                        border: 'none', borderRadius: '14px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: "8px",
                        boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)', transition: "0.2s"
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
                    onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
                >
                    <CheckCircle size={32} />
                    Confirmar Recebimento Total
                    <span style={{fontSize: '0.85rem', fontWeight: '600', opacity: 0.9}}>(R$ {valorFinal.toFixed(2)})</span>
                </button>
            </div>

            {selectedItemForPrejuizo && (
                <PrejuizoModal 
                    item={selectedItemForPrejuizo}
                    onClose={() => setSelectedItemForPrejuizo(null)}
                    onSuccess={() => { setSelectedItemForPrejuizo(null); fetchOrderDetails(); }}
                />
            )}

            {confirmModal.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, animation: 'fadeIn 0.2s ease' }} onClick={() => setConfirmModal({isOpen: false, action: "", msg: ""})}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '90%', maxWidth: '400px', padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b' }}>
                            <AlertTriangle size={24} color={confirmModal.action === "debt" ? "#e67e22" : "#28a745"} />
                            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Confirmação</h3>
                        </div>
                        <p style={{ margin: 0, color: '#475569', fontSize: '1rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                            {confirmModal.msg}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                            <button onClick={() => setConfirmModal({isOpen: false, action: "", msg: ""})} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fff'}>
                                Cancelar
                            </button>
                            <button onClick={executeAction} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: confirmModal.action === "debt" ? '#e67e22' : '#28a745', color: '#fff', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinalizePaymentPage;