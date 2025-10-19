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

interface DetalheVistoriaFeita {
    condicao: string;
    comentarios: string;
    foto: string[] | null;
    id_item_equipamento: number;
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
    condicao: 'ok' | 'danificado';
    comentarios: string;
    fotos: File[];
    checkedAvarias: { [key: number]: boolean };
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

    const vistoriaDeSaida = order?.Vistorias.find(v => v.tipo_vistoria === 'entrega');

    useEffect(() => {
        const fetchOrder = async () => {
            if (!token || !orderId) return;
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const { data } = await axios.get(`http://localhost:3001/api/reservations/${orderId}`, config);
                setOrder(data);

                const initialDetails: { [key: number]: Partial<VistoriaDetailState> } = {};
                data.ItemReservas.forEach((item: ReservedItem) => {

                    // Pega as avarias que já estão "grudadas" na unidade
                    const avariasAtuais = item.Unidade.avarias_atuais || [];

                    // Cria o objeto de 'checkedAvarias' já preenchido
                    const checkedAvarias: { [key: number]: boolean } = {};
                    avariasAtuais.forEach((id: number) => {
                        checkedAvarias[id] = true;
                    });

                    initialDetails[item.Unidade.id] = {
                        condicao: avariasAtuais.length > 0 ? 'danificado' : 'ok',
                        comentarios: '',
                        fotos: [],
                        checkedAvarias: checkedAvarias // Pré-preenche o checklist!
                    };
                });
                setVistoriaDetails(initialDetails);

            } catch (error) {
                console.error("Erro ao buscar ordem para vistoria:", error);
            }
        };
        fetchOrder();
    }, [orderId, token]);

    const handleDetailChange = (unitId: number, field: keyof VistoriaDetailState, value: string) => {
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
                    checkedAvarias: {
                        ...currentChecks,
                        [avariaId]: !currentChecks[avariaId]
                    }
                }
            };
        });
    };

    const handleSubmit = async () => {
        if (!order) return;
        setLoading(true);

        const formData = new FormData();
        formData.append('id_ordem_servico', order.id.toString());
        formData.append('tipo_vistoria', tipoVistoria);

        const detalhesPayload = order.ItemReservas.map(item => {
            const unitDetails = vistoriaDetails[item.Unidade.id];
            const avariasEncontradas = Object.keys(unitDetails?.checkedAvarias || {})
                .filter(id => unitDetails?.checkedAvarias?.[parseInt(id)])
                .map(id => parseInt(id));

            const condicao = unitDetails?.condicao || 'ok';

            return {
                id_unidade: item.Unidade.id,
                condicao: condicao,
                comentarios: unitDetails?.comentarios || '',
                avariasEncontradas: avariasEncontradas
            };
        });
        formData.append('detalhes', JSON.stringify(detalhesPayload));

        order.ItemReservas.forEach(item => {
            const fotosDaUnidade = vistoriaDetails[item.Unidade.id]?.fotos;
            if (fotosDaUnidade) {
                fotosDaUnidade.forEach(file => {
                    formData.append(`fotos[${item.Unidade.id}]`, file);
                });
            }
        });

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post('http://localhost:3001/api/vistorias', formData, config);
            alert(`Vistoria de ${tipoVistoria === 'entrega' ? 'Saída' : 'Devolução'} registrada com sucesso!`);
            navigate('/admin');
        } catch (error) {
            console.error("Erro ao salvar vistoria:", error);
            alert('Falha ao salvar a vistoria.');
        } finally {
            setLoading(false);
        }
    };

    if (!order) return <p>A carregar dados da ordem...</p>;

    return (
        <div style={{ padding: '2rem', marginTop: '60px' }}>
            <h1>{tipoVistoria === 'entrega' ? 'Vistoria de Saída' : 'Vistoria de Devolução'} - Pedido #{order.id}</h1>
            {order.ItemReservas.map(item => {
                const unitId = item.Unidade.id;
                const equipamento = item.Unidade.Equipamento;
                const detalheVistoriaSaida = vistoriaDeSaida?.detalhes.find(d => d.id_item_equipamento === item.Unidade.id);

                return (
                    <div key={item.id} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                        <h3>{equipamento.nome} (Unidade ID: {unitId})</h3>

                        {tipoVistoria === 'devolucao' && detalheVistoriaSaida && (
                            <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px', marginBottom: '1rem' }}>
                                <h4>Dados da Vistoria de Saída (para comparação)</h4>
                                <p><strong>Condição na Saída:</strong> {detalheVistoriaSaida.condicao}</p>
                                <p><strong>Comentários na Saída:</strong> {detalheVistoriaSaida.comentarios || 'N/A'}</p>
                            </div>
                        )}

                        <div>
                            <label style={{fontWeight: 'bold'}}>Condição Geral da Unidade:</label>
                            <select 
                                value={vistoriaDetails[unitId]?.condicao || 'ok'}
                                onChange={e => handleDetailChange(unitId, 'condicao', e.target.value as 'ok' | 'danificado')}
                                style={{color: vistoriaDetails[unitId]?.condicao === 'danificado' ? 'red' : 'green'}}
                            >
                                <option value="ok">OK</option>
                                <option value="danificado">Danificado</option>
                            </select>
                        </div>

                        <h4>Checklist de Avarias</h4>
                        {equipamento.TipoAvarias.map(avaria => (
                            <div key={avaria.id}>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={vistoriaDetails[unitId]?.checkedAvarias?.[avaria.id] || false}
                                        onChange={() => handleAvariaCheck(unitId, avaria.id)}
                                    />
                                    {avaria.descricao} (R$ {avaria.preco})
                                </label>
                            </div>
                        ))}

                        <div style={{ marginTop: '0.5rem' }}>
                            <label>Comentários Adicionais (Ex: "Outros" danos):</label>
                            <textarea
                                style={{ width: '100%', minHeight: '60px' }}
                                value={vistoriaDetails[unitId]?.comentarios || ''}
                                onChange={e => handleDetailChange(unitId, 'comentarios', e.target.value)}
                            />
                        </div>
                        <div style={{ marginTop: '0.5rem' }}>
                            <label>Fotos da Vistoria:</label>
                            <input type="file" multiple accept="image/*" style={{ width: '100%' }}
                                onChange={e => handleFileChange(unitId, e.target.files)} />
                        </div>
                    </div>
                )
            })}
            <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '1rem', fontSize: '1.2rem' }}>
                {loading ? 'A Guardar...' : `Guardar Vistoria de ${tipoVistoria === 'entrega' ? 'Saída' : 'Devolução'}`}
            </button>
        </div>
    );
};

export default VistoriaPage;