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
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<EquipmentDetails | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [availableQuantity, setAvailableQuantity] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);

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

  useEffect(() => {
    if (startDate && endDate && equipment) {
      if (new Date(endDate) < new Date(startDate)) {
        setMessage('A data de fim deve ser posterior à data de início.');
        setAvailableQuantity(null);
        return;
      }
      setMessage(null);
      setIsChecking(true);
      setAvailableQuantity(null);
      const fetchAvailability = async () => {
        try {
          const response = await axios.get(`http://localhost:3001/api/equipment/${equipment.id}/availability`, {
            params: { startDate, endDate }
          });
          setAvailableQuantity(response.data.availableQuantity);
        } catch (err) {
          console.error('Erro ao verificar disponibilidade:', err);
          setMessage('Não foi possível verificar a disponibilidade.');
        } finally {
          setIsChecking(false);
        }
      };
      const timer = setTimeout(() => {
        fetchAvailability();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [startDate, endDate, equipment]);

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setShowConfirmation(false);
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
      setMessage(`${quantidade}x ${equipment.nome} foi adicionado ao seu carrinho.`);
      setShowConfirmation(true);
    }
  };

  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
    setStartDate('');
    setEndDate('');
    setQuantidade(1);
    setAvailableQuantity(null);
    navigate('/');
  };

  if (loading) { return <div style={{ paddingTop: '60px', textAlign: 'center' }}>Carregando...</div>; }
  if (error) { return <div style={{ paddingTop: '60px', textAlign: 'center', color: 'red' }}>{error}</div>; }
  if (!equipment) { return <div style={{ paddingTop: '60px', textAlign: 'center' }}>Equipamento não encontrado.</div>; }

  return (
    <div>
      <div style={{ padding: '2rem', marginTop: '60px' }}>
        <h1>{equipment.nome}</h1>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem', flexWrap: 'wrap' }}>
          <img src={equipment.url_imagem} alt={equipment.nome} style={{ width: '400px', height: 'auto', objectFit: 'cover' }} />
          <div>
            <p><strong>Descrição:</strong> {equipment.descricao}</p>
            <p><strong>Preço Diário:</strong> R$ {equipment.preco_diaria.toFixed(2)}</p>
            <p><strong>Categoria:</strong> {equipment.Categoria?.nome}</p>
            <p><strong>Status Geral:</strong> {equipment.status}</p>
            <p><strong>Total em Estoque:</strong> {equipment.total_quantidade}</p>
            <hr style={{ margin: '2rem 0' }} />

            {isLoggedIn ? (
              <form onSubmit={handleAddToCart} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3>Reserve este equipamento</h3>
                <label>
                  Data de Início:
                  <input type="date" value={startDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => setStartDate(e.target.value)} required />
                </label>
                <label>
                  Data de Fim:
                  <input type="date" value={endDate} min={startDate || new Date().toISOString().split('T')[0]} onChange={(e) => setEndDate(e.target.value)} required />
                </label>

                {isChecking && <p>Verificando disponibilidade...</p>}

                {availableQuantity !== null && !isChecking && (
                  <>
                    <p style={{ fontWeight: 'bold', color: availableQuantity > 0 ? 'green' : 'red' }}>
                      Disponível neste período: {availableQuantity} unidades
                    </p>
                    {availableQuantity > 0 && (
                      <label>
                        Quantidade:
                        <input
                          type="number"
                          value={quantidade}
                          min="1"
                          max={availableQuantity}
                          onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                          required
                        />
                      </label>
                    )}
                  </>
                )}
                
                <button type="submit" disabled={availableQuantity === null || availableQuantity === 0}>
                  Adicionar ao Carrinho
                </button>
              </form>
            ) : (<p>Por favor, faça login para alugar este equipamento.</p>)}
          </div>
        </div>
      </div>

      {showConfirmation && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ marginTop: 0 }}>Sucesso!</h3>
            <p>{message}</p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => navigate('/cart')}
                style={{ flex: 1, padding: '0.8rem', cursor: 'pointer' }}
              >
                Ir para o Carrinho
              </button>
              <button
                type="button"
                onClick={handleCloseConfirmation}
                style={{ flex: 1, padding: '0.8rem', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white' }}
              >
                Continuar Comprando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
// A LINHA ABAIXO É ONDE O COMPONENTE DEVE FECHAR
};

// OS ESTILOS E O EXPORT DEVEM FICAR FORA (NO NÍVEL PRINCIPAL DO ARQUIVO)
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: '2rem',
  borderRadius: '8px',
  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
  width: '90%',
  maxWidth: '500px',
  textAlign: 'center',
  color: '#333'
};

export default EquipmentDetailsPage;