import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import AvailabilityCalendarModal from '../components/AvailabilityCalendarModal';

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
  const [equipment, setEquipment] = useState<EquipmentDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false); 

  const handleOpenModal = () => {

    setIsModalOpen(true);
  };

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
      } catch (err) {
        setError('Falha ao carregar os detalhes do equipamento.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEquipment();
  }, [id]);

  if (loading) { return <div style={{ paddingTop: '80px', textAlign: 'center' }}>Carregando...</div>; }
  if (error) { return <div style={{ paddingTop: '80px', textAlign: 'center', color: 'red' }}>{error}</div>; }
  if (!equipment) { return <div style={{ paddingTop: '80px', textAlign: 'center' }}>Equipamento não encontrado.</div>; }

  return (
    <>
      <div style={{ padding: '2rem', marginTop: '60px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: '1000px', width: '100%' }}>
          <h1>{equipment.nome}</h1>
          <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem', flexWrap: 'wrap' }}>
            <img
              src={equipment.url_imagem}
              alt={equipment.nome}
              style={{ width: '100%', maxWidth: '500px', height: 'auto', objectFit: 'cover', borderRadius: '8px' }}
            />
            <div style={{ flex: 1, minWidth: '300px' }}>
              <p><strong>Descrição:</strong> {equipment.descricao}</p>
              <p><strong>Categoria:</strong> {equipment.Categoria?.nome}</p>
              <p><strong>Preço Diário:</strong> R$ {equipment.preco_diaria.toFixed(2)}</p>
              <p><strong>Total em Estoque:</strong> {equipment.total_quantidade}</p>

              <button
                onClick={handleOpenModal} 
                style={{ marginTop: '2rem', padding: '1rem', fontSize: '1.2rem', width: '100%' }}
              >
                Ver Agendamento e Disponibilidade
              </button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <AvailabilityCalendarModal
          equipment={equipment}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};

export default EquipmentDetailsPage;