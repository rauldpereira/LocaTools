import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios, { type AxiosRequestConfig } from 'axios';
import { useAuth } from '../context/AuthContext';
import RescheduleModal from '../components/RescheduleModal';
import HorarioFuncionamento from '../components/HorarioFuncionamento';


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

interface DetalheVistoria {
    id: number;
    id_item_equipamento: number;
    condicao: string; comentarios:
    string; foto: string[] | null;
}

interface Vistoria {
    id: number;
    tipo_vistoria: 'entrega' | 'devolucao';
    data: string;
    detalhes: DetalheVistoria[];
}

interface TipoAvaria {
    id: number;
    descricao:
    string;
    preco: string;
}

interface AvariaEncontrada {
    id: number;
    id_tipo_avaria: number;
    TipoAvaria: TipoAvaria;
}

interface DetalheVistoriaFeita {
    id: number;
    condicao: string;
    comentarios: string;
    foto: string[] | null;
    id_item_equipamento: number;
    avariasEncontradas: AvariaEncontrada[];
}

interface OrderDetails {
    id: number;
    status: string;
    data_inicio: string;
    data_fim: string;
    valor_total: string;
    valor_sinal: string;
    tipo_entrega: string;
    endereco_entrega?: string;
    custo_frete: string;
    taxa_avaria: string;
    taxa_cancelamento?: string;
    valor_reembolsado?: string;
    taxa_remarcacao?: string;
    ItemReservas: ItemReserva[];
    Vistorias: Vistoria[];
}

const parseDateStringAsLocal = (dateString: string) => {
    const dateOnly = dateString.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const ReservationDetailsPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const { token, user } = useAuth();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [isChecked, setIsChecked] = useState(false);
    const [signing, setSigning] = useState(false);
    const [contractLoading, setContractLoading] = useState(false);
    const backendUrl = 'http://localhost:3001';
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);

    const fetchOrderDetails = async () => {
        if (!token || !orderId) return;
        try {
            setLoading(true);
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const { data } = await axios.get(`${backendUrl}/api/reservations/${orderId}`, config);
            setOrder(data);
        } catch (error) {
            console.error("Erro ao buscar detalhes do pedido:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderDetails();
    }, [orderId, token]);

    const handleSignContract = async () => {
        if (!isChecked) {
            alert("Você precisa concordar com os termos do contrato para continuar.");
            return;
        }
        setSigning(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };

            await axios.put(`${backendUrl}/api/reservations/${orderId}/sign`, {}, config);
            alert('Contrato assinado com sucesso! Sua reserva está confirmada.');
            fetchOrderDetails();
        } catch (error) {
            console.error('Erro ao assinar contrato:', error);
            alert('Não foi possível assinar o contrato. Tente novamente.');
        } finally {
            setSigning(false);
            setIsChecked(false);
        }
    };

    const handleDownloadContract = async () => {
        setContractLoading(true);
        try {
            const config: AxiosRequestConfig = {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            };

            const response = await axios.get(`${backendUrl}/api/reservations/contract/${orderId}`, config);

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `contrato_reserva_${orderId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Erro ao baixar o contrato:", error);
            alert("Não foi possível baixar o contrato.");
        } finally {
            setContractLoading(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Carregando detalhes do pedido...</div>;
    if (!order) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Pedido não encontrado.</div>;

    const vistoriaDeSaida = order.Vistorias.find(v => v.tipo_vistoria === 'entrega');
    const vistoriaDeDevolucao = order.Vistorias.find(v => v.tipo_vistoria === 'devolucao');
    const subtotal = Number(order.valor_total) - Number(order.custo_frete);
    const taxaAvariaNum = Number(order.taxa_avaria || 0);
    const taxaRemarcacaoNum = Number(order.taxa_remarcacao || 0);
    const taxaCancelamentoNum = Number(order.taxa_cancelamento || 0);
    const valorReembolsadoNum = Number(order.valor_reembolsado || 0);
    const valorTotalAjustado = Number(order.valor_total) + taxaAvariaNum + taxaRemarcacaoNum;
    const canReschedule = ['aprovada', 'aguardando_assinatura'].includes(order.status);

    const totalDivida = order ? order.ItemReservas.reduce((acc, item) => {
        const valorB_O = (item.prejuizo && !item.prejuizo.resolvido) ? Number(item.prejuizo.valor_prejuizo) : 0;
        return acc + valorB_O;
    }, 0) : 0;

    const totalPendente = order ? totalDivida + (Number(order.valor_total) - Number(order.valor_sinal)) : 0;

    const handleRecoverDebt = async () => {
        if (!window.confirm(`Confirmar o recebimento de R$ ${totalPendente.toFixed(2)} e quitar a dívida?`)) return;

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.put(`${backendUrl}/api/reservations/${orderId}/recover-debt`, {
                valor_recebido: totalPendente,
                forma_pagamento: 'manual_balcao'
            }, config);

            alert("Pagamento registrado! O pedido foi regularizado e finalizado.");
            fetchOrderDetails();
        } catch (error) {
            alert("Erro ao processar pagamento.");
        }
    };

    const VistoriaDetailDisplay = ({ title, detail }: { title: string, detail: DetalheVistoria | DetalheVistoriaFeita | undefined }) => {
        if (!detail) return null;
        const avarias = (detail as DetalheVistoriaFeita).avariasEncontradas;

        return (
            <div style={{ marginTop: '1rem' }}>
                <h4>{title}</h4>
                <p><strong>Condição:</strong> {detail.condicao}</p>
                <p><strong>Comentários:</strong> {detail.comentarios || 'Nenhum comentário.'}</p>

                {avarias && avarias.length > 0 && (
                    <div>
                        <strong>Avarias Registradas:</strong>
                        <ul style={{ margin: '5px 0 10px 20px', padding: 0 }}>
                            {avarias.map(avaria => (
                                <li key={avaria.id} style={{ color: avaria.TipoAvaria.descricao.toLowerCase() === 'outros' ? 'inherit' : 'red' }}>
                                    {avaria.TipoAvaria.descricao}
                                    {Number(avaria.TipoAvaria.preco) > 0 && ` (R$ ${Number(avaria.TipoAvaria.preco).toFixed(2)})`}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {detail.foto && detail.foto.length > 0 ? (
                    <div>
                        <strong>Fotos:</strong><br />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                            {detail.foto.map((url, index) => (
                                <a key={index} href={`${backendUrl}${url}`} target="_blank" rel="noopener noreferrer">
                                    <img
                                        src={`${backendUrl}${url}`}
                                        alt={`Foto ${index + 1}`}
                                        style={{ height: '100px', width: '100px', objectFit: 'cover', borderRadius: '5px' }}
                                    />
                                </a>
                            ))}
                        </div>
                    </div>
                ) : <p><strong>Fotos:</strong> Nenhuma foto registrada.</p>}
            </div>
        );
    };


    return (
        <div style={{ padding: '2rem', marginTop: '60px', maxWidth: '800px', margin: '80px auto' }}>
            {user?.tipo_usuario === 'admin' ? (
                <button onClick={() => navigate('/admin')}>&larr; Voltar para o Painel</button>
            ) : (
                <button onClick={() => navigate('/my-reservations')}>&larr; Voltar para Minhas Reservas</button>
            )}

            <h1 style={{ marginTop: '1rem' }}>Detalhes do Pedido #{order.id}</h1>
            <p style={{ fontSize: '1.2rem' }}><strong>Status:</strong> <span style={{ fontWeight: 'bold' }}>{order.status.replace(/_/g, ' ')}</span></p>

            <HorarioFuncionamento />

            {user?.tipo_usuario !== 'admin' && canReschedule && (
                <button onClick={() => setIsRescheduleModalOpen(true)} style={{ backgroundColor: 'orange', color: 'white', marginRight: '1rem' }}>Remarcar</button>
            )}

            {user?.tipo_usuario === 'admin' && (
                <div style={{
                    border: '1px solid #007bff',
                    padding: '1rem',
                    margin: '2rem 0',
                    borderRadius: '8px',
                    backgroundColor: '#f8f9fa',
                    color: '#333'
                }}>

                    <h3 style={{ marginTop: 0, color: '#333' }}>Ações do Administrador</h3>

                    {order.status === 'aprovada' && <Link to={`/admin/vistoria/${order.id}`}><button>Realizar Vistoria de Saída</button></Link>}
                    {order.status === 'em_andamento' && <Link to={`/admin/vistoria/${order.id}?tipo=devolucao`}><button>Registrar Vistoria de Devolução</button></Link>}
                    {order.status === 'aguardando_pagamento_final' && <Link to={`/admin/finalize-payment/${order.id}`}><button>Finalizar e Cobrar</button></Link>}

                    {(order.status !== 'aprovada' && order.status !== 'em_andamento' && order.status !== 'aguardando_pagamento_final') &&
                        <p>Nenhuma ação pendente para este pedido no momento.</p>
                    }
                </div>
            )}

            {vistoriaDeSaida && (
                <div style={{ margin: '1.5rem 0' }}>
                    <button onClick={handleDownloadContract} disabled={contractLoading}>
                        {contractLoading ? 'Gerando...' : 'Baixar Contrato em PDF'}
                    </button>
                </div>
            )}

            {isRescheduleModalOpen && (
                <RescheduleModal
                    order={order}
                    onClose={() => setIsRescheduleModalOpen(false)}
                    onSuccess={() => {
                        setIsRescheduleModalOpen(false);
                        fetchOrderDetails();
                    }}
                />
            )}

            {order.status === 'PREJUIZO' && user?.tipo_usuario === 'admin' && (
                <div style={{
                    backgroundColor: '#ffe6e6',
                    border: '2px solid #dc3545',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    margin: '2rem 0',
                    textAlign: 'center'
                }}>
                    <h2 style={{ color: '#dc3545', marginTop: 0 }}>PEDIDO COM DÍVIDA ATIVA</h2>
                    <p style={{ fontSize: '1.1rem' }}>Este pedido foi encerrado com pendências financeiras (Roubo/Calote).</p>

                    <h1 style={{ fontSize: '2.5rem', margin: '1rem 0' }}>
                        R$ {totalPendente.toFixed(2)}
                    </h1>

                    <button
                        onClick={handleRecoverDebt}
                        style={{
                            padding: '1rem 2rem',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}
                    >
                        Receber Pagamento e Finalizar
                    </button>
                </div>
            )}

            {user?.tipo_usuario !== 'admin' && order.status === 'aguardando_assinatura' && (
                <div style={{ border: '2px solid #007bff', padding: '1.5rem', margin: '2rem 0', borderRadius: '8px' }}>
                    <h3 style={{ marginTop: 0 }}>Ação Necessária: Assinatura do Contrato</h3>
                    <p>Revise o contrato (botão acima) e confirme a assinatura para liberar o aluguel.</p>
                    <div style={{ margin: '1.5rem 0' }}>
                        <input type="checkbox" id="terms" checked={isChecked} onChange={() => setIsChecked(!isChecked)} />
                        <label htmlFor="terms" style={{ marginLeft: '8px' }}>Li e concordo com os termos do contrato.</label>
                    </div>
                    <button
                        onClick={handleSignContract}
                        disabled={!isChecked || signing}
                        style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', backgroundColor: 'green', color: 'white' }}
                    >
                        {signing ? 'Processando...' : 'Assinar e Confirmar Aluguel'}
                    </button>
                </div>
            )}

            <hr style={{ margin: '2rem 0' }} />

            {order.status === 'cancelada' && (
                <div style={{ border: '1px solid #dc3545', padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '8px', backgroundColor: '#ffffffff' }}>
                    <h3 style={{ marginTop: 0, color: '#721c24' }}>Detalhes do Cancelamento</h3>
                    {taxaCancelamentoNum > 0 && (
                        <p style={{ color: "#666" }}><strong>Taxa de Cancelamento Aplicada:</strong> R$ {taxaCancelamentoNum.toFixed(2)}</p>
                    )}
                    <p style={{ color: "#666" }}><strong>Valor Reembolsado:</strong> R$ {valorReembolsadoNum.toFixed(2)}</p>
                </div>
            )}

            <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <h3>Resumo do Aluguel</h3>
                <p><strong>Período de Saída:</strong> {parseDateStringAsLocal(order.data_inicio).toLocaleDateString()}</p>
                <p><strong>Período de Devolução:</strong> {parseDateStringAsLocal(order.data_fim).toLocaleDateString()}</p>
                <hr style={{ margin: '1rem 0' }} />
                <p>Subtotal dos Itens: R$ {subtotal.toFixed(2)}</p>
                <p>Custo do Frete: R$ {Number(order.custo_frete).toFixed(2)}</p>
                {taxaRemarcacaoNum > 0 && <p style={{ color: 'orange' }}><strong>Taxa de Remarcação:</strong> + R$ {taxaRemarcacaoNum.toFixed(2)}</p>}
                {taxaAvariaNum > 0 && <p style={{ color: 'red' }}><strong>Taxa por Avarias:</strong> + R$ {taxaAvariaNum.toFixed(2)}</p>}
                <p style={{ borderTop: '1px solid #ccc', paddingTop: '10px', marginTop: '10px' }}><strong>Valor Total Ajustado:</strong> R$ {valorTotalAjustado.toFixed(2)}</p>
                <p>Sinal Pago: R$ {Number(order.valor_sinal).toFixed(2)}</p>
                {order.status === 'finalizada' && <p><strong>Valor Restante Pago:</strong> R$ {(valorTotalAjustado - Number(order.valor_sinal)).toFixed(2)}</p>}
            </div>

            <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <h3>Entrega</h3>
                <p><strong>Tipo:</strong> {order.tipo_entrega === 'entrega' ? 'Entrega em domicílio' : 'Retirada na loja'}</p>
                {order.tipo_entrega === 'entrega' && <p><strong>Endereço:</strong> {order.endereco_entrega}</p>}
            </div>

            <hr style={{ margin: '2rem 0' }} />

            <h2>Itens e Vistorias</h2>
            {order.ItemReservas.map(item => {
                const detalheSaida = vistoriaDeSaida?.detalhes.find(d => d.id_item_equipamento === item.Unidade.id);
                const detalheDevolucao = vistoriaDeDevolucao?.detalhes.find(d => d.id_item_equipamento === item.Unidade.id);
                return (
                    <div key={item.id} style={{ border: '1px solid #ddd', padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '8px' }}>
                        <h3>{item.Unidade.Equipamento.nome} (Unidade #{item.Unidade.id})</h3>

                        <div style={{ borderBottom: vistoriaDeDevolucao ? '1px dashed #ccc' : 'none', paddingBottom: '1rem', marginBottom: '1rem' }}>
                            {vistoriaDeSaida ? (
                                <VistoriaDetailDisplay title="Relatório da Vistoria de Saída" detail={detalheSaida} />
                            ) : (
                                order.status !== 'cancelada' && <p style={{ color: 'orange' }}>Aguardando vistoria de saída.</p>
                            )}
                        </div>

                        {vistoriaDeDevolucao ? (
                            <VistoriaDetailDisplay title="Relatório da Vistoria de Devolução" detail={detalheDevolucao} />
                        ) : (
                            (order.status === 'aguardando_pagamento_final' || order.status === 'finalizada') ? (
                                <div>
                                    <h4>Relatório da Vistoria de Devolução</h4>
                                    <p style={{ color: 'green' }}>Devolução Rápida: A vistoria consta que o equipamento foi entregue sem novas avarias.</p>
                                </div>
                            ) : (
                                order.status === 'em_andamento' && <p style={{ color: 'blue' }}>Aguardando devolução do equipamento.</p>
                            )
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default ReservationDetailsPage;