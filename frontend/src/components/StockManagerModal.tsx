import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import UnitCalendar from './Admin/UnitCalendar';

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
  codigo_serial: string | null;
  status: 'disponivel' | 'manutencao' | 'alugado';
  avarias_atuais: number[] | null;
  ItensReserva?: any[];
}

interface StockModalProps {
  equipmentId: number | null;
  equipmentName?: string;
  isOpen: boolean;
  onClose: () => void;
}

const UnitItem: React.FC<{
  unit: Unit,
  tiposAvaria: TipoAvaria[],
  token: string | null,
  onDelete: (id: number) => void,
  onUpdate: () => void
}> = ({ unit, tiposAvaria, token, onDelete, onUpdate }) => {

  const [status, setStatus] = useState(unit.status);
  const [showCalendar, setShowCalendar] = useState(false);
  const [checkedAvarias, setCheckedAvarias] = useState<{ [key: number]: boolean }>(() => {
    const initialState: { [key: number]: boolean } = {};
    (unit.avarias_atuais || []).forEach(id => initialState[id] = true);
    return initialState;
  });

  const [isEditingSerial, setIsEditingSerial] = useState(false);
  const [serial, setSerial] = useState(unit.codigo_serial || '');

  useEffect(() => {
    let realStatus: 'disponivel' | 'manutencao' | 'alugado' = 'disponivel';

    if (unit.ItensReserva && unit.ItensReserva.length > 0) {
      const today = new Date();
      const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0).getTime();

      const activeRes = unit.ItensReserva.find(res => {
        const cleanStart = String(res.data_inicio).substring(0, 10);
        const cleanEnd = String(res.data_fim).substring(0, 10);
        const rStart = new Date(cleanStart + "T12:00:00").getTime();
        const rEnd = new Date(cleanEnd + "T12:00:00").getTime();
        return todayTime >= rStart && todayTime <= rEnd;
      });

      if (activeRes) {
        if (activeRes.status === 'manutencao') {
          realStatus = 'manutencao';
        } else if (activeRes.OrdemDeServico) {
          const statusIntocaveis = ['pendente', 'aprovada', 'aguardando_assinatura', 'em_andamento', 'aguardando_pagamento_final'];
          if (statusIntocaveis.includes(activeRes.OrdemDeServico.status)) {
            realStatus = 'alugado';
          }
        }
      }
    }
    setStatus(realStatus);
  }, [unit]);

  const handleAvariaCheck = (id: number) => {
    setCheckedAvarias(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = async () => {
    const avariasIDs = Object.keys(checkedAvarias)
      .filter(k => checkedAvarias[parseInt(k)])
      .map(Number);

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.put(`http://localhost:3001/api/units/${unit.id}/details`, {
        status,
        avarias_atuais: avariasIDs,
        codigo_serial: serial
      }, config);

      alert('Unidade salva com sucesso!');
      setIsEditingSerial(false);
      onUpdate();
    } catch (error) {
      alert('Erro ao salvar.');
    }
  };

  return (
    <div style={{ border: '1px solid #e0e0e0', backgroundColor: '#fff', borderRadius: '8px', marginBottom: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

      {/* BARRA SUPERIOR DO ITEM */}
      <div style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', background: '#f8f9fa', borderBottom: '1px solid #eee' }}>

        {/* ID e S/N */}
        <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 'bold', color: '#555' }}>#{unit.id}</span>

          {isEditingSerial ? (
            <input
              value={serial}
              onChange={e => setSerial(e.target.value)}
              style={{ padding: '4px', width: '100px' }}
              autoFocus
            />
          ) : (
            <span
              onClick={() => setIsEditingSerial(true)}
              title="Clique para editar S/N"
              style={{ cursor: 'pointer', borderBottom: '1px dashed #999', fontWeight: 'bold', color: serial ? '#333' : '#dc3545' }}
            >
              {serial || 'Sem S/N'}
            </span>
          )}
        </div>

        {/* STATUS SELECT */}
        <select
          value={status}
          onChange={e => setStatus(e.target.value as any)}
          disabled={status === 'alugado' || status === 'manutencao'}
          style={{
            padding: '6px',
            borderRadius: '4px',
            borderColor: '#ccc',
            backgroundColor: (status === 'alugado' || status === 'manutencao') ? '#e9ecef' : '#fff',
            cursor: (status === 'alugado' || status === 'manutencao') ? 'not-allowed' : 'pointer'
          }}
        >
          <option value="disponivel">🟢 Disponível</option>
          <option value="manutencao">🟠 Manutenção</option>
          <option value="alugado">🔴 Alugado</option>
        </select>

        {/* BOTÃO AZUL: VER AGENDA */}
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          style={{
            backgroundColor: showCalendar ? '#5a6268' : '#007bff',
            color: 'white', border: 'none', padding: '7px 12px',
            borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold',
            display: 'flex', alignItems: 'center', gap: '5px'
          }}
        >
          📅 {showCalendar ? 'Fechar Agenda' : 'Agenda / Bloqueio'}
        </button>

        {/* BOTÃO EXCLUIR */}
        <button onClick={() => onDelete(unit.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }} title="Excluir Unidade">
          🗑️
        </button>
      </div>

      {/* ÁREA DO CONTEÚDO (CALENDÁRIO + AVARIAS) */}
      <div style={{ padding: '15px' }}>

        {/* CALENDÁRIO */}
        {showCalendar && (
          <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px dashed #eee', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <strong style={{ marginBottom: '10px', color: '#007bff' }}>Selecione datas para Bloquear (Manutenção):</strong>
            <UnitCalendar
              unitId={unit.id}
              reservations={unit.ItensReserva || []}
              token={token}
              onUpdate={onUpdate}
            />
          </div>
        )}

        {/* CHECKLIST DE AVARIAS */}
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px', color: '#666' }}>Avarias / Defeitos:</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {tiposAvaria.map(avaria => (
              <label key={avaria.id} style={{ display: 'flex', color: "#000", alignItems: 'center', gap: '5px', background: '#f1f1f1', padding: '5px 10px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={checkedAvarias[avaria.id] || false}
                  onChange={() => handleAvariaCheck(avaria.id)}
                />
                {avaria.descricao}
              </label>
            ))}
          </div>
        </div>

        <button onClick={handleSave} style={{ marginTop: '15px', width: '100%', padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Salvar Alterações da Unidade
        </button>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL DO MODAL ---
const StockManagerModal: React.FC<StockModalProps> = ({ equipmentId, isOpen, onClose }) => {
  const { token } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [equipment, setEquipment] = useState<EquipamentoComAvarias | null>(null);
  const [loading, setLoading] = useState(true);
  const [newSerial, setNewSerial] = useState('');

  const fetchData = useCallback(async () => {
    if (!equipmentId || !isOpen) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const equipRes = await axios.get(`http://localhost:3001/api/equipment/${equipmentId}`, config);
      setEquipment(equipRes.data);

      const unitsRes = await axios.get(`http://localhost:3001/api/equipment/${equipmentId}/units`, config);
      setUnits(unitsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [equipmentId, isOpen, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddUnit = async () => {
    if (!newSerial.trim()) return alert('Digite o S/N!');
    try {
      await axios.post('http://localhost:3001/api/units', {
        id_equipamento: equipmentId,
        codigo_serial: newSerial
      }, { headers: { Authorization: `Bearer ${token}` } });
      setNewSerial('');
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao criar');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Excluir unidade?')) return;
    try {
      await axios.delete(`http://localhost:3001/api/units/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (e) {
      alert('Erro ao excluir');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', width: '850px', maxWidth: '95%', maxHeight: '90vh', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column' }}>

        {/* CABEÇALHO DO MODAL */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0, color: "#000" }}>Gerenciar: {equipment?.nome || 'Equipamento'}</h2>
          <button onClick={onClose} style={{ border: 'none', color: "#000", background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
        </div>

        <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '6px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#0d47a1', fontWeight: 'bold' }}>Total: {units.length} un.</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              placeholder="Digite o S/N *"
              value={newSerial}
              onChange={e => setNewSerial(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #90caf9', width: '200px' }}
            />
            <button onClick={handleAddUnit} style={{ background: '#007bff', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              + Adicionar
            </button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
          {loading ? <p>Carregando...</p> : units.map(unit => (
            <UnitItem
              key={unit.id}
              unit={unit}
              tiposAvaria={equipment?.TipoAvarias || []}
              token={token}
              onDelete={handleDelete}
              onUpdate={fetchData}
            />
          ))}
          {units.length === 0 && !loading && <p style={{ textAlign: 'center', color: '#999' }}>Nenhuma unidade cadastrada.</p>}
        </div>

      </div>
    </div>
  );
};

export default StockManagerModal;