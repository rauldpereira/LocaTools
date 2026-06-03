import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { parseDateStringAsLocal } from '../utils/dateUtils';
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale/pt-BR";
import "react-datepicker/dist/react-datepicker.css";
import { 
  Wrench, 
  Calendar, 
  Clock, 
  Package, 
  Loader2,
  CheckCircle2,
  Info,
  ChevronRight,
  ShieldCheck,
  Search
} from 'lucide-react';

registerLocale("pt-BR", ptBR);

const CustomDatePickerHeader = ({ date, changeYear, changeMonth, decreaseMonth, increaseMonth, prevMonthButtonDisabled, nextMonthButtonDisabled }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const years = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 5 + i);
  return (
    <div style={{ margin: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <button type="button" onClick={decreaseMonth} disabled={prevMonthButtonDisabled} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><ChevronRight size={18} style={{ transform: "rotate(180deg)" }} /></button>
      <div style={{ position: "relative" }}>
        <div onClick={() => setIsOpen(!isOpen)} style={{ fontWeight: 800, fontSize: "0.95rem", color: "#1e293b", textTransform: "capitalize", cursor: "pointer", padding: "6px 12px", borderRadius: "8px", backgroundColor: isOpen ? "#f1f5f9" : "transparent" }}>{date.toLocaleString("pt-BR", { month: "long", year: "numeric" })}</div>
        {isOpen && (
          <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 100, display: "flex", gap: "10px", padding: "15px", width: "260px", marginTop: "5px" }}>
            <div style={{ display: "flex", flexDirection: "column", height: "180px", overflowY: "auto", flex: 1, gap: "4px" }}>{months.map((m, i) => (<button key={m} type="button" onClick={() => { changeMonth(i); setIsOpen(false); }} style={{ padding: "8px", border: "none", background: date.getMonth() === i ? "#2563eb" : "transparent", color: date.getMonth() === i ? "#fff" : "#475569", cursor: "pointer", borderRadius: "6px", fontSize: "0.85rem" }}>{m}</button>))}</div>
            <div style={{ display: "flex", flexDirection: "column", height: "180px", overflowY: "auto", flex: 1, gap: "4px" }}>{years.map((y) => (<button key={y} type="button" onClick={() => { changeYear(y); setIsOpen(false); }} style={{ padding: "8px", border: "none", background: date.getFullYear() === y ? "#2563eb" : "transparent", color: date.getFullYear() === y ? "#fff" : "#475569", cursor: "pointer", borderRadius: "6px", fontSize: "0.85rem" }}>{y}</button>))}</div>
          </div>
        )}
      </div>
      <button type="button" onClick={increaseMonth} disabled={nextMonthButtonDisabled} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><ChevronRight size={18} /></button>
    </div>
  );
};

interface MaintenanceItem {
  id: number;
  data_inicio: string;
  data_fim: string;
  observacao?: string;
  Unidade: {
    id: number;
    codigo_serial: string;
    Equipamento: {
      nome: string;
      url_imagem: string;
    };
  };
}

const MaintenanceDashboard: React.FC = () => {
  const { token } = useAuth();
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [searchReason, setSearchReason] = useState("");
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const fetchMaintenance = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/units/maintenances/dashboard`, config);
        setItems(data);
      } catch (error) {
        console.error("Erro ao carregar manutenções", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMaintenance();
  }, [token]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const filteredItems = items.filter((item) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const equipName = (item.Unidade?.Equipamento?.nome || "").toLowerCase();
      const equipId = (item.Unidade?.id || "").toString();
      if (!equipName.includes(term) && !equipId.includes(term)) return false;
    }

    if (searchReason) {
      const reason = searchReason.toLowerCase();
      const itemReason = (item.observacao || "manutenção preventiva padrão").toLowerCase();
      if (!itemReason.includes(reason)) return false;
    }

    if (filterStartDate || filterEndDate) {
      const oStartStr = item.data_inicio.substring(0, 10);
      const oEndStr = item.data_fim.substring(0, 10);
      if (filterStartDate && oEndStr < filterStartDate.toLocaleDateString('en-CA')) return false;
      if (filterEndDate && oStartStr > filterEndDate.toLocaleDateString('en-CA')) return false;
    }

    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortKey) return 0;
    
    let valA: any = a[sortKey as keyof MaintenanceItem];
    let valB: any = b[sortKey as keyof MaintenanceItem];

    if (sortKey === 'nome') {
      valA = (a.Unidade?.Equipamento?.nome || "").toLowerCase();
      valB = (b.Unidade?.Equipamento?.nome || "").toLowerCase();
    } else if (sortKey === 'dataFim') {
      valA = new Date(a.data_fim).getTime();
      valB = new Date(b.data_fim).getTime();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const getStatusBadge = (inicio: string) => {
    const now = new Date();
    const startDate = new Date(inicio);
    
    if (startDate <= now) {
        return (
            <span style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                backgroundColor: '#fffbeb', color: '#92400e', 
                padding: '4px 10px', borderRadius: '20px', 
                fontSize: '0.75rem', fontWeight: '800', textTransform: "uppercase",
                border: "1px solid #fef3c7"
            }}>
                <Wrench size={12} /> Em Andamento
            </span>
        );
    } else {
        return (
            <span style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                backgroundColor: '#eff6ff', color: '#1e40af', 
                padding: '4px 10px', borderRadius: '20px', 
                fontSize: '0.75rem', fontWeight: '800', textTransform: "uppercase",
                border: "1px solid #bfdbfe"
            }}>
                <Calendar size={12} /> Agendado
            </span>
        );
    }
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "60px", color: "#64748b" }}>
        <Loader2 size={40} className="spin-animation" style={{ margin: "0 auto 15px", color: "#2563eb" }} />
        <p style={{ fontWeight: "bold" }}>Sincronizando painel operacional...</p>
    </div>
  );

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", gap: "15px", marginBottom: "30px", padding: "20px", backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", alignItems: "flex-end", flexWrap: "wrap" }}>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 200px" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase" }}>Equipamento</label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0 10px", backgroundColor: "#f8fafc", height: "42px", boxSizing: "border-box" }}>
            <Search size={16} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Nome ou ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: "none", background: "none", outline: "none", width: "100%", fontSize: "0.9rem", color: "#334155" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 200px" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase" }}>Motivo da Manutenção</label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0 10px", backgroundColor: "#f8fafc", height: "42px", boxSizing: "border-box" }}>
            <Search size={16} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Buscar motivo..." 
              value={searchReason}
              onChange={(e) => setSearchReason(e.target.value)}
              style={{ border: "none", background: "none", outline: "none", width: "100%", fontSize: "0.9rem", color: "#334155" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase" }}>Data Início</label>
          <DatePicker selected={filterStartDate} onChange={(d: Date | null) => setFilterStartDate(d)} dateFormat="dd/MM/yyyy" locale="pt-BR" placeholderText="dd/mm/aaaa" todayButton="Hoje" className="custom-datepicker" renderCustomHeader={(props) => <CustomDatePickerHeader {...props} />} />
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase" }}>Data Fim</label>
          <DatePicker selected={filterEndDate} onChange={(d: Date | null) => setFilterEndDate(d)} dateFormat="dd/MM/yyyy" locale="pt-BR" placeholderText="dd/mm/aaaa" todayButton="Hoje" className="custom-datepicker" renderCustomHeader={(props) => <CustomDatePickerHeader {...props} />} />
        </div>
        
        {(searchTerm || searchReason || filterStartDate || filterEndDate) && (
          <button onClick={() => { setSearchTerm(""); setSearchReason(""); setFilterStartDate(null); setFilterEndDate(null); }} style={{ padding: "0 20px", backgroundColor: "#f1f5f9", border: "none", borderRadius: "8px", color: "#ef4444", fontWeight: "bold", cursor: "pointer", height: "42px" }}>
            Limpar
          </button>
        )}
      </div>

      {sortedItems.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", backgroundColor: "#ecfdf5", borderRadius: "16px", border: "2px dashed #10b981", color: "#047857" }}>
            <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: "15px" }} />
            <h3 style={{ margin: 0, fontSize: "1.2rem" }}>Nenhuma manutenção encontrada</h3>
            <p style={{ margin: "5px 0 0 0", opacity: 0.8 }}>Tente ajustar os filtros acima.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'left', borderBottom: "2px solid #e2e8f0" }}>
                  <th onClick={() => handleSort('nome')} style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Package size={14}/> Equipamento {sortKey === 'nome' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</div></th>
                  <th style={thStyle}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><ShieldCheck size={14}/> Patrimônio</div></th>
                  <th onClick={() => handleSort('dataFim')} style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Clock size={14}/> Período {sortKey === 'dataFim' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</div></th>
                  <th style={thStyle}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Info size={14}/> Motivo</div></th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => {
                   let imgUrl = '';
                   const equipamentoNome = item.Unidade?.Equipamento?.nome || 'Equipamento não encontrado';
                   const urlImagem = item.Unidade?.Equipamento?.url_imagem;
                   
                   if (urlImagem) {
                       try {
                          const parsed = JSON.parse(urlImagem);
                          imgUrl = Array.isArray(parsed) ? parsed[0] : parsed;
                       } catch {
                          imgUrl = urlImagem;
                       }
                   }
                   
                   const fullImgUrl = imgUrl ? (imgUrl.startsWith('http') ? imgUrl : `${import.meta.env.VITE_API_URL}${imgUrl}`) : '';

                   return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: "background 0.2s" }} className="table-row-hover">
                      <td style={tdStyle}>
                          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                              <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", border: "1px solid #f1f5f9" }}>
                                {fullImgUrl ? <img src={fullImgUrl} alt="" style={{ width: "100%", height: "100%", objectFit:'cover' }} /> : <div style={{ width: "100%", height: "100%", backgroundColor: "#e2e8f0" }}></div>}
                              </div>
                              <strong style={{ color: "#1e293b" }}>{equipamentoNome}</strong>
                          </div>
                      </td>
                      <td style={tdStyle}>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontWeight:'800', color:'#475569' }}>#{item.Unidade?.id || 'N/A'}</span>
                              <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "600" }}>{item.Unidade?.codigo_serial || 'S/N Não Inf.'}</span>
                          </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#475569", fontWeight: "600" }}>
                            {parseDateStringAsLocal(item.data_inicio).toLocaleDateString()}
                            <ChevronRight size={12} color="#cbd5e1" />
                            {parseDateStringAsLocal(item.data_fim).toLocaleDateString()}
                        </div>
                      </td>
                      
                      <td style={{ ...tdStyle, maxWidth: '250px' }}>
                          <span style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: "1.4" }}>
                            {item.observacao || 'Manutenção Preventiva Padrão'}
                          </span>
                      </td>

                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {getStatusBadge(item.data_inicio)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        .table-row-hover:hover { background-color: #f8fafc !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin-animation { animation: spin 1s linear infinite; }
        .custom-datepicker { padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; outline: none; width: 140px; font-size: 0.9rem; color: #475569; height: 42px; box-sizing: border-box; }
        .custom-datepicker:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1); }
        .react-datepicker-wrapper { width: auto; }
        .react-datepicker { font-family: "Inter", sans-serif !important; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); }
        .react-datepicker__header { background-color: #fff; border-bottom: 1px solid #f1f5f9; padding-top: 15px; border-top-left-radius: 12px; border-top-right-radius: 12px; }
        .react-datepicker__day--selected { background-color: #2563eb !important; color: #fff !important; border-radius: 8px; }
        .react-datepicker__today-button { background-color: #fff; border-top: 1px solid #f1f5f9; color: #2563eb; font-weight: bold; padding: 10px; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; }
      `}</style>
    </div>
  );
};

const thStyle: React.CSSProperties = { padding: '16px', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle: React.CSSProperties = { padding: '16px', verticalAlign: 'middle' };

export default MaintenanceDashboard;