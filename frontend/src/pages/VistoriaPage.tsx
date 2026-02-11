import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface TipoAvaria {
    id: number;
    descricao: string;
    preco: string;
}

interface Equipamento {
    nome: string;
    TipoAvarias: TipoAvaria[];
}

interface Unit {
    id: number;
    Equipamento: Equipamento;
    avarias_atuais: number[] | null;
}

interface ReservedItem {
    id: number;
    Unidade: Unit;
}

interface AvariaEncontrada {
    id: number;
    id_detalhe_vistoria: number;
    id_tipo_avaria: number;
}

interface DetalheVistoriaFeita {
    id: number;
    condicao: string;
    comentarios: string;
    foto: string[] | null;
    id_item_equipamento: number;
    avariasEncontradas?: AvariaEncontrada[];
}

interface VistoriaFeita {
    detalhes: DetalheVistoriaFeita[];
    tipo_vistoria: string;
}

interface OrderDetails {
    id: number;
    ItemReservas: ReservedItem[];
    Vistorias: VistoriaFeita[];
}

interface VistoriaDetailState {
    statusItem: 'devolvido' | 'prejuizo'; 
    
    condicao: 'ok' | 'danificado';
    comentarios: string;
    fotos: File[];
    checkedAvarias: { [key: number]: boolean };

    tipoPrejuizo: string;
    valorPrejuizo: string;
}

const VistoriaPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { token } = useAuth();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [vistoriaDetails, setVistoriaDetails] = useState<{ [key: number]: Partial<VistoriaDetailState> }>({});
    const [loading, setLoading] = useState(false);
    const params = new URLSearchParams(location.search);
    const tipoVistoria = params.get('tipo') === 'devolucao' ? 'devolucao' : 'entrega';

    useEffect(() => {
        const fetchOrder = async () => {
            if (!token || !orderId) return;
            setLoading(true);
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const { data } = await axios.get(`http://localhost:3001/api/reservations/${orderId}`, config);
                setOrder(data);

                const vistoriaDeSaida = data.Vistorias.find((v: VistoriaFeita) => v.tipo_vistoria === 'entrega');
                const initialDetails: { [key: number]: Partial<VistoriaDetailState> } = {};

                data.ItemReservas.forEach((item: ReservedItem) => {
                    const unitId = item.Unidade.id;
                    let condicao: 'ok' | 'danificado' = 'ok';
                    let comentarios = '';
                    const checkedAvarias: { [key: number]: boolean } = {};

                    if (tipoVistoria === 'devolucao' && vistoriaDeSaida) {
                        const detalheSaida = vistoriaDeSaida.detalhes.find((d: DetalheVistoriaFeita) => d.id_item_equipamento === unitId);
                        if (detalheSaida) {
                            condicao = detalheSaida.condicao as 'ok' | 'danificado';
                            comentarios = detalheSaida.comentarios || '';
                            detalheSaida.avariasEncontradas?.forEach((avaria: AvariaEncontrada) => {
                                checkedAvarias[avaria.id_tipo_avaria] = true;
                            });
                        }
                    } else if (tipoVistoria === 'entrega') {
                        const avariasAtuais = item.Unidade.avarias_atuais || [];
                        avariasAtuais.forEach((id: number) => {
                            checkedAvarias[id] = true;
                        });
                        condicao = avariasAtuais.length > 0 ? 'danificado' : 'ok';
                    }
                    
                    initialDetails[unitId] = {
                        statusItem: 'devolvido',
                        condicao,
                        comentarios,
                        fotos: [],
                        checkedAvarias,
                        tipoPrejuizo: 'ROUBO',
                        valorPrejuizo: ''
                    };
                });
                setVistoriaDetails(initialDetails);
            } catch (error) {
                console.error("Erro ao buscar ordem para vistoria:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [orderId, token, tipoVistoria]);

    const handleDetailChange = (unitId: number, field: keyof VistoriaDetailState, value: any) => {
        setVistoriaDetails(prev => ({ ...prev, [unitId]: { ...prev[unitId], [field]: value } }));
    };

    const handleFileChange = (unitId: number, files: FileList | null) => {
        if (!files) return;
        setVistoriaDetails(prev => ({ ...prev, [unitId]: { ...prev[unitId], fotos: Array.from(files) } }));
    };

    const handleAvariaCheck = (unitId: number, avariaId: number) => {
        setVistoriaDetails(prev => {
            const currentChecks = prev[unitId]?.checkedAvarias || {};
            return {
                ...prev,
                [unitId]: {
                    ...prev[unitId],
                    checkedAvarias: { ...currentChecks, [avariaId]: !currentChecks[avariaId] }
                }
            };
        });
    };

    const handleSubmit = async () => {
        if (!order) return;
        setLoading(true);

        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            const itensPrejuizo = order.ItemReservas.filter(item => vistoriaDetails[item.Unidade.id]?.statusItem === 'prejuizo');
            const itensVistoria = order.ItemReservas.filter(item => vistoriaDetails[item.Unidade.id]?.statusItem === 'devolvido');

            for (const item of itensPrejuizo) {
                const details = vistoriaDetails[item.Unidade.id];
                if (!details?.valorPrejuizo) {
                    alert(`Erro: Informe o valor do prejuízo para o item ${item.Unidade.Equipamento.nome}`);
                    setLoading(false);
                    return;
                }

                await axios.post('http://localhost:3001/api/prejuizos', {
                    item_reserva_id: item.id,
                    tipo: details.tipoPrejuizo,
                    valor_prejuizo: parseFloat(details.valorPrejuizo),
                    observacao: `Registrado na tela de vistoria: ${details.comentarios || 'Sem obs'}`
                }, config);
            }

            if (itensVistoria.length > 0) {
                const formData = new FormData();
                formData.append('id_ordem_servico', order.id.toString());
                formData.append('tipo_vistoria', tipoVistoria);

                let isSubmitValid = true;

                const detalhesPayload = itensVistoria.map(item => {
                    const unitDetails = vistoriaDetails[item.Unidade.id];
                    const avariasEncontradas = Object.keys(unitDetails?.checkedAvarias || {})
                        .filter(id => unitDetails?.checkedAvarias?.[parseInt(id)])
                        .map(id => parseInt(id));

                    const condicao = unitDetails?.condicao || 'ok';
                    const avariaOutros = item.Unidade.Equipamento.TipoAvarias.find(a => a.descricao.toLowerCase() === 'outros');

                    if (avariaOutros && unitDetails?.checkedAvarias?.[avariaOutros.id] && !unitDetails.comentarios) {
                        isSubmitValid = false;
                        alert(`Erro na Unidade #${item.Unidade.id}: Você marcou "Outros" mas não preencheu os comentários.`);
                    }

                    return {
                        id_unidade: item.Unidade.id,
                        condicao: condicao,
                        comentarios: unitDetails?.comentarios || '',
                        avariasEncontradas: avariasEncontradas
                    };
                });

                if (!isSubmitValid) {
                    setLoading(false);
                    return;
                }

                formData.append('detalhes', JSON.stringify(detalhesPayload));

                itensVistoria.forEach(item => {
                    const fotosDaUnidade = vistoriaDetails[item.Unidade.id]?.fotos;
                    if (fotosDaUnidade) {
                        fotosDaUnidade.forEach(file => {
                            formData.append(`fotos[${item.Unidade.id}]`, file);
                        });
                    }
                });

                await axios.post('http://localhost:3001/api/vistorias', formData, config);
            }

            alert('Processo concluído com sucesso!');
            navigate('/admin');

        } catch (error: any) {
            console.error("Erro ao salvar:", error);
            alert('Erro ao processar: ' + (error.response?.data?.error || 'Tente novamente.'));
        } finally {
            setLoading(false);
        }
    };

    if (!order) return <p>A carregar dados da ordem...</p>;

    const vistoriaDeSaida = order?.Vistorias.find(v => v.tipo_vistoria === 'entrega');

    return (
        <div style={{ padding: '2rem', marginTop: '60px', maxWidth: '900px', margin: '80px auto', color: "black" }}>
            <h1 style={{color: "white"}}>{tipoVistoria === 'entrega' ? 'Vistoria de Saída' : 'Vistoria de Devolução'} - Pedido #{order.id}</h1>
            
            {order.ItemReservas.map(item => {
                const unitId = item.Unidade.id;
                const equipamento = item.Unidade.Equipamento;
                const details = vistoriaDetails[unitId];
                const isPrejuizo = details?.statusItem === 'prejuizo';

                const detalheVistoriaSaida = vistoriaDeSaida?.detalhes.find(d => d.id_item_equipamento === item.Unidade.id);
                const avariaOutros = equipamento.TipoAvarias.find(a => a.descricao.toLowerCase() === 'outros');
                const avariasNormais = equipamento.TipoAvarias.filter(a => a.descricao.toLowerCase() !== 'outros');

                return (
                    <div key={item.id} style={{ 
                        border: isPrejuizo ? '2px solid #dc3545' : '1px solid #ccc',
                        borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem',
                        backgroundColor: isPrejuizo ? '#fff5f5' : 'white'
                    }}>
                        <h3 style={{marginTop: 0}}>{equipamento.nome} (Unidade ID: {unitId})</h3>

                        {tipoVistoria === 'devolucao' && (
                            <div style={{ display: 'flex', gap: '20px', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                <label style={{ cursor: 'pointer', fontWeight: !isPrejuizo ? 'bold' : 'normal' }}>
                                    <input 
                                        type="radio" 
                                        name={`status_${unitId}`} 
                                        checked={!isPrejuizo}
                                        onChange={() => handleDetailChange(unitId, 'statusItem', 'devolvido')}
                                    /> 
                                    Item Devolvido (Fazer Vistoria)
                                </label>
                                <label style={{ cursor: 'pointer', color: '#dc3545', fontWeight: isPrejuizo ? 'bold' : 'normal' }}>
                                    <input 
                                        type="radio" 
                                        name={`status_${unitId}`} 
                                        checked={isPrejuizo}
                                        onChange={() => handleDetailChange(unitId, 'statusItem', 'prejuizo')}
                                    /> 
                                    Não Devolvido / Roubo / Perda
                                </label>
                            </div>
                        )}

                        {!isPrejuizo && (
                            <>
                                {tipoVistoria === 'devolucao' && detalheVistoriaSaida && (
                                    <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px', marginBottom: '1rem', color: '#333', fontSize: '0.9rem' }}>
                                        <strong>Histórico (Saída):</strong> {detalheVistoriaSaida.condicao} - {detalheVistoriaSaida.comentarios || 'Sem obs'}
                                    </div>
                                )}

                                <div>
                                    <label style={{ fontWeight: 'bold' }}>Condição Geral:</label>
                                    <select
                                        value={details?.condicao || 'ok'}
                                        onChange={e => handleDetailChange(unitId, 'condicao', e.target.value)}
                                        style={{ marginLeft: '10px', padding: '5px' }}
                                    >
                                        <option value="ok">OK / Bom Estado</option>
                                        <option value="danificado">Danificado / Avariado</option>
                                    </select>
                                </div>

                                <h4 style={{marginBottom: '5px'}}>Checklist de Avarias</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                                    {avariasNormais.map(avaria => (
                                        <label key={avaria.id}>
                                            <input
                                                type="checkbox"
                                                checked={details?.checkedAvarias?.[avaria.id] || false}
                                                onChange={() => handleAvariaCheck(unitId, avaria.id)}
                                            />
                                            {' '}{avaria.descricao}
                                        </label>
                                    ))}
                                </div>

                                {avariaOutros && (
                                    <div style={{ marginTop: '10px' }}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={details?.checkedAvarias?.[avariaOutros.id] || false}
                                                onChange={() => handleAvariaCheck(unitId, avariaOutros.id)}
                                            />
                                            {' '}Outros (Descreva abaixo)
                                        </label>
                                    </div>
                                )}

                                <div style={{ marginTop: '1rem' }}>
                                    <label>Fotos:</label>
                                    <input type="file" multiple accept="image/*" style={{ display: 'block', marginTop: '5px' }}
                                        onChange={e => handleFileChange(unitId, e.target.files)} />
                                </div>
                            </>
                        )}

                        {isPrejuizo && (
                            <div style={{ backgroundColor: '#fff', padding: '10px' }}>
                                <p style={{color: '#dc3545', fontWeight: 'bold', marginBottom: '1rem'}}>
                                    Atenção: Ao confirmar, este item será baixado do estoque e o contrato deste item encerrado.
                                </p>
                                
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{display: 'block', fontWeight: 'bold'}}>Motivo do B.O.:</label>
                                    <select 
                                        value={details?.tipoPrejuizo}
                                        onChange={e => handleDetailChange(unitId, 'tipoPrejuizo', e.target.value)}
                                        style={{ width: '100%', padding: '8px' }}
                                    >
                                        <option value="ROUBO">Roubo (Baixa de Estoque)</option>
                                        <option value="EXTRAVIO">Extravio (Baixa de Estoque)</option>
                                        <option value="AVARIA">Avaria Total / Perda Total</option>
                                        <option value="CALOTE">Calote (Item Retornado, mas não pago)</option>
                                    </select>
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{display: 'block', fontWeight: 'bold'}}>Valor do Prejuízo (R$):</label>
                                    <input 
                                        type="number" 
                                        placeholder="Ex: 2500.00"
                                        value={details?.valorPrejuizo}
                                        onChange={e => handleDetailChange(unitId, 'valorPrejuizo', e.target.value)}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #dc3545' }}
                                    />
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: '1rem' }}>
                            <label style={{ fontWeight: 'bold', color: "black" }}>
                                {isPrejuizo ? 'Justificativa / Observação do B.O.:' : 'Comentários da Vistoria:'}
                            </label>
                            <textarea
                                style={{ width: '100%', minHeight: '80px', marginTop: '5px', padding: '8px' }}
                                value={details?.comentarios || ''}
                                onChange={e => handleDetailChange(unitId, 'comentarios', e.target.value)}
                                placeholder={isPrejuizo ? "Descreva o ocorrido (obrigatório)..." : "Observações gerais..."}
                            />
                        </div>

                    </div>
                );
            })}

            <button onClick={handleSubmit} disabled={loading} 
                style={{ 
                    width: '100%', padding: '1.2rem', fontSize: '1.2rem', fontWeight: 'bold', 
                    backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' 
                }}>
                {loading ? 'Processando...' : 'Confirmar e Salvar Tudo'}
            </button>
        </div>
    );
};

export default VistoriaPage;