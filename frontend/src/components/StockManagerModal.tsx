import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import UnitCalendar from './Admin/UnitCalendar';
import BalcaoCheckoutModal from './Admin/BalcaoCheckoutModal';
import { 
  X, 
  Trash2, 
  Calendar, 
  AlertTriangle, 
  Save, 
  Package, 
  Settings, 
  Info,
  Tag,
  Loader2,
  Plus,
  Store,
  ChevronRight,
  ShieldAlert,
  ArrowRightLeft,
  Wrench
} from 'lucide-react';

interface TipoAvaria {
  id: number;
  descricao: string;
  preco: string;
}

interface EquipamentoComAvarias {
  id: number;
  nome: string;
  preco_diaria?: string | number;
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
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, width: '700px', border: "2px solid #ef4444" }} onClick={e => e.stopPropagation()}>
        
        <div style={{ ...headerStyle, backgroundColor: "#fef2f2", borderBottom: "1px solid #fee2e2" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ backgroundColor: "#fee2e2", padding: "10px", borderRadius: "10px" }}>
                <ShieldAlert size={28} color="#ef4444" />
            </div>
            <div>
                <h2 style={{ margin: 0, color: '#991b1b', fontSize: "1.25rem" }}>Gestão de Crise: Conflito de Agenda</h2>
                <p style={{ margin: 0, color: '#b91c1c', fontSize: "0.85rem", fontWeight: "600" }}>Ação necessária para prosseguir com a alteração.</p>
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}><X size={24} /></button>
        </div>

        <div style={{ padding: "25px", overflowY: "auto", maxHeight: "60vh" }}>
          <p style={{ marginBottom: "20px", color: "#475569", fontSize: "0.95rem" }}>
            Esta máquina possui aluguéis agendados. Você deve transferir essas reservas para outras unidades livres:
          </p>

          {conflicts.map((conflict) => (
            <div key={conflict.reserva.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '15px', boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ backgroundColor: "#f1f5f9", padding: "4px 10px", borderRadius: "6px", fontWeight: "800", color: "#475569", fontSize: "0.85rem" }}>Pedido #{conflict.reserva.pedido_id}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#2563eb", fontWeight: "700", fontSize: "0.9rem" }}>
                  <Calendar size={14} /> {formatDate(conflict.reserva.data_inicio)} <ChevronRight size={12} /> {formatDate(conflict.reserva.data_fim)}
                </div>
              </div>
              
              {conflict.alternativas.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#64748b', textTransform: "uppercase" }}>Selecionar Substituta:</label>
                  <select 
                    value={selections[conflict.reserva.id] || ''} 
                    onChange={e => handleSelect(conflict.reserva.id, Number(e.target.value))}
                    style={inputStyle}
                  >
                    <option value="" disabled>-- Selecione uma máquina livre --</option>
                    {conflict.alternativas.map(alt => (
                      <option key={alt.id} value={alt.id}>Máquina #{alt.id} (S/N: {alt.codigo_serial || 'Não inf.'})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '15px', borderRadius: '10px', border: '1px solid #fecaca', fontSize: "0.9rem", display: "flex", gap: "10px" }}>
                  <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                  <span><strong>Indisponibilidade Total:</strong> Não há outras máquinas deste modelo livres nestas datas. Entre em contato com o cliente para cancelar ou reagendar antes de inativar esta unidade.</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: "20px 25px", borderTop: "1px solid #f1f5f9", display: "flex", gap: "12px" }}>
          <button onClick={onClose} disabled={loading} style={btnSecondaryStyle}>Cancelar</button>
          <button 
            onClick={handleConfirm} 
            disabled={loading || conflicts.some(c => c.alternativas.length === 0)} 
            style={{ ...btnPrimaryStyle, backgroundColor: "#ef4444" }}
          >
            {loading ? <Loader2 size={18} className="spin-animation" /> : <ArrowRightLeft size={18} />}
            {loading ? 'Processando...' : 'Transferir Reservas e Salvar'}
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
  onUpdate: () => void,
  onOpenBalcao: (unitId: number) => void
}> = ({ unit, tiposAvaria, token, onDelete, onUpdate, onOpenBalcao }) => {

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
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let calculatedStatus: 'disponivel' | 'manutencao' | 'alugado' | 'inativo' = unit.status;

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
    setIsSaving(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };

      if ((status === 'manutencao' || status === 'inativo') && unit.status !== status) {
        const confRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/units/${unit.id}/conflicts`, config);
        
        if (confRes.data.conflicts && confRes.data.conflicts.length > 0) {
          setConflicts(confRes.data.conflicts);
          setShowTransplantModal(true);
          setIsSaving(false);
          return;
        }
      }

      await saveUnitData(config);
      
    } catch (error) {
      alert('Erro ao checar conflitos ou salvar.');
      setIsSaving(false);
    }
  };

  const saveUnitData = async (config: any) => {
    const avariasIDs = Object.keys(checkedAvarias)
      .filter(k => checkedAvarias[parseInt(k)])
      .map(Number);

    try {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/units/${unit.id}`, {
          status: status,
          avarias_atuais: avariasIDs,
          codigo_serial: serial
        }, config);

        setIsEditingSerial(false);
        onUpdate();
    } catch (error: any) {
        alert(error.response?.data?.error || 'Erro ao salvar a unidade.');
    } finally {
        setIsSaving(false);
    }
  };

  const executeTransplantAndSave = async (reallocations: { id_reserva: number; id_nova_unidade: number }[]) => {
    setIsTransplanting(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${import.meta.env.VITE_API_URL}/api/units/reallocate`, { reallocations }, config);
      await saveUnitData(config);
      setShowTransplantModal(false);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao Trocar as máquinas.');
    } finally {
      setIsTransplanting(false);
    }
  };

  const getStatusColor = (s: string) => {
    switch(s) {
      case 'disponivel': return '#10b981';
      case 'alugado': return '#3b82f6';
      case 'manutencao': return '#f59e0b';
      case 'inativo': return '#64748b';
      default: return '#64748b';
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', padding: '20px', marginBottom: '20px', borderRadius: '12px', border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>

      {/* BARRA SUPERIOR DO ITEM */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', marginBottom: "20px" }}>

        {/* ID e S/N */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ backgroundColor: "#f1f5f9", padding: "6px 12px", borderRadius: "8px", fontWeight: "800", color: "#475569", fontSize: "0.85rem" }}>
                #{unit.id}
            </div>
            <div 
                style={{ 
                    backgroundColor: serial ? "#eff6ff" : "#fff1f2", 
                    padding: "6px 12px", 
                    borderRadius: "8px", 
                    fontWeight: "700", 
                    color: serial ? "#2563eb" : "#ef4444", 
                    fontSize: "0.85rem", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "5px",
                    cursor: "pointer",
                    border: `1px solid ${serial ? "#bfdbfe" : "#fecaca"}`
                }}
                onClick={() => setIsEditingSerial(true)}
            >
                <Tag size={14} /> 
                {isEditingSerial ? (
                    <input
                      value={serial}
                      onChange={e => setSerial(e.target.value)}
                      onBlur={() => setIsEditingSerial(false)}
                      style={{ border: "none", background: "none", outline: "none", color: "inherit", fontWeight: "inherit", width: "80px" }}
                      autoFocus
                    />
                ) : (serial || 'Sem S/N')}
            </div>

            {/* QTD. manutenção */}
            {unit.total_manutencoes !== undefined && unit.total_manutencoes > 0 && (
                <div style={{ backgroundColor: unit.total_manutencoes >= 3 ? "#fff1f2" : "#fffbeb", padding: "6px 12px", borderRadius: "8px", fontWeight: "700", color: unit.total_manutencoes >= 3 ? "#ef4444" : "#92400e", fontSize: "0.75rem", border: `1px solid ${unit.total_manutencoes >= 3 ? "#fecaca" : "#fef3c7"}` }}>
                    <Wrench size={12} style={{ verticalAlign: "middle", marginRight: "5px" }} /> {unit.total_manutencoes} manutenções
                </div>
            )}
        </div>

        {/* STATUS SELECT */}
        <div style={{ position: "relative", flexGrow: 1, minWidth: "150px" }}>
          <select 
            value={status} 
            onChange={e => setStatus(e.target.value as any)} 
            disabled={unit.status === 'alugado'}
            style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: `2px solid ${getStatusColor(status)}20`,
                backgroundColor: `${getStatusColor(status)}10`,
                color: getStatusColor(status),
                fontWeight: "bold",
                outline: "none",
                cursor: unit.status === 'alugado' ? "not-allowed" : "pointer"
            }}
          >
            <option value="disponivel">✓ Disponível</option>
            <option value="manutencao">⚠ Em Manutenção</option>
            <option value="alugado">⟳ Alugado (Em uso)</option>
            <option value="inativo">⊘ Inativo / Vendido</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
            <button
                onClick={() => onOpenBalcao(unit.id)}
                disabled={status === 'alugado' || status === 'inativo'} 
                title="Venda de Balcão"
                style={{
                    backgroundColor: (status === 'alugado' || status === 'inativo') ? '#f1f5f9' : '#10b981',
                    color: (status === 'alugado' || status === 'inativo') ? '#94a3b8' : '#fff', 
                    border: 'none', padding: '10px 15px',
                    borderRadius: '8px', fontWeight: 'bold',
                    cursor: (status === 'alugado' || status === 'inativo') ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px', fontSize: "0.85rem"
                }}
            >
                <Store size={16} /> Balcão
            </button>

            <button
                onClick={() => setShowCalendar(!showCalendar)}
                style={{
                    backgroundColor: showCalendar ? '#1e293b' : '#fff',
                    color: showCalendar ? '#fff' : '#64748b', 
                    border: '1px solid #e2e8f0', padding: '10px 15px',
                    borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', gap: '8px', fontSize: "0.85rem", transition: "0.2s"
                }}
            >
                <Calendar size={16} /> {showCalendar ? 'Fechar' : 'Agenda'}
            </button>

            <button onClick={() => onDelete(unit.id)} style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px", cursor: "pointer", color: "#ef4444" }}>
                <Trash2 size={16} />
            </button>
        </div>
      </div>

      {/* AGENDA / BLOQUEIO */}
      {showCalendar && (
        <div style={{ marginBottom: '20px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "15px", color: "#1e40af" }}>
                <Info size={18} />
                <strong style={{ fontSize: "0.9rem" }}>Bloqueio de Datas (Manutenção)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
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
        </div>
      )}

      {/* CHECKLIST DE AVARIAS */}
      <div style={{ marginTop: '15px', paddingTop: '15px', borderTop:'1px solid #f1f5f9' }}>
        <h5 style={{ margin: '0 0 12px 0', color: "#475569", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px" }}>
            <AlertTriangle size={14} /> Checklist de Danos e Avarias
        </h5>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
            {tiposAvaria.map(avaria => (
              <label key={avaria.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: checkedAvarias[avaria.id] ? '#fef2f2' : '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${checkedAvarias[avaria.id] ? '#fecaca' : '#e2e8f0'}`, cursor: 'pointer', transition: "0.2s" }}>
                <input
                  type="checkbox"
                  checked={checkedAvarias[avaria.id] || false}
                  onChange={() => handleAvariaCheck(avaria.id)}
                  style={{ width: "16px", height: "16px" }}
                />
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: checkedAvarias[avaria.id] ? "#ef4444" : "#475569" }}>{avaria.descricao}</span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>R$ {avaria.preco}</span>
                </div>
              </label>
            ))}
        </div>

        {unit.ultima_observacao_vistoria && (
          <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#fffbeb', borderLeft: '4px solid #f59e0b', borderRadius: '8px', fontSize: '0.85rem', color: '#92400e' }}>
            <strong>💬 Última Vistoria:</strong> <i>"{unit.ultima_observacao_vistoria}"</i>
          </div>
        )}
        {unit.status === 'inativo' && unit.observacao && (
          <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', borderRadius: '8px', fontSize: '0.9rem', color: '#991b1b' }}>
            <strong>🔴 Motivo da Baixa:</strong> {unit.observacao}
          </div>
        )}
      </div>

      <button onClick={handleSave} disabled={isSaving} style={{ marginTop: '20px', width:'100%', padding:'14px', backgroundColor:'#2563eb', color:'white', border:'none', borderRadius:'12px', cursor: isSaving ? "not-allowed" : 'pointer', fontWeight:'800', display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "0.2s", boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)" }}>
        {isSaving ? <Loader2 size={18} className="spin-animation" /> : <Save size={18} />}
        {isSaving ? "Salvando..." : "Salvar Alterações da Unidade"}
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
  const [isBalcaoModalOpen, setIsBalcaoModalOpen] = useState(false);
  const [selectedUnidadeIdBalcao, setSelectedUnidadeIdBalcao] = useState<number | null>(null);
  const [unitToDelete, setUnitToDelete] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!equipmentId || !isOpen) return;
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const equipRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/equipment/${equipmentId}`, config);
      setEquipment(equipRes.data);
      const unitsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/equipment/${equipmentId}/units`, config);
      setUnits(unitsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [equipmentId, isOpen, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddUnit = async () => {
    if (!newSerial.trim()) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/units`, {
        id_equipamento: equipmentId,
        codigo_serial: newSerial
      }, { headers: { Authorization: `Bearer ${token}` } });
      setNewSerial('');
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao criar');
    }
  };

  const requestDelete = (id: number) => {
    setUnitToDelete(id);
  };

  const confirmDelete = async () => {
    if (!unitToDelete) return;
    try {
      setErrorMessage(null);
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/units/${unitToDelete}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
      setUnitToDelete(null);
    } catch (e: any) {
      setErrorMessage(e.response?.data?.error || 'Erro ao excluir a unidade.');
      setUnitToDelete(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalStyle, width: '900px' }} onClick={e => e.stopPropagation()}>

        {/* CABEÇALHO DO MODAL */}
        <div style={headerStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                <div style={{ backgroundColor: "#eff6ff", padding: "12px", borderRadius: "12px" }}>
                    <Settings size={28} color="#2563eb" />
                </div>
                <div>
                    <h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.4rem", fontWeight: 800 }}>Gerenciar Inventário</h2>
                    <p style={{ margin: 0, color: "#64748b", fontWeight: "600" }}>{equipment?.nome || 'Carregando...'}</p>
                </div>
            </div>
            <button onClick={onClose} style={closeBtnStyle}><X size={24} /></button>
        </div>
        
        {errorMessage && (
          <div style={{ margin: "0 25px 20px 25px", padding: '15px 20px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <AlertTriangle size={20} color="#ef4444" />
              <span style={{ color: "#991b1b", fontWeight: "600" }}>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={20} /></button>
          </div>
        )}

        <div style={{ margin: "0 25px 20px 25px", background: '#f8fafc', padding: '15px 20px', borderRadius: '12px', border: "1px solid #e2e8f0", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Package size={18} color="#64748b" />
              <span style={{ color: '#475569', fontWeight: '800', fontSize: "0.9rem" }}>TOTAL: {units.length} UNIDADES</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ position: "relative" }}>
                <Tag size={16} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                    placeholder="Novo S/N (Serial)"
                    value={newSerial}
                    onChange={e => setNewSerial(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: "35px", width: "180px", height: "42px" }}
                />
            </div>
            <button onClick={handleAddUnit} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '0 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: "flex", alignItems: "center", gap: "8px", height: "42px" }}>
              <Plus size={18} /> Adicionar Unidade
            </button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: "0 25px 25px 25px", backgroundColor: "#f8fafc" }}>
          {loading ? (
             <div style={{ textAlign: "center", padding: "60px" }}>
                <Loader2 size={40} className="spin-animation" color="#2563eb" style={{ margin: "0 auto 15px" }} />
                <p style={{ color: "#64748b", fontWeight: "bold" }}>Carregando unidades...</p>
             </div>
          ) : (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
                {units.map(unit => (
                    <UnitItem
                    key={unit.id}
                    unit={unit}
                    tiposAvaria={equipment?.TipoAvarias || []}
                    token={token}
                    onDelete={requestDelete}
                    onUpdate={fetchData}
                    onOpenBalcao={(id) => {
                        setSelectedUnidadeIdBalcao(id);
                        setIsBalcaoModalOpen(true);
                    }}
                    />
                ))}
                {units.length === 0 && <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>Nenhuma unidade cadastrada.</div>}
            </div>
          )}
        </div>

      </div>

      {/* MODAL DE CHECKOUT DO BALCÃO */}
      {isBalcaoModalOpen && selectedUnidadeIdBalcao && equipment && (
        (() => {
          const selectedUnit = units.find(u => u.id === selectedUnidadeIdBalcao);
          return (
            <BalcaoCheckoutModal
              unidadeId={selectedUnidadeIdBalcao}
              equipamentoNome={equipment.nome}
              precoDiaria={equipment.preco_diaria || 0}
              reservations={selectedUnit ? (selectedUnit.ItensReserva || []).filter(res => {
                  if (res.status === 'manutencao') return true; 
                  if (res.OrdemDeServico) {
                      const statusAtivos = ['pendente', 'aprovada', 'aguardando_assinatura', 'em_andamento', 'aguardando_pagamento_final'];
                      return statusAtivos.includes(res.OrdemDeServico.status);
                  }
                  return false;
              }) : []}
              onClose={() => { setIsBalcaoModalOpen(false); setSelectedUnidadeIdBalcao(null); }}
              onSuccess={() => { setIsBalcaoModalOpen(false); setSelectedUnidadeIdBalcao(null); fetchData(); }}
            />
          );
        })()
      )}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {unitToDelete !== null && (
        <div style={{ ...overlayStyle, zIndex: 1100 }} onClick={() => setUnitToDelete(null)}>
          <div style={{ ...modalStyle, width: '450px', border: "2px solid #ef4444" }} onClick={e => e.stopPropagation()}>
            <div style={{ ...headerStyle, backgroundColor: "#fef2f2", borderBottom: "1px solid #fee2e2" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ backgroundColor: "#fee2e2", padding: "10px", borderRadius: "10px" }}>
                    <Trash2 size={28} color="#ef4444" />
                </div>
                <div>
                    <h2 style={{ margin: 0, color: '#991b1b', fontSize: "1.25rem" }}>Confirmar Exclusão</h2>
                </div>
              </div>
              <button onClick={() => setUnitToDelete(null)} style={closeBtnStyle}><X size={24} /></button>
            </div>
            <div style={{ padding: "25px" }}>
              <p style={{ margin: 0, color: "#475569", fontSize: "0.95rem", lineHeight: "1.5" }}>
                Tem certeza que deseja excluir permanentemente a <strong>Unidade #{unitToDelete}</strong> do inventário?
                <br /><br />
                <span style={{ color: "#ef4444", fontWeight: "600" }}>Atenção:</span> Esta ação não pode ser desfeita. Só é possível excluir máquinas que nunca foram alugadas.
              </p>
            </div>
            <div style={{ padding: "20px 25px", borderTop: "1px solid #f1f5f9", display: "flex", gap: "12px" }}>
              <button onClick={() => setUnitToDelete(null)} style={btnSecondaryStyle}>Cancelar</button>
              <button onClick={confirmDelete} style={{ ...btnPrimaryStyle, backgroundColor: "#ef4444" }}>
                <Trash2 size={18} />
                Excluir Unidade
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .spin-animation { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

// --- ESTILOS COMPARTILHADOS ---
const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, animation: "fadeIn 0.2s ease" };
const modalStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: '20px', width: '850px', maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: "hidden", boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' };
const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: "25px", borderBottom: "1px solid #f1f5f9" };
const closeBtnStyle: React.CSSProperties = { background: '#f1f5f9', color: "#64748b", border: 'none', borderRadius: "50%", padding: "8px", cursor: 'pointer', display: "flex", alignItems: "center", transition: "0.2s" };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: "none", fontSize: "0.95rem", color: "#334155", transition: "0.2s" };
const btnPrimaryStyle: React.CSSProperties = { padding: "12px 20px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "0.2s" };
const btnSecondaryStyle: React.CSSProperties = { padding: "12px 20px", backgroundColor: "#f1f5f9", color: "#475569", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" };

export default StockManagerModal;