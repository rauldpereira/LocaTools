import { useToast } from '../../context/ToastContext';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import UnitCalendar from './UnitCalendar';
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
  Loader2
} from 'lucide-react';

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
  codigo_serial?: string | null;
  status: 'disponivel' | 'manutencao' | 'alugado';
  avarias_atuais: number[] | null;
  ItensReserva?: any[]; 
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
  const toast = useToast();
  const [status, setStatus] = useState(unit.status);
  const [showCalendar, setShowCalendar] = useState(false);
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    const avariasAtuaisIDs = Object.keys(checkedAvarias)
      .filter(id => checkedAvarias[parseInt(id)])
      .map(id => parseInt(id));

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        status: status,
        avarias_atuais: avariasAtuaisIDs
      };
      await axios.put(`${import.meta.env.VITE_API_URL}/api/units/${unit.id}/details`, payload, config);
      onUpdate();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Falha ao salvar as alterações da unidade.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (s: string) => {
    switch(s) {
      case 'disponivel': return '#10b981';
      case 'alugado': return '#3b82f6';
      case 'manutencao': return '#ef4444';
      default: return '#64748b';
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', padding: '20px', marginBottom: '20px', borderRadius: '12px', border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
      
      {/* HEADER DA UNIDADE */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ backgroundColor: "#f1f5f9", padding: "6px 12px", borderRadius: "8px", fontWeight: "800", color: "#475569", fontSize: "0.85rem" }}>
                #{unit.id}
            </div>
            {unit.codigo_serial && (
                <div style={{ backgroundColor: "#eff6ff", padding: "6px 12px", borderRadius: "8px", fontWeight: "700", color: "#2563eb", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "5px" }}>
                    <Tag size={14} /> {unit.codigo_serial}
                </div>
            )}
        </div>
        
        <div style={{ position: "relative", flexGrow: 1, minWidth: "150px" }}>
          <select 
            value={status} 
            onChange={e => setStatus(e.target.value as any)} 
            disabled={status === 'alugado'}
            style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: `2px solid ${getStatusColor(status)}20`,
                backgroundColor: `${getStatusColor(status)}10`,
                color: getStatusColor(status),
                fontWeight: "bold",
                outline: "none",
                cursor: status === 'alugado' ? "not-allowed" : "pointer"
            }}
          >
            <option value="disponivel">✓ Disponível</option>
            <option value="manutencao">⚠ Em Manutenção</option>
            <option value="alugado">⟳ Alugado (Em uso)</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
            <button 
                onClick={() => setShowCalendar(!showCalendar)}
                title="Agenda da Unidade"
                style={{ 
                    backgroundColor: showCalendar ? '#1e293b' : '#fff', 
                    color: showCalendar ? '#fff' : '#64748b', 
                    border: '1px solid #e2e8f0', 
                    padding: '8px 12px', 
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: "0.85rem",
                    fontWeight: "bold",
                    transition: "0.2s"
                }}
            >
                <Calendar size={16} /> {showCalendar ? 'Fechar Agenda' : 'Ver Agenda'}
            </button>
            
            <button 
                onClick={() => onDelete(unit.id)} 
                title="Excluir Unidade"
                style={{ backgroundColor: '#fef2f2', color: '#ef4444', border:'1px solid #fecaca', padding:'8px', borderRadius:'8px', cursor:'pointer', display: "flex", alignItems: "center" }}
            >
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
                    reservations={unit.ItensReserva || []} 
                    token={token}
                    onUpdate={onUpdate} 
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
                <label key={avaria.id} style={{
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', 
                    background: checkedAvarias[avaria.id] ? '#fef2f2' : '#f8fafc', 
                    padding: '8px 12px', borderRadius: '8px', border: `1px solid ${checkedAvarias[avaria.id] ? '#fecaca' : '#e2e8f0'}`,
                    transition: "0.2s"
                }}>
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
      </div>

      <button 
        onClick={handleSaveStatus} 
        disabled={saving}
        style={{ 
            marginTop: '20px', width:'100%', padding:'12px', 
            backgroundColor:'#2563eb', color:'white', border:'none', 
            borderRadius:'10px', cursor: saving ? "not-allowed" : 'pointer', 
            fontWeight:'bold', display: "flex", alignItems: "center", 
            justifyContent: "center", gap: "8px", transition: "0.2s" 
        }}
      >
        {saving ? <Loader2 size={18} className="spin-animation" /> : <Save size={18} />}
        {saving ? "Salvando..." : "Salvar Alterações da Unidade"}
      </button>
    </div>
  );
};

const UnitsModal: React.FC<UnitsModalProps> = ({ equipmentId, isOpen, onClose }) => {
  const toast = useToast();
  const { token } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [equipment, setEquipment] = useState<EquipamentoComAvarias | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchModalData = async () => {
    if (!isOpen) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const equipRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/equipment/${equipmentId}`, config);
      setEquipment(equipRes.data);

      const unitsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/equipment/${equipmentId}/units`, config);
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
    if (!window.confirm(`Deseja realmente excluir permanentemente a unidade #${unitId}?`)) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/units/${unitId}`, config);
      fetchModalData();
    } catch (error) {
      console.error('Erro ao excluir unidade:', error);
      toast.error('Não foi possível excluir esta unidade.');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
        
        {/* HEADER FIXO */}
        <div style={modalHeaderStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                <div style={{ backgroundColor: "#eff6ff", padding: "12px", borderRadius: "12px" }}>
                    <Settings size={28} color="#2563eb" />
                </div>
                <div>
                    <h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.4rem", fontWeight: 800 }}>Gestão de Inventário</h2>
                    <p style={{ margin: 0, color: "#64748b", fontWeight: "600" }}>{equipment?.nome}</p>
                </div>
            </div>
            <button onClick={onClose} style={closeButtonStyle}><X size={24} /></button>
        </div>

        {/* CORPO SCROLLABLE */}
        <div style={modalBodyStyle}>
            {loading ? (
                <div style={{ textAlign: "center", padding: "50px" }}>
                    <Loader2 size={40} className="spin-animation" color="#2563eb" />
                    <p style={{ color: "#64748b", marginTop: "15px", fontWeight: "bold" }}>Carregando unidades...</p>
                </div>
            ) : (
                <div style={{ animation: "fadeIn 0.3s ease" }}>
                    {units.length > 0 ? (
                        units.map(unit => (
                            <UnitItem
                                key={unit.id}
                                unit={unit}
                                tiposAvaria={equipment?.TipoAvarias || []} 
                                token={token}
                                onDelete={handleDeleteUnit}
                                onUpdate={fetchModalData}
                            />
                        ))
                    ) : (
                        <div style={{ textAlign: "center", padding: "60px 20px", backgroundColor: "#f8fafc", borderRadius: "16px", border: "2px dashed #e2e8f0" }}>
                            <Package size={48} color="#cbd5e1" style={{ marginBottom: "15px" }} />
                            <h3 style={{ color: "#64748b", margin: 0 }}>Nenhuma unidade registrada</h3>
                            <p style={{ color: "#94a3b8", marginTop: "5px" }}>Adicione novas unidades para este equipamento na tela de cadastro.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .spin-animation { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const modalOverlayStyle: React.CSSProperties = { position: 'fixed', zIndex: 3000, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', animation: "fadeIn 0.2s ease" };
const modalContentStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '20px', width: '90%', maxWidth: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' };
const modalHeaderStyle: React.CSSProperties = { padding: '25px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 };
const modalBodyStyle: React.CSSProperties = { padding: '30px', overflowY: 'auto', flexGrow: 1, backgroundColor: "#f8fafc" };
const closeButtonStyle: React.CSSProperties = { background: '#f1f5f9', color: "#64748b", border: 'none', borderRadius: "50%", padding: "8px", cursor: 'pointer', display: "flex", alignItems: "center", transition: "0.2s" };

export default UnitsModal;