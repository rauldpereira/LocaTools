import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import UnitsModal from './UnitsModal';

interface Equipamento {
  id: number;
  nome: string;
  preco_diaria: number;
  url_imagem: string;
  total_quantidade: number;
  status: string;
}

const EquipmentList: React.FC = () => {
  const { token } = useAuth();
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null);

  const openUnitsModal = (equipmentId: number) => {
    setSelectedEquipmentId(equipmentId);
    setIsModalOpen(true);
  };

  const closeUnitsModal = () => {
    setIsModalOpen(false);
    setSelectedEquipmentId(null);
  };

  const fetchEquipments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/equipment');
      setEquipamentos(response.data);
    } catch (error) {
      console.error('Erro ao buscar equipamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipments();
  }, []);

  const handleAddUnits = async (equipmentId: number) => {
    const quantityStr = prompt("Quantas unidades deseja adicionar?");
    if (!quantityStr || isNaN(parseInt(quantityStr)) || parseInt(quantityStr) <= 0) {
      alert("Por favor, insira um número válido e maior que zero.");
      return;
    }
    const quantityToAdd = parseInt(quantityStr);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const body = { quantityToAdd };
      const response = await axios.post(`http://localhost:3001/api/equipment/${equipmentId}/units`, body, config);
      alert(response.data.message || 'Unidades adicionadas com sucesso!');
      fetchEquipments();
    } catch (error) {
      console.error('Erro ao adicionar unidades', error);
      alert('Falha ao adicionar unidades.');
    }
  };

  if (loading) return <p>Carregando equipamentos...</p>;

  return (
    <>
      <div style={{ marginTop: '3rem' }}>
        <h2>Equipamentos Cadastrados</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Imagem</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>ID</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Nome</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Qtd. Total</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {equipamentos.map(eq => (
              <tr key={eq.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                  <img src={eq.url_imagem} alt={eq.nome} style={{ width: '100px', height: 'auto' }} />
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{eq.id}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{eq.nome}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                  {eq.total_quantidade || 0}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                  <button onClick={() => openUnitsModal(eq.id)}>
                    Gerenciar Unidades
                  </button>
                  <button onClick={() => handleAddUnits(eq.id)} style={{ marginLeft: '8px' }}>
                    Adicionar Unidades
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedEquipmentId && (
        <UnitsModal
          equipmentId={selectedEquipmentId}
          isOpen={isModalOpen}
          onClose={closeUnitsModal}
        />
      )}
    </>
  );
};

export default EquipmentList;