import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import UnitCalendar from './UnitCalendar';

interface Unit {
  id: number;
  status: 'disponivel' | 'manutencao';
}

interface UnitsModalProps {
  equipmentId: number;
  isOpen: boolean;
  onClose: () => void;
}

const UnitsModal: React.FC<UnitsModalProps> = ({ equipmentId, isOpen, onClose }) => {
  const { token } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);

  const fetchUnits = async () => {
    if (!isOpen) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(`http://localhost:3001/api/equipment/${equipmentId}/units`, config);
      setUnits(data);
    } catch (error) {
      console.error(`Erro ao buscar unidades:`, error);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, [equipmentId, isOpen, token]);

  const handleDeleteUnit = async (unitId: number) => {
    if (!window.confirm(`Tem certeza que deseja excluir a unidade ID #${unitId}?`)) return;
    try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        await axios.delete(`http://localhost:3001/api/units/${unitId}`, config);
        alert('Unidade excluída com sucesso!');
        fetchUnits(); 
    } catch (error) {
        console.error('Erro ao excluir unidade:', error);
        alert('Falha ao excluir unidade.');
    }
  };

  const handleStatusChange = async (unitId: number, newStatus: string) => {
    try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        await axios.put(`http://localhost:3001/api/units/${unitId}`, { status: newStatus }, config);
        setUnits(prevUnits => 
            prevUnits.map(unit => unit.id === unitId ? { ...unit, status: newStatus as Unit['status'] } : unit)
        );
    } catch (error) {
        console.error('Erro ao atualizar status da unidade:', error);
    }
  };
  

  if (!isOpen) return null;

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={handleContentClick}>
        <h2>Gerir Unidades do Equipamento #{equipmentId}</h2>
        <button onClick={onClose} style={closeButtonStyle}>Fechar (X)</button>
        <hr style={{ borderColor: 'var(--cor-borda)' }} />

        {units.length > 0 ? units.map(unit => (
          <div key={unit.id} style={{
              border: '1px solid var(--cor-borda)',
              backgroundColor: 'var(--cor-fundo-item)', 
              padding: '1rem', 
              marginBottom: '1rem',
              borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
              <h4>Unidade ID: {unit.id}</h4>
              <div>
                  <label>Estado: </label>
                  <select value={unit.status} onChange={e => handleStatusChange(unit.id, e.target.value)}>
                      <option value="disponivel">Disponível</option>
                      <option value="manutencao">Em Manutenção</option>
                  </select>
              </div>
            </div>
            <button 
                    onClick={() => handleDeleteUnit(unit.id)} 
                    style={{ backgroundColor: '#dc3545', color: 'white', marginLeft: 'auto' }}
                  >
                    Excluir
                  </button>
            <h5>Agenda de Reservas:</h5>
            <UnitCalendar unitId={unit.id} token={token} />
          </div>
        )) : <p>Nenhuma unidade registada para este equipamento.</p>}
      </div>
    </div>
  );
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', zIndex: 1000, top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
  justifyContent: 'center', alignItems: 'center'
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'var(--cor-fundo-modal)', 
  color: 'var(--cor-texto-principal)',
  padding: '2rem', 
  borderRadius: '8px',
  border: '1px solid var(--cor-borda)',
  width: '80%', 
  maxWidth: '800px', 
  maxHeight: '90vh', 
  overflowY: 'auto',
  position: 'relative'
};

const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '15px',
    right: '15px',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    color: 'var(--cor-texto-principal)'
};

export default UnitsModal;