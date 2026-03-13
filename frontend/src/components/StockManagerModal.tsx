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
  status: 'disponivel' | 'manutencao' | 'alugado' | 'inativo';
  avarias_atuais: number[] | null;
  ItensReserva?: any[];
  total_manutencoes?: number;
  ultima_observacao_vistoria?: string | null;
  observacao?: string | null;
}

interface StockModalProps {
  equipmentId: number | null;
  equipmentName?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Conflict {
  reserva: { id: number; pedido_id: number; data_inicio: string; data_fim: string };
  alternativas: { id: number; codigo_serial: string }[];
}

const TransplantModal: React.FC<{
  conflicts: Conflict[];
  onClose: () => void;
  onConfirm: (reallocations: { id_reserva: number; id_nova_unidade: number }[]) => void;
  loading: boolean;
}> = ({ conflicts, onClose, onConfirm, loading }) => {
  const [selections, setSelections] = useState<{ [key: number]: number }>({});

  const handleSelect = (reservaId: number, unidadeId: number) => {
    setSelections(prev => ({ ...prev, [reservaId]: unidadeId }));
  };

  const handleConfirm = () => {
    const reallocations = conflicts.map(c => ({
      id_reserva: c.reserva.id,
      id_nova_unidade: selections[c.reserva.id]
    }));

    const missing = reallocations.some(r => !r.id_nova_unidade);
    if (missing) return alert("Por favor, selecione uma máquina substituta para TODAS as reservas antes de confirmar.");

    onConfirm(reallocations);
  };

  const formatDate = (dateString: string) => {
    const [y, m, d] = dateString.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
      <div style={{ background: 'white', width: '700px', maxWidth: '95%', borderRadius: '8px', padding: '25px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
        
        <div style={{ borderBottom: '2px solid #dc3545', paddingBottom: '10px', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#c62828', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Gestão de Crise: Conflito de Agenda!
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#666' }}>
            Esta máquina possui aluguéis agendados e não pode sair de operação até você remanejar os clientes abaixo:
          </p>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
          {conflicts.map((conflict) => (
            <div key={conflict.reserva.id} style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '6px', padding: '15px', marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '1.1rem', color: '#333' }}>Pedido #{conflict.reserva.pedido_id}</strong>
                <span style={{ background: '#e3f2fd', color: '#0d47a1', padding: '4px 8px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                  {formatDate(conflict.reserva.data_inicio)} até {formatDate(conflict.reserva.data_fim)}
                </span>
              </div>
              
              {conflict.alternativas.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#555' }}>Selecione a máquina substituta livre nestes dias:</label>
                  <select 
                    value={selections[conflict.reserva.id] || ''} 
                    onChange={e => handleSelect(conflict.reserva.id, Number(e.target.value))}
                    style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', width: '100%', fontSize: '1rem' }}
                  >
                    <option value="" disabled>-- Escolha uma unidade --</option>
                    {conflict.alternativas.map(alt => (
                      <option key={alt.id} value={alt.id}>Unidade #{alt.id} (S/N: {alt.codigo_serial || 'Sem S/N'})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '4px', border: '1px solid #ffcdd2', fontWeight: 'bold' }}>
                  Não há nenhuma outra máquina deste modelo disponível nestas datas. Você precisará contatar o cliente para resolver manualmente esta situação antes de conseguir colocar a máquina em manutenção ou inativa.
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
          
          <button onClick={onClose} disabled={loading} style={{ color: '#333', padding: '10px 20px', border: '1px solid #ccc', background: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            Cancelar Operação
          </button>

          <button 
            onClick={handleConfirm} 
            disabled={loading || conflicts.some(c => c.alternativas.length === 0)} 
            style={{ 
              padding: '10px 20px', 
              border: 'none', 
              background: (loading || conflicts.some(c => c.alternativas.length === 0)) ? '#6c757d' : '#28a745', 
              color: 'white', 
              borderRadius: '6px',
              cursor: (loading || conflicts.some(c => c.alternativas.length === 0)) ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold', 
              boxShadow: (loading || conflicts.some(c => c.alternativas.length === 0)) ? 'none' : '0 2px 4px rgba(40,167,69,0.2)' 
            }}
          >
            {loading ? 'Trocando...' : 'Confirmar Troca e Salvar'}
          </button>
        </div>

      </div>
    </div>
  );
};

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

  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [showTransplantModal, setShowTransplantModal] = useState(false);
  const [isTransplanting, setIsTransplanting] = useState(false);

  // Agora ele só roda quando os dados REAIS mudam, e respeita a hierarquia.
  useEffect(() => {
    let calculatedStatus: 'disponivel' | 'manutencao' | 'alugado' | 'inativo' = unit.status;

    // Se o banco diz que é inativo, respeita o inativo.
    if (unit.status !== 'inativo') {
        if (unit.ItensReserva && unit.ItensReserva.length > 0) {
          const today = new Date();
          const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0).getTime();

          const activeRes = unit.ItensReserva.find(res => {
            const cleanStart = String(res.data_inicio).substring(0, 10);
            const cleanEnd = String(res.data_fim).substring(0, 10);
            const rStart = new Date(cleanStart + "T12:00:00").getTime();
            const rEnd = new Date(cleanEnd + "T12:00:00").getTime();
            
            if (res.status !== 'manutencao' && res.OrdemDeServico) {
                const statusAtivos = ['pendente', 'aprovada', 'aguardando_assinatura', 'em_andamento', 'aguardando_pagamento_final'];
                if (!statusAtivos.includes(res.OrdemDeServico.status)) return false; 
            }

            return todayTime >= rStart && todayTime <= rEnd;
          });

          if (activeRes) {
            calculatedStatus = activeRes.status === 'manutencao' ? 'manutencao' : 'alugado';
          } else {
             calculatedStatus = 'disponivel';
          }
        } else {
             calculatedStatus = 'disponivel';
        }
    }
    setStatus(calculatedStatus);
  }, [unit]);

  const handleAvariaCheck = (id: number) => {
    setCheckedAvarias(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // Se o usuário mudou o select para "manutencao" ou "inativo", checa se tem conflito no futuro
      if ((status === 'manutencao' || status === 'inativo') && unit.status !== status) {
        const confRes = await axios.get(`http://localhost:3001/api/units/${unit.id}/conflicts`, config);
        
        if (confRes.data.conflicts && confRes.data.conflicts.length > 0) {
          setConflicts(confRes.data.conflicts);
          setShowTransplantModal(true);
          return;
        }
      }

      await saveUnitData(config);
      
    } catch (error) {
      alert('Erro ao checar conflitos ou salvar.');
    }
  };

  const saveUnitData = async (config: any) => {
    const avariasIDs = Object.keys(checkedAvarias)
      .filter(k => checkedAvarias[parseInt(k)])
      .map(Number);

    try {
        await axios.put(`http://localhost:3001/api/units/${unit.id}`, {
          status: status, // Manda o status que tá no select!
          avarias_atuais: avariasIDs,
          codigo_serial: serial
        }, config);

        alert('Unidade salva com sucesso!');
        setIsEditingSerial(false);
        onUpdate(); // Chama a atualização da tela
    } catch (error: any) {
        alert(error.response?.data?.error || 'Erro ao salvar a unidade.');
    }
  };

  const executeTransplantAndSave = async (reallocations: { id_reserva: number; id_nova_unidade: number }[]) => {
    setIsTransplanting(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      await axios.post(`http://localhost:3001/api/units/reallocate`, { reallocations }, config);

      await saveUnitData(config);
      
      setShowTransplantModal(false);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao Trocar as máquinas.');
    } finally {
      setIsTransplanting(false);
    }
  };

  return (
    <div style={{
      border: '1px solid #e0e0e0',
      backgroundColor: '#fff',
      borderRadius: '8px',
      marginBottom: '15px',
      boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
      overflow: 'hidden'
    }}>

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

          {/* QTD. manutenção */}
          {unit.total_manutencoes !== undefined && unit.total_manutencoes > 0 && (
            <span style={{
              fontSize: '0.75rem',
              backgroundColor: unit.total_manutencoes >= 3 ? '#ffcccc' : '#fff3cd',
              color: unit.total_manutencoes >= 3 ? '#c62828' : '#856404',
              padding: '4px 10px',
              borderRadius: '12px',
              fontWeight: 'bold',
              border: `1px solid ${unit.total_manutencoes >= 3 ? '#ef9a9a' : '#ffeeba'}`,
              marginLeft: '5px'
            }}>
              🔧 {unit.total_manutencoes} Manutenç{unit.total_manutencoes === 1 ? 'ão' : 'ões'}
            </span>
          )}
        </div>

        {/* STATUS SELECT */}
        <select
          value={status}
          onChange={e => setStatus(e.target.value as any)}
          disabled={unit.status === 'alugado'} // Só bloqueia se o banco disser que tá alugado (proteção real)
          style={{
            padding: '6px',
            borderRadius: '4px',
            borderColor: '#ccc',
            backgroundColor: (unit.status === 'alugado') ? '#e9ecef' : '#fff',
            cursor: (unit.status === 'alugado') ? 'not-allowed' : 'pointer'
          }}
        >
          <option value="disponivel">🟢 Disponível</option>
          <option value="manutencao">🟠 Manutenção</option>
          <option value="alugado">🔴 Alugado</option>
          <option value="inativo">⚫ Inativo / Vendido</option>
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
          {showCalendar ? 'Fechar Agenda' : 'Agenda / Bloqueio'}
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
              token={token}
              onUpdate={onUpdate}
              
              reservations={(unit.ItensReserva || []).filter(res => {
                  if (res.status === 'manutencao') return true; 
                  
                  if (res.OrdemDeServico) {
                      const statusAtivos = ['pendente', 'aprovada', 'aguardando_assinatura', 'em_andamento', 'aguardando_pagamento_final'];
                      return statusAtivos.includes(res.OrdemDeServico.status);
                  }
                  return false;
              })}
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

          {unit.ultima_observacao_vistoria && (
            <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#fff3cd', borderLeft: '4px solid #ffc107', borderRadius: '4px', fontSize: '0.85rem', color: '#856404' }}>
              <strong>💬 Anotação da última Vistoria:</strong><br/>
              <span style={{ fontStyle: 'italic' }}>"{unit.ultima_observacao_vistoria}"</span>
            </div>
          )}
          {unit.status === 'inativo' && unit.observacao && (
            <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f8d7da', borderLeft: '5px solid #dc3545', borderRadius: '6px', fontSize: '0.9rem', color: '#721c24', boxShadow: '0 2px 4px rgba(220,53,69,0.1)' }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                🔴 Motivo da Baixa (Inativação):
              </strong>
              <div style={{ marginTop: '5px', fontWeight: '500' }}>
                {unit.observacao}
              </div>
            </div>
          )}

        </div>

        <button onClick={handleSave} style={{ marginTop: '15px', width: '100%', padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Salvar Alterações da Unidade
        </button>

        {showTransplantModal && (
          <TransplantModal 
            conflicts={conflicts} 
            onClose={() => setShowTransplantModal(false)} 
            onConfirm={executeTransplantAndSave} 
            loading={isTransplanting}
          />
        )}

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    if (!window.confirm('Tem certeza que deseja excluir esta unidade?')) return;
    
    try {
      setErrorMessage(null);
      await axios.delete(`http://localhost:3001/api/units/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (e: any) {
      setErrorMessage(e.response?.data?.error || 'Erro ao excluir a unidade.');
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
        
        {errorMessage && (
          <div style={{
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            padding: '12px 20px', 
            borderRadius: '6px', 
            marginBottom: '15px', 
            border: '1px solid #f5c6cb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div>
              <strong style={{ fontSize: '1.1rem', display: 'block', marginBottom: '4px' }}>Ação Bloqueada!</strong>
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} style={{ background: 'none', border: 'none', color: '#721c24', fontSize: '1.5rem', cursor: 'pointer', padding: '0 5px' }}>
              &times;
            </button>
          </div>
        )}

        <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '6px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#0d47a1', fontWeight: 'bold' }}>Total: {units.length} un.</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              placeholder="Digite o S/N*"
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