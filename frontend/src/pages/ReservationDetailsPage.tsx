import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios, { type AxiosRequestConfig } from 'axios';
import { useAuth } from '../context/AuthContext';


interface Equipamento {
    nome: string;
    url_imagem: string;
}
interface Unidade {
    id: number;
    Equipamento: Equipamento;
}
interface ItemReserva {
    id: number;
    Unidade: Unidade;
}
interface DetalheVistoria {
    id: number;
    id_item_equipamento: number;
    condicao: string;
    comentarios: string;
    foto: string[] | null;
}
interface Vistoria {
    id: number;
    tipo_vistoria: 'entrega' | 'devolucao';
    data: string;
    detalhes: DetalheVistoria[];
}
interface OrderDetails {
    id: number;
    status: string;
    ItemReservas: ItemReserva[];
    Vistorias: Vistoria[];
}

const ReservationDetailsPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [isChecked, setIsChecked] = useState(false);
    const [signing, setSigning] = useState(false);
    const [contractLoading, setContractLoading] = useState(false);
    const backendUrl = 'http://localhost:3001';

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

    const getVistoriaDetailForItem = (unitId: number) => {
        if (!vistoriaDeSaida) return null;
        return vistoriaDeSaida.detalhes.find(d => d.id_item_equipamento === unitId);
    };

    return (
        <div style={{ padding: '2rem', marginTop: '60px', maxWidth: '800px', margin: '80px auto' }}>
            <button onClick={() => navigate('/my-reservations')}>&larr; Voltar para Minhas Reservas</button>
            <h1>Detalhes do Pedido #{order.id}</h1>
            <p style={{ fontSize: '1.2rem' }}><strong>Status:</strong> <span style={{ fontWeight: 'bold' }}>{order.status.replace('_', ' ')}</span></p>

            {vistoriaDeSaida && (
                <>
                    <div style={{ margin: '1.5rem 0' }}>
                        <button onClick={handleDownloadContract} disabled={contractLoading}>
                            {contractLoading ? 'Gerando...' : 'Baixar Contrato em PDF'}
                        </button>
                    </div>

                    {order.status === 'aguardando_assinatura' && (
                        <div style={{ border: '2px solid #007bff', padding: '1.5rem', margin: '2rem 0', borderRadius: '8px' }}>
                            <h3 style={{ marginTop: 0 }}>Ação Necessária: Assinatura do Contrato</h3>
                            <p>Revise o contrato (botão acima) e confirme a assinatura para liberar o aluguel.</p>
                            <div style={{ margin: '1.5rem 0' }}>
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={isChecked}
                                    onChange={() => setIsChecked(!isChecked)}
                                />
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
                </>
            )}

            <hr style={{ margin: '2rem 0' }} />

            <h2>Itens Alugados e Vistoria de Saída</h2>
            {order.ItemReservas.map(item => {
                const vistoriaDetail = getVistoriaDetailForItem(item.Unidade.id);
                return (
                    <div key={item.id} style={{ border: '1px solid #ddd', padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '8px' }}>
                        <h3>{item.Unidade.Equipamento.nome} (Unidade #{item.Unidade.id})</h3>
                        {vistoriaDeSaida ? (
                            vistoriaDetail ? (
                                <div style={{ marginTop: '1rem' }}>
                                    <h4>Relatório da Vistoria de Saída</h4>
                                    <p><strong>Condição:</strong> {vistoriaDetail.condicao}</p>
                                    <p><strong>Comentários:</strong> {vistoriaDetail.comentarios || 'Nenhum comentário.'}</p>
                                    {vistoriaDetail.foto && vistoriaDetail.foto.length > 0 ? (
                                        <div>
                                            <strong>Fotos:</strong><br />
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                                                {vistoriaDetail.foto.map((url, index) => (
                                                    <a key={index} href={`${backendUrl}${url}`} target="_blank" rel="noopener noreferrer">
                                                        <img
                                                            src={`${backendUrl}${url}`}
                                                            alt={`Foto ${index + 1} da vistoria`}
                                                            style={{ height: '100px', width: 'auto', borderRadius: '5px' }}
                                                        />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    ) : <p><strong>Fotos:</strong> Nenhuma foto registrada.</p>}
                                </div>
                            ) : <p>Detalhes da vistoria para este item não encontrados.</p>
                        ) : (
                            <p style={{ color: 'orange' }}>Aguardando vistoria de saída pela nossa equipe.</p>
                        )}
                    </div>
                )
            })}
        </div>
    );
};

export default ReservationDetailsPage;