import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { parseDateStringAsLocal } from "../../utils/dateUtils";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale/pt-BR";
import "react-datepicker/dist/react-datepicker.css";
import CustomDropdown from "../CustomDropdown";
import { 
  Wrench, 
  UserCircle, 
  CalendarDays, 
  FileText,
  AlertCircle,
  Search,
  ChevronRight
} from "lucide-react";

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

const EquipamentosEmLocacao: React.FC = () => {
  const [rentedItems, setRentedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);
  
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const fetchRentedEquipment = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/reservations/all`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const activeOrders = data.filter((order: any) => order.status === "em_andamento");

        const items: any[] = [];
        activeOrders.forEach((order: any) => {
          if (order.ItemReservas) {
            order.ItemReservas.forEach((item: any) => {
              items.push({
                ...item,
                orderId: order.id,
                clienteNome: order.Usuario?.nome || "Cliente não identificado",
                dataInicio: order.data_inicio,
                dataFim: order.data_fim
              });
            });
          }
        });

        items.sort((a, b) => new Date(a.dataFim).getTime() - new Date(b.dataFim).getTime());
        setRentedItems(items);
      } catch (error) {
        console.error("Erro ao buscar equipamentos alugados:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRentedEquipment();
  }, [token]);

  const handlePerPageChange = (newVal: number) => {
    setPerPage(newVal);
    setPage(1);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const filteredItems = rentedItems.filter((item) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const equipName = (item.Unidade?.Equipamento?.nome || "").toLowerCase();
      const equipId = (item.Unidade?.id || "").toString();
      const clientName = (item.clienteNome || "").toLowerCase();
      const orderId = (item.orderId || "").toString();
      if (!equipName.includes(term) && !equipId.includes(term) && !clientName.includes(term) && !orderId.includes(term)) return false;
    }

    if (filterStartDate || filterEndDate) {
      const oStartStr = item.dataInicio.substring(0, 10);
      const oEndStr = item.dataFim.substring(0, 10);
      if (filterStartDate && oEndStr < filterStartDate.toLocaleDateString('en-CA')) return false;
      if (filterEndDate && oStartStr > filterEndDate.toLocaleDateString('en-CA')) return false;
    }

    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortKey) return 0;
    
    let valA = a[sortKey];
    let valB = b[sortKey];

    if (sortKey === 'nome') {
      valA = (a.Unidade?.Equipamento?.nome || "").toLowerCase();
      valB = (b.Unidade?.Equipamento?.nome || "").toLowerCase();
    } else if (sortKey === 'clienteNome') {
      valA = (a.clienteNome || "").toLowerCase();
      valB = (b.clienteNome || "").toLowerCase();
    } else if (sortKey === 'dataFim') {
      valA = new Date(a.dataFim).getTime();
      valB = new Date(b.dataFim).getTime();
    } else if (sortKey === 'orderId') {
      valA = Number(a.orderId);
      valB = Number(b.orderId);
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedItems.length / perPage);
  const currentData = sortedItems.slice((page - 1) * perPage, page * perPage);

  if (loading) return <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Carregando inventário de locação...</div>;

  if (rentedItems.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
        <Wrench size={32} color="#94a3b8" style={{ marginBottom: "10px" }} />
        <p style={{ color: "#64748b", margin: 0, fontWeight: "600" }}>Nenhum equipamento em locação no momento.</p>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", gap: "15px", marginBottom: "30px", padding: "20px", backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", alignItems: "flex-end", flexWrap: "wrap" }}>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 250px" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase" }}>Busca</label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0 10px", backgroundColor: "#f8fafc", height: "42px", boxSizing: "border-box" }}>
            <Search size={16} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Por cliente, equipamento ou pedido..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
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
        
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "160px" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase" }}>Exibir</label>
          <CustomDropdown className="filter-dropdown" value={perPage.toString()} onChange={(val) => handlePerPageChange(Number(val))} options={[{value: "10", label: "10 linhas"}, {value: "25", label: "25 linhas"}, {value: "50", label: "50 linhas"}, {value: "100", label: "100 linhas"}]} />
        </div>

        {(searchTerm || filterStartDate || filterEndDate || perPage !== 10) && (
          <button onClick={() => { setSearchTerm(""); setFilterStartDate(null); setFilterEndDate(null); setPerPage(10); setPage(1); }} style={{ padding: "0 20px", backgroundColor: "#f1f5f9", border: "none", borderRadius: "8px", color: "#ef4444", fontWeight: "bold", cursor: "pointer", height: "42px" }}>
            Limpar
          </button>
        )}
      </div>

      {filteredItems.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
          <p style={{ color: "#64748b", margin: 0, fontWeight: "600" }}>Nenhum resultado encontrado para a busca.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <th onClick={() => handleSort('nome')} style={{ padding: "16px", color: "#64748b", fontWeight: "700", textAlign: "left", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em", cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><Wrench size={14}/> Equipamento {sortKey === 'nome' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</div>
                </th>
                <th onClick={() => handleSort('clienteNome')} style={{ padding: "16px", color: "#64748b", fontWeight: "700", textAlign: "left", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em", cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><UserCircle size={14}/> Cliente {sortKey === 'clienteNome' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</div>
                </th>
                <th onClick={() => handleSort('dataFim')} style={{ padding: "16px", color: "#64748b", fontWeight: "700", textAlign: "center", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em", cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}><CalendarDays size={14}/> Período {sortKey === 'dataFim' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</div>
                </th>
                <th onClick={() => handleSort('orderId')} style={{ padding: "16px", color: "#64748b", fontWeight: "700", textAlign: "center", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em", cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}><FileText size={14}/> Pedido {sortKey === 'orderId' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((item, index) => {
                const dataSaida = parseDateStringAsLocal(item.dataInicio).toLocaleDateString("pt-BR");
                const dataVolta = parseDateStringAsLocal(item.dataFim).toLocaleDateString("pt-BR");
                const dataFimReal = parseDateStringAsLocal(item.dataFim);
                dataFimReal.setHours(0,0,0,0);
                
                const hoje = new Date();
                hoje.setHours(0,0,0,0);
                
                const isAtrasado = dataFimReal.getTime() < hoje.getTime();

                return (
                  <tr key={`${item.id}-${index}`} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.2s", backgroundColor: isAtrasado ? "#fef2f2" : "#fff" }} className="table-row-hover">
                    <td style={{ padding: "16px", fontWeight: "600", color: "#1e293b" }}>
                      {item.Unidade?.Equipamento?.nome || "Equipamento Indefinido"} 
                      <span style={{ color: "#94a3b8", fontSize: "0.8rem", marginLeft: "8px", fontWeight: "normal" }}>(Ref: #{item.Unidade?.id})</span>
                    </td>
                    <td style={{ padding: "16px", color: "#475569", fontWeight: "500" }}>
                      {item.clienteNome}
                    </td>
                    <td style={{ padding: "16px", textAlign: "center", fontSize: "0.85rem", color: "#64748b" }}>
                      <span>{dataSaida}</span>
                      <span style={{ margin: "0 8px", color: "#cbd5e1" }}>•</span>
                      <strong style={{ color: isAtrasado ? "#ef4444" : "#10b981", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        {dataVolta}
                        {isAtrasado && <AlertCircle size={14} color="#ef4444" />}
                      </strong>
                    </td>
                    <td style={{ padding: "16px", textAlign: "center" }}>
                      <Link to={`/admin/vistoria/${item.orderId}?tipo=devolucao`}>
                        <button style={{
                          backgroundColor: "#2563eb", color: "white", padding: "8px 16px",
                          border: "none", borderRadius: "6px", cursor: "pointer",
                          fontWeight: "bold", fontSize: "0.85rem", transition: "background 0.2s"
                        }}>
                          Acessar #{item.orderId}
                        </button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PAGINAÇÃO EM ESTILO ABAS/NUMEROS */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "25px" }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setPage(n)}
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                border: "1px solid",
                borderColor: page === n ? "#2563eb" : "#e2e8f0",
                backgroundColor: page === n ? "#2563eb" : "#fff",
                color: page === n ? "#fff" : "#64748b",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      <style>{`
        .table-row-hover:hover { background-color: #f8fafc !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        
        /* DATEPICKER STYLES */
        .custom-datepicker { padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; outline: none; width: 140px; font-size: 0.9rem; color: #475569; height: 42px; box-sizing: border-box; }
        .custom-datepicker:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1); }
        .react-datepicker-wrapper { width: auto; }
        .react-datepicker { font-family: "Inter", sans-serif !important; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); }
        .react-datepicker__header { background-color: #fff; border-bottom: 1px solid #f1f5f9; padding-top: 15px; border-top-left-radius: 12px; border-top-right-radius: 12px; }
        .react-datepicker__day--selected { background-color: #2563eb !important; color: #fff !important; border-radius: 8px; }
        .react-datepicker__today-button { background-color: #fff; border-top: 1px solid #f1f5f9; color: #2563eb; font-weight: bold; padding: 10px; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; }

        /* DROPDOWN STYLES */
        .filter-dropdown .custom-dropdown-header { height: 42px !important; min-height: 42px !important; max-height: 42px !important; padding: 0 12px !important; border-radius: 8px !important; font-size: 0.9rem !important; box-sizing: border-box !important; }
      `}</style>
    </div>
  );
};

export default EquipamentosEmLocacao;