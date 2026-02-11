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
  ItensReserva?: any[]; // Vem do backend com as reservas/manutenções
}

interface UnitsModalProps {
  equipmentId: number;
  isOpen: boolean;
  onClose: () => void;
}

const UnitItem: React.FC<{
  unit: Unit,
  tiposAvaria: any[],
  token: string | null,
  onDelete: (unitId: number) => void,
  onUpdate: () => void
}> = ({ unit, tiposAvaria, token, onDelete, onUpdate }) => {

  const [status, setStatus] = useState(unit.status);
  const [showCalendar, setShowCalendar] = useState(false);

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

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        status: status,
        avarias_atuais: avariasAtuaisIDs
      };
      await axios.put(`http://localhost:3001/api/units/${unit.id}/details`, payload, config);
      alert(`Unidade #${unit.id} atualizada!`);
      onUpdate();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Falha ao salvar.');
    }
  };

  return (
    <div style={{ border: '1px solid #ddd', backgroundColor: '#f9f9f9', padding: '1rem', marginBottom: '1rem', borderRadius: '8px' }}>
      
      {/* --- LINHA SUPERIOR: ID, STATUS, BOTÕES --- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <h4 style={{margin:0}}>ID: {unit.id}</h4>
        
        {/* Select de Status */}
        <div>
          <select 
            value={status} 
            onChange={e => setStatus(e.target.value as any)} 
            disabled={status === 'alugado'}
            style={{padding: '5px', borderRadius:'4px'}}
          >
            <option value="disponivel">Disponível</option>
            <option value="manutencao">Em Manutenção</option>
            <option value="alugado">Alugado</option>
          </select>
        </div>

        {/* BOTÃO PARA ABRIR/FECHAR CALENDÁRIO */}
        <button 
            onClick={() => setShowCalendar(!showCalendar)}
            style={{ 
                backgroundColor: showCalendar ? '#6c757d' : '#17a2b8', 
                color: 'white', 
                border: 'none', 
                padding: '6px 12px', 
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
            }}
        >
            📅 {showCalendar ? 'Fechar Agenda' : 'Ver Agenda / Bloqueio'}
        </button>
        
        <button onClick={() => onDelete(unit.id)} style={{ backgroundColor: '#dc3545', color: 'white', border:'none', padding:'6px 12px', borderRadius:'4px', cursor:'pointer', marginLeft: 'auto' }}>
          🗑️
        </button>
      </div>

      {/* --- ÁREA DO CALENDÁRIO (SÓ MOSTRA SE showCalendar === TRUE) --- */}
      {showCalendar && (
          <div style={{marginTop: '15px', borderTop:'1px dashed #ccc', paddingTop:'15px', display:'flex', flexDirection:'column', alignItems:'center'}}>
              <strong>Selecione datas para Bloquear (Manutenção) ou Desbloquear:</strong>
              <div style={{marginTop:'10px'}}>
                <UnitCalendar 
                    unitId={unit.id} 
                    reservations={unit.ItensReserva || []} 
                    token={token}
                    onUpdate={onUpdate} 
                />
              </div>
          </div>
      )}

      {/* --- ÁREA DE AVARIAS --- */}
      <div style={{ marginTop: '1rem', paddingTop: '10px', borderTop:'1px solid #eee' }}>
        <h5 style={{margin:'0 0 10px 0'}}>Checklist de Avarias:</h5>
        <div style={{display:'flex', gap:'15px', flexWrap:'wrap'}}>
            {tiposAvaria.map(avaria => (
            <label key={avaria.id} style={{cursor:'pointer', display:'flex', alignItems:'center', gap:'5px', background:'white', padding:'5px 10px', borderRadius:'4px', border:'1px solid #ddd'}}>
                <input
                    type="checkbox"
                    checked={checkedAvarias[avaria.id] || false}
                    onChange={() => handleAvariaCheck(avaria.id)}
                />
                {avaria.descricao} <span style={{fontSize:'0.8em', color:'#666'}}>(R$ {avaria.preco})</span>
            </label>
            ))}
        </div>
      </div>

      <button onClick={handleSaveStatus} style={{ marginTop: '15px', width:'100%', padding:'10px', backgroundColor:'#28a745', color:'white', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'bold' }}>
        Salvar Alterações
      </button>
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
                onUpdate={fetchModalData}
              />
            )) : <p>Nenhuma unidade registrada.</p>}
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