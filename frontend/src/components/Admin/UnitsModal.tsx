import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import UnitCalendar from './UnitCalendar';


interface TipoAvaria {
  id: number;
  descricao: string;
  preco: string;
}

interface EquipamentoComAvarias {
  id: number;
  nome: string;
  TipoAvarias: TipoAvaria[];
}

interface Unit {
  id: number;
  status: 'disponivel' | 'manutencao' | 'alugado';
  avarias_atuais: number[] | null;
}

interface UnitsModalProps {
  equipmentId: number;
  isOpen: boolean;
  onClose: () => void;
}

const UnitItem: React.FC<{
  unit: Unit,
  tiposAvaria: TipoAvaria[],
  token: string | null,
  onDelete: (unitId: number) => void
}> = ({ unit, tiposAvaria, token, onDelete }) => {

  const [status, setStatus] = useState(unit.status);
  const [checkedAvarias, setCheckedAvarias] = useState<{ [key: number]: boolean }>(() => {

    const initialState: { [key: number]: boolean } = {};
    (unit.avarias_atuais || []).forEach(id => {
      initialState[id] = true;
    });
    return initialState;
  });

  const handleAvariaCheck = (avariaId: number) => {
    setCheckedAvarias(prev => ({
      ...prev,
      [avariaId]: !prev[avariaId]
    }));
  };

  const handleSaveStatus = async () => {
    const avariasAtuaisIDs = Object.keys(checkedAvarias)
      .filter(id => checkedAvarias[parseInt(id)])
      .map(id => parseInt(id));

    const newStatus = status;

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        status: newStatus,
        avarias_atuais: avariasAtuaisIDs
      };
      await axios.put(`http://localhost:3001/api/units/${unit.id}/details`, payload, config);
      alert(`Unidade #${unit.id} atualizada!`);
    } catch (error) {
      console.error('Erro ao salvar estado da unidade:', error);
      alert('Falha ao salvar. Tente novamente.');
    }
  };

  return (
    <div style={{ border: '1px solid var(--cor-borda)', backgroundColor: 'var(--cor-fundo-item)', padding: '1rem', marginBottom: '1rem', borderRadius: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
        <h4>Unidade ID: {unit.id}</h4>
        <div>
          <label>Estado: </label>
          <select value={status} onChange={e => setStatus(e.target.value as Unit['status'])} disabled={status === 'alugado'}>
            <option value="disponivel">Disponível</option>
            <option value="manutencao">Em Manutenção</option>
            <option value="alugado">Alugado</option>
          </select>
        </div>
        <button
          onClick={() => onDelete(unit.id)}
          style={{ backgroundColor: '#dc3545', color: 'white', marginLeft: 'auto' }}
        >
          Excluir Unidade
        </button>
      </div>

      <UnitCalendar unitId={unit.id} token={token} />

      <div style={{ marginTop: '1rem' }}>
        <h5>Checklist de Avarias Atuais (Manutenção):</h5>
        
        {tiposAvaria.map(avaria => (
          <div key={avaria.id}>
            <label>
              <input
                type="checkbox"
                checked={checkedAvarias[avaria.id] || false}
                onChange={() => handleAvariaCheck(avaria.id)}
              />
              {avaria.descricao} (R$ {avaria.preco})
            </label>
          </div>
        ))}
      </div>
      <button onClick={handleSaveStatus} style={{ marginTop: '1rem' }}>Salvar Estado da Unidade</button>
    </div>
  );
};

const UnitsModal: React.FC<UnitsModalProps> = ({ equipmentId, isOpen, onClose }) => {
  const { token } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [equipment, setEquipment] = useState<EquipamentoComAvarias | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchModalData = async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const equipRes = await axios.get(`http://localhost:3001/api/equipment/${equipmentId}`, config);

      setEquipment(equipRes.data);

      const unitsRes = await axios.get(`http://localhost:3001/api/equipment/${equipmentId}/units`, config);
      setUnits(unitsRes.data);
    } catch (error) {
      console.error(`Erro ao buscar dados do modal:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModalData();
  }, [equipmentId, isOpen, token]);

  const handleDeleteUnit = async (unitId: number) => {
    if (!window.confirm(`Tem certeza que deseja excluir a unidade ID #${unitId}?`)) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`http://localhost:3001/api/units/${unitId}`, config);
      alert('Unidade excluída com sucesso!');
      fetchModalData();
    } catch (error) {
      console.error('Erro ao excluir unidade:', error);
      alert('Falha ao excluir unidade.');
    }
  };

  if (!isOpen) return null;
  const handleContentClick = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={handleContentClick}>
        <button onClick={onClose} style={closeButtonStyle}>&times;</button>
        {loading ? (
          <p>Carregando...</p>
        ) : (
          <>
            <h2>Gerir Unidades - {equipment?.nome}</h2>
            <hr style={{ borderColor: 'var(--cor-borda)' }} />
            {units.length > 0 ? units.map(unit => (

              <UnitItem
                key={unit.id}
                unit={unit}
                tiposAvaria={equipment?.TipoAvarias || []} 
                token={token}
                onDelete={handleDeleteUnit}
              />
            )) : <p>Nenhuma unidade registada.</p>}
          </>
        )}
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