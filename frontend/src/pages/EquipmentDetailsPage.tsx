// frontend/src/pages/EquipmentDetailsPage.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

interface Categoria {
    id: number;
    nome: string;
}

interface EquipmentDetails {
    id: number;
    nome: string;
    descricao: string;
    preco_diaria: number;
    status: string;
    url_imagem?: string;
    total_quantidade: number;
    Categoria: Categoria;
}

const EquipmentDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { isLoggedIn } = useAuth();
    const { addToCart } = useCart();
    const navigate = useNavigate(); // <-- A variável navigate agora será usada
    const [equipment, setEquipment] = useState<EquipmentDetails | null>(null);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [quantidade, setQuantidade] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setError('ID do equipamento não fornecido.');
            setLoading(false);
            return;
        }

        const fetchEquipment = async () => {
            try {
                const response = await axios.get<any>(`http://localhost:3001/api/equipment/${id}`);
                setEquipment({
                    ...response.data,
                    preco_diaria: parseFloat(response.data.preco_diaria),
                    total_quantidade: parseInt(response.data.total_quantidade)
                });
                setLoading(false);
            } catch (err) {
                setError('Falha ao carregar os detalhes do equipamento.');
                setLoading(false);
                console.error(err);
            }
        };

        fetchEquipment();
    }, [id]);

    const handleAddToCart = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoggedIn) {
            setMessage('Você precisa estar logado para adicionar itens ao carrinho.');
            return;
        }
        if (!startDate || !endDate) {
            setMessage('Por favor, selecione as datas de início e fim.');
            return;
        }

        if (equipment) {
            const item = {
                id_equipamento: equipment.id,
                nome: equipment.nome,
                quantidade,
                data_inicio: startDate,
                data_fim: endDate,
                preco: equipment.preco_diaria,
            };
            addToCart(item);
            setMessage(`${quantidade}x ${equipment.nome} adicionado ao carrinho!`);
            setStartDate('');
            setEndDate('');
            setQuantidade(1);
            navigate('/cart'); // <-- A variável navigate agora será usada aqui
        }
    };

    if (loading) {
        return (
          <div style={{ paddingTop: '60px' }}>
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>Carregando...</div>
          </div>
        );
    }

    if (error) {
        return (
          <div style={{ paddingTop: '60px' }}>
            <div style={{ textAlign: 'center', marginTop: '2rem', color: 'red' }}>{error}</div>
          </div>
        );
    }

    if (!equipment) {
        return (
          <div style={{ paddingTop: '60px' }}>
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>Equipamento não encontrado.</div>
          </div>
        );
    }

    return (
        <div>
            <div style={{ padding: '2rem', marginTop: '60px' }}>
                <h1 style={{ textAlign: 'center' }}>{equipment.nome}</h1>
                <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
                    <img src={equipment.url_imagem} alt={equipment.nome} style={{ width: '400px', height: 'auto' }} />
                    <div>
                        <p><strong>Descrição:</strong> {equipment.descricao}</p>
                        <p><strong>Preço Diário:</strong> R$ {equipment.preco_diaria.toFixed(2)}</p>
                        <p><strong>Categoria:</strong> {equipment.Categoria?.nome}</p>
                        <p><strong>Status:</strong> {equipment.status}</p>
                        <p><strong>Quantidade Disponível:</strong> {equipment.total_quantidade}</p>

                        <hr style={{ margin: '2rem 0' }} />

                        {isLoggedIn ? (
                          <form onSubmit={handleAddToCart} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h3>Adicionar ao Carrinho</h3>
                            <label>
                              Data de Início:
                              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                            </label>
                            <label>
                              Data de Fim:
                              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                            </label>
                            <label>
                              Quantidade:
                              <input type="number" value={quantidade} min="1" max={equipment.total_quantidade} onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)} required />
                            </label>
                            <button type="submit">Adicionar ao Carrinho</button>
                          </form>
                        ) : (
                          <p>Por favor, faça login para alugar este equipamento.</p>
                        )}
                        {message && <p style={{ marginTop: '1rem' }}>{message}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EquipmentDetailsPage;