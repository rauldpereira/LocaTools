import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Link } from "react-router-dom";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale/pt-BR";
import "react-datepicker/dist/react-datepicker.css";
import { parseDateStringAsLocal } from "../utils/dateUtils";

import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  ClipboardList, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  Wallet, 
  ShoppingCart, 
  Download, 
  Search, 
  HelpCircle, 
  X, 
  History, 
  Filter,
  Loader2,
  TrendingDown,
  ArrowUpRight,
  ChevronRight,
  AlertOctagon,
  CheckCircle,
  Clock,
  SearchIcon
} from "lucide-react";

import MaintenanceHistoryModal from "../components/Admin/MaintenanceHistoryModal";

registerLocale("pt-BR", ptBR);

interface KpiData {
  faturamentoTotal: number;
  lucroLiquido: number;
  totalPedidos: number;
  ticketMedio: number;
  totalPrejuizoAberto: number;
  totalPrejuizoRecuperado: number;
  totalAbandonos: number;
  valorPerdidoAbandono: number;
  taxaAbandono: number;
}
interface InventoryDataSummary {
  total: number;
  alugadas: number;
  disponiveis: number;
  manutencao: number;
}
interface TopEquipamento {
  nome: string;
  receita: number;
  alugueis: number;
}
interface ExtratoItem {
  id: string | number;
  data: string;
  descricao: string;
  valor: number;
  tipo: "RECEITA" | "DESPESA";
}
interface TopAbandonado {
  nome: string;
  quantidade: number;
}
interface ReportDataFinancial {
  kpis: KpiData;
  inventory: InventoryDataSummary;
  topEquipamentos: TopEquipamento[];
  topAbandonados: TopAbandonado[];
  history: { receitas: any[]; prejuizos: any[] };
  extrato: ExtratoItem[];
}
interface OcorrenciaBO {
  id: number;
  data: string;
  tipo: string;
  equipamento: string;
  unidadeId: number;
  cliente: string;
  contato: string;
  valor: string;
  resolvido: boolean;
  obs: string;
  pedidoId?: number;
}
interface InventarioItem {
  id: number;
  codigo_serial?: string | null;
  equipamento: string;
  status: string;
  observacao: string;
}
interface ReportDataOperational {
  ocorrencias: OcorrenciaBO[];
  inventario: InventarioItem[];
}

const COLORS_PIE = ["#10b981", "#3b82f6", "#ef4444"];
const toISODateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const CustomDatePickerHeader = ({
  date,
  changeYear,
  changeMonth,
  decreaseMonth,
  increaseMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
}: any) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", backgroundColor: "#fff", borderBottom: "1px solid #f1f5f9" }}>
    <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "5px", borderRadius: "6px" }} onMouseOver={e => e.currentTarget.style.backgroundColor = "#f1f5f9"} onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}>
      <ChevronRight size={18} style={{ transform: "rotate(180deg)" }} />
    </button>
    <div style={{ display: "flex", gap: "8px" }}>
      <select value={date.getMonth()} onChange={({ target: { value } }) => changeMonth(parseInt(value))} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.9rem", color: "#334155", backgroundColor: "#fff", cursor: "pointer", fontWeight: "600" }}>
        {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((option, index) => (
          <option key={option} value={index}>{option}</option>
        ))}
      </select>
      <select value={date.getFullYear()} onChange={({ target: { value } }) => changeYear(parseInt(value))} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.9rem", color: "#334155", backgroundColor: "#fff", cursor: "pointer", fontWeight: "600" }}>
        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
    </div>
    <button onClick={increaseMonth} disabled={nextMonthButtonDisabled} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "5px", borderRadius: "6px" }} onMouseOver={e => e.currentTarget.style.backgroundColor = "#f1f5f9"} onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}>
      <ChevronRight size={18} />
    </button>
  </div>
);

const AdminReportsPage: React.FC = () => {
  const { token } = useAuth();
  
  // Persistência de Abas
  const [activeTab, setActiveTab] = useState<"financeiro" | "operacional" | "inventario">(() => 
    (sessionStorage.getItem("adminReportTab") as any) || "financeiro"
  );
  const [subTab, setSubTab] = useState(() => 
    sessionStorage.getItem("adminReportSubTab") || "dashboard"
  );

  const [loading, setLoading] = useState(false);
  const [financialData, setFinancialData] = useState<ReportDataFinancial | null>(null);
  const [operationalData, setOperationalData] = useState<ReportDataOperational | null>(null);
  const [showManual, setShowManual] = useState(false);

  // Filtros de Data
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toISODateString(d);
  });
  const [endDate, setEndDate] = useState(() => toISODateString(new Date()));
  const [ocorrenciaStart, setOcorrenciaStart] = useState("");
  const [ocorrenciaEnd, setOcorrenciaEnd] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc"; } | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedUnitForHistory, setSelectedUnitForHistory] = useState<any>(null);

  useEffect(() => {
    sessionStorage.setItem("adminReportTab", activeTab);
    sessionStorage.setItem("adminReportSubTab", subTab);
  }, [activeTab, subTab]);

  const fetchFinancial = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        params: { startDate, endDate },
      };
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/reports/financial`, config);
      setFinancialData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOperational = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/reports/operational`, config);
      setOperationalData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "financeiro") fetchFinancial();
    else fetchOperational();
    setSearchTerm("");
    setSortConfig(null);
  }, [activeTab, token]);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const processTableData = (data: any[], searchKeys: string[]) => {
    let processed = [...data];
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      processed = processed.filter((item) =>
        searchKeys.some((key) => String(item[key] || "").toLowerCase().includes(lowerTerm))
      );
    }
    if (sortConfig) {
      processed.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return processed;
  };

  const handleExportPDF = () => {
    if (!financialData || !financialData.extrato) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Extrato Financeiro - LocaTools", 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${new Date(startDate + 'T12:00:00').toLocaleDateString()} a ${new Date(endDate + 'T12:00:00').toLocaleDateString()}`, 14, 28);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 34);

    const tableRows = processTableData(financialData.extrato, ["descricao", "tipo"]).map((item) => [
      new Date(item.data).toLocaleDateString() + " " + new Date(item.data).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      item.descricao,
      item.tipo,
      item.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    ]);

    autoTable(doc, {
      head: [["Data", "Descrição", "Tipo", "Valor"]],
      body: tableRows,
      startY: 40,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save(`Extrato_${startDate}_${endDate}.pdf`);
  };

  // Render Helpers
  const renderFinancialDashboard = () => {
    if (!financialData) return null;
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        {/* Alerta de Frota */}
        {financialData.inventory.total > 0 && financialData.inventory.manutencao / financialData.inventory.total >= 0.5 && (
          <div style={{ backgroundColor: "#fff1f2", border: "1px solid #fecaca", borderLeft: "6px solid #ef4444", padding: "20px", borderRadius: "12px", marginBottom: "25px", display: "flex", alignItems: "center", gap: "20px" }}>
            <AlertOctagon size={40} color="#ef4444" />
            <div>
              <h3 style={{ margin: "0 0 5px 0", color: "#991b1b", fontSize: "1.2rem" }}>Atenção: Alta Taxa de Equipamentos em Manutenção</h3>
              <p style={{ margin: 0, color: "#7f1d1d", fontSize: "1rem" }}>
                <strong>{financialData.inventory.manutencao}</strong> (<strong>{((financialData.inventory.manutencao / financialData.inventory.total) * 100).toFixed(0)}% dos equipamentos estão em manutenção</strong>).
              </p>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" }}>
          <KpiCard title="Faturamento Bruto" value={financialData.kpis.faturamentoTotal} icon={<TrendingUp size={20} />} color="#10b981" />
          <KpiCard title="Prejuízo Acumulado" value={financialData.kpis.totalPrejuizoAberto} icon={<TrendingDown size={20} />} color="#ef4444" />
          <KpiCard title="Lucro Líquido" value={financialData.kpis.lucroLiquido} icon={<Wallet size={20} />} color="#3b82f6" isCurrency highlight />
          <KpiCard title="Abandonos" value={financialData.kpis.valorPerdidoAbandono} icon={<ShoppingCart size={20} />} color="#f59e0b" subText={`${financialData.kpis.taxaAbandono.toFixed(1)}% taxa`} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "25px" }}>
          <div style={cardStyle}>
            <div style={cardHeaderStyle}><TrendingUp size={20} color="#2563eb" /><h3>Evolução Mensal</h3></div>
            <div style={{ height: 300, width: "100%" }}>
              <ResponsiveContainer>
                <AreaChart data={getEvolutionData()}>
                  <defs>
                    <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorPre" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" />
                  <YAxis fontSize={12} stroke="#94a3b8" />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <ChartTooltip />
                  <Area type="monotone" dataKey="receita" stroke="#10b981" fill="url(#colorRec)" name="Receita" strokeWidth={2} />
                  <Area type="monotone" dataKey="prejuizo" stroke="#ef4444" fill="url(#colorPre)" name="Prejuízo" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={cardHeaderStyle}><PieChartIcon size={20} color="#2563eb" /><h3>Status dos Equipamentos</h3></div>
            <div style={{ height: 300, width: "100%", position: "relative" }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={getInventoryPieData()} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {getInventoryPieData().map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#1e293b" }}>{financialData.inventory.total}</div>
                <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: "700" }}>TOTAL</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getEvolutionData = () => {
    if (!financialData) return [];
    const map = new Map();
    financialData.history.receitas.forEach((r: any) => map.set(r.mes, { name: r.mes, receita: Number(r.total), prejuizo: 0 }));
    financialData.history.prejuizos.forEach((p: any) => {
      const cur = map.get(p.mes) || { name: p.mes, receita: 0, prejuizo: 0 };
      cur.prejuizo = Number(p.total);
      map.set(p.mes, cur);
    });
    return Array.from(map.values()).sort((a: any, b: any) => a.name.localeCompare(b.name));
  };

  const getInventoryPieData = () => {
    if (!financialData) return [];
    return [
      { name: "Disponíveis", value: financialData.inventory.disponiveis },
      { name: "Alugadas", value: financialData.inventory.alugadas },
      { name: "Manutenção", value: financialData.inventory.manutencao },
    ];
  };

  const openHistoryModal = (unit: any) => {
    setSelectedUnitForHistory(unit);
    setHistoryModalOpen(true);
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease", width: "100%" }}>
      {/* HEADER PRINCIPAL */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "30px" }}>
        <div>
          <h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.8rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "12px" }}>
            <BarChart3 size={32} color="#2563eb" /> Relatório
          </h2>
          <p style={{ color: "#64748b", marginTop: "5px" }}>Análise financeira, ocorrências operacionais e gestão de ativos.</p>
        </div>
        <button onClick={() => setShowManual(true)} style={helpBtnStyle} title="Manual do Usuário"><HelpCircle size={24} /></button>
      </div>

      {/* ABAS PRINCIPAIS */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "25px", borderBottom: "1px solid #e2e8f0", paddingBottom: "1px" }}>
        <TabButton active={activeTab === "financeiro"} onClick={() => { setActiveTab("financeiro"); setSubTab("dashboard"); }} icon={<Wallet size={18}/>} label="Financeiro" />
        <TabButton active={activeTab === "operacional"} onClick={() => { setActiveTab("operacional"); setSubTab("ocorrencias"); }} icon={<AlertTriangle size={18}/>} label="Ocorrências" />
        <TabButton active={activeTab === "inventario"} onClick={() => { setActiveTab("inventario"); setSubTab("lista"); }} icon={<Package size={18}/>} label="Inventário" />
      </div>

      {/* SUB-ABAS FINANCEIRO */}
      {activeTab === "financeiro" && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", flexWrap: "wrap", gap: "15px" }}>
          <div style={{ display: "flex", gap: "8px", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "10px" }}>
            <SubTabButton active={subTab === "dashboard"} onClick={() => setSubTab("dashboard")} label="Geral" />
            <SubTabButton active={subTab === "extrato"} onClick={() => setSubTab("extrato")} label="Extrato" />
            <SubTabButton active={subTab === "lucro"} onClick={() => setSubTab("lucro")} label="Ranking de Rentabilidade" />
            <SubTabButton active={subTab === "abandonos"} onClick={() => setSubTab("abandonos")} label="Abandonos" />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", backgroundColor: "#fff", padding: "8px 15px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            <Filter size={16} color="#64748b" />
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div style={{ width: "130px" }}>
                <DatePicker
                  selected={startDate ? parseDateStringAsLocal(startDate) : null}
                  onChange={(d: Date | null) => setStartDate(d ? toISODateString(d) : "")}
                  dateFormat="dd/MM/yyyy"
                  locale="pt-BR"
                  placeholderText="dd/mm/aaaa"
                  className="custom-datepicker"
                  renderCustomHeader={(props) => <CustomDatePickerHeader {...props} />}
                />
              </div>
              <ChevronRight size={14} color="#cbd5e1" />
              <div style={{ width: "130px" }}>
                <DatePicker
                  selected={endDate ? parseDateStringAsLocal(endDate) : null}
                  onChange={(d: Date | null) => setEndDate(d ? toISODateString(d) : "")}
                  dateFormat="dd/MM/yyyy"
                  locale="pt-BR"
                  placeholderText="dd/mm/aaaa"
                  className="custom-datepicker"
                  renderCustomHeader={(props) => <CustomDatePickerHeader {...props} />}
                />
              </div>
            </div>
            <button onClick={fetchFinancial} disabled={loading} style={refreshBtnStyle} title="Buscar Dados">
              {loading ? <Loader2 size={16} className="spin" /> : <SearchIcon size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* CONTEÚDO DINÂMICO */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "100px", color: "#64748b" }}><Loader2 size={40} className="spin" style={{ margin: "0 auto 20px" }} /><p>Processando relatórios...</p></div>
      ) : (
        <>
          {activeTab === "financeiro" && subTab === "dashboard" && renderFinancialDashboard()}
          
          {activeTab === "financeiro" && subTab === "extrato" && financialData && (
            <div style={{ ...cardStyle, animation: "fadeIn 0.3s ease" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                    <ClipboardList size={20} color="#2563eb" /> Extrato de Movimentações
                  </h3>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={searchBoxStyle}><Search size={16} color="#94a3b8" /><input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={cleanInputStyle} /></div>
                    <button onClick={handleExportPDF} style={pdfBtnStyle}><Download size={18} /> Exportar PDF</button>
                  </div>
               </div>
               <div style={tableWrapperStyle}>
                 <table style={tableStyle}>
                    <thead>
                      <tr style={tableHeaderRowStyle}>
                        <SortableTh label="Data" sortKey="data" currentSort={sortConfig} onSort={handleSort} />
                        <SortableTh label="Descrição" sortKey="descricao" currentSort={sortConfig} onSort={handleSort} />
                        <SortableTh label="Tipo" sortKey="tipo" currentSort={sortConfig} onSort={handleSort} />
                        <SortableTh label="Valor" sortKey="valor" currentSort={sortConfig} onSort={handleSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {processTableData(financialData.extrato, ["descricao", "tipo"]).map((item, idx) => (
                        <tr key={idx} style={tableRowStyle} className="table-row-hover">
                          <td style={tdStyle}>{new Date(item.data).toLocaleDateString()} <small style={{ color: "#94a3b8" }}>{new Date(item.data).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></td>
                          <td style={{ ...tdStyle, fontWeight: "600" }}>{item.descricao}</td>
                          <td style={tdStyle}><span style={badgeStyle(item.tipo === "RECEITA" ? "success" : "danger")}>{item.tipo}</span></td>
                          <td style={{ ...tdStyle, fontWeight: "800", color: item.tipo === "RECEITA" ? "#10b981" : "#ef4444" }}>{item.tipo === "DESPESA" ? "-" : "+"} {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === "financeiro" && subTab === "lucro" && financialData && (
            <div style={{ ...cardStyle, animation: "fadeIn 0.3s ease" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                    <TrendingUp size={20} color="#10b981" /> Ranking de Rentabilidade
                  </h3>
                  <div style={searchBoxStyle}><Search size={16} color="#94a3b8" /><input type="text" placeholder="Filtrar equipamento..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={cleanInputStyle} /></div>
               </div>
               <div style={tableWrapperStyle}>
                 <table style={tableStyle}>
                    <thead>
                      <tr style={tableHeaderRowStyle}>
                        <SortableTh label="Equipamento" sortKey="nome" currentSort={sortConfig} onSort={handleSort} />
                        <SortableTh label="Total Locações" sortKey="alugueis" currentSort={sortConfig} onSort={handleSort} />
                        <SortableTh label="Receita Gerada" sortKey="receita" currentSort={sortConfig} onSort={handleSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {processTableData(financialData.topEquipamentos, ["nome"]).map((equip, idx) => (
                        <tr key={idx} style={tableRowStyle} className="table-row-hover">
                          <td style={{ ...tdStyle, fontWeight: "700" }}>{equip.nome}</td>
                          <td style={tdStyle}>{equip.alugueis} pedidos</td>
                          <td style={{ ...tdStyle, color: "#10b981", fontWeight: "800" }}>{equip.receita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === "financeiro" && subTab === "abandonos" && financialData && (
            <div style={{ ...cardStyle, animation: "fadeIn 0.3s ease" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                    <ShoppingCart size={20} color="#f59e0b" /> Carrinhos Abandonados
                  </h3>
                  <div style={searchBoxStyle}><Search size={16} color="#94a3b8" /><input type="text" placeholder="Filtrar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={cleanInputStyle} /></div>
               </div>
               <div style={tableWrapperStyle}>
                 <table style={tableStyle}>
                    <thead>
                      <tr style={tableHeaderRowStyle}>
                        <SortableTh label="Equipamento" sortKey="nome" currentSort={sortConfig} onSort={handleSort} />
                        <SortableTh label="Qtd. Desistências" sortKey="quantidade" currentSort={sortConfig} onSort={handleSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {processTableData(financialData.topAbandonados, ["nome"]).map((item, idx) => (
                        <tr key={idx} style={tableRowStyle} className="table-row-hover">
                          <td style={{ ...tdStyle, fontWeight: "700" }}>{item.nome}</td>
                          <td style={{ ...tdStyle, color: "#f59e0b", fontWeight: "800" }}>{item.quantidade} abandonos</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === "operacional" && operationalData && (
            <div style={{ ...cardStyle, animation: "fadeIn 0.3s ease" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "15px" }}>
                  <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                    <AlertTriangle size={20} color="#ef4444" /> Relatório de Ocorrências
                  </h3>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                      <div style={{ width: "130px" }}>
                        <DatePicker
                          selected={ocorrenciaStart ? parseDateStringAsLocal(ocorrenciaStart) : null}
                          onChange={(d: Date | null) => setOcorrenciaStart(d ? toISODateString(d) : "")}
                          dateFormat="dd/MM/yyyy"
                          locale="pt-BR"
                          placeholderText="Data Inicial"
                          className="custom-datepicker"
                          renderCustomHeader={(props) => <CustomDatePickerHeader {...props} />}
                        />
                      </div>
                      <div style={{ width: "130px" }}>
                        <DatePicker
                          selected={ocorrenciaEnd ? parseDateStringAsLocal(ocorrenciaEnd) : null}
                          onChange={(d: Date | null) => setOcorrenciaEnd(d ? toISODateString(d) : "")}
                          dateFormat="dd/MM/yyyy"
                          locale="pt-BR"
                          placeholderText="Data Final"
                          className="custom-datepicker"
                          renderCustomHeader={(props) => <CustomDatePickerHeader {...props} />}
                        />
                      </div>
                    </div>
                    <div style={searchBoxStyle}><Search size={16} color="#94a3b8" /><input type="text" placeholder="Buscar cliente ou máquina..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={cleanInputStyle} /></div>
                  </div>
               </div>
               <div style={tableWrapperStyle}>
                 <table style={tableStyle}>
                    <thead>
                      <tr style={{ ...tableHeaderRowStyle, backgroundColor: "#1e293b", color: "#fff" }}>
                        <SortableTh label="Data" sortKey="data" currentSort={sortConfig} onSort={handleSort} />
                        <SortableTh label="Tipo" sortKey="tipo" currentSort={sortConfig} onSort={handleSort} />
                        <SortableTh label="Equipamento" sortKey="equipamento" currentSort={sortConfig} onSort={handleSort} />
                        <SortableTh label="Cliente" sortKey="cliente" currentSort={sortConfig} onSort={handleSort} />
                        <SortableTh label="Valor" sortKey="valor" currentSort={sortConfig} onSort={handleSort} />
                        <SortableTh label="Status" sortKey="resolvido" currentSort={sortConfig} onSort={handleSort} />
                        <th style={thStyle}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processTableData(operationalData.ocorrencias.filter(bo => {
                        const d = bo.data.substring(0, 10);
                        if (ocorrenciaStart && d < ocorrenciaStart) return false;
                        if (ocorrenciaEnd && d > ocorrenciaEnd) return false;
                        return true;
                      }), ["equipamento", "cliente", "tipo"]).map((bo) => (
                        <tr key={bo.id} style={{ ...tableRowStyle, backgroundColor: bo.resolvido ? "#f0fdf4" : "#fff1f2" }} className="table-row-hover">
                          <td style={tdStyle}>{new Date(bo.data).toLocaleDateString()}</td>
                          <td style={{ ...tdStyle, fontWeight: "800", color: bo.tipo === "ROUBO" ? "#ef4444" : "#f59e0b" }}>{bo.tipo}</td>
                          <td style={tdStyle}>{bo.equipamento} <small style={{ color: "#94a3b8" }}>#{bo.unidadeId}</small></td>
                          <td style={tdStyle}>{bo.cliente}<br/><small style={{ color: "#64748b" }}>{bo.contato}</small></td>
                          <td style={{ ...tdStyle, fontWeight: "700" }}>R$ {Number(bo.valor).toFixed(2)}</td>
                          <td style={tdStyle}>{bo.resolvido ? <span style={{ color: "#10b981", display: "flex", alignItems: "center", gap: "4px" }}><CheckCircle size={14}/> Resolvido</span> : <span style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: "4px" }}><Clock size={14}/> Pendente</span>}</td>
                          <td style={tdStyle}>
                            {bo.pedidoId ? <Link to={`/my-reservations/${bo.pedidoId}`} style={actionBtnStyle}><ChevronRight size={16} /></Link> : <span style={{ color: "#cbd5e1" }}>-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === "inventario" && operationalData && (
            <div style={{ ...cardStyle, animation: "fadeIn 0.3s ease" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                    <Package size={20} color="#3b82f6" /> Inventário de Ativos
                  </h3>
                  <div style={searchBoxStyle}><Search size={16} color="#94a3b8" /><input type="text" placeholder="Filtrar por S/N ou nome..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={cleanInputStyle} /></div>
               </div>
               <div style={tableWrapperStyle}>
                 <table style={tableStyle}>
                    <thead>
                      <tr style={tableHeaderRowStyle}>
                        <SortableTh label="ID" sortKey="id" currentSort={sortConfig} onSort={handleSort} />
                        <SortableTh label="S/N (Serial)" sortKey="codigo_serial" currentSort={sortConfig} onSort={handleSort} />
                        <SortableTh label="Equipamento" sortKey="equipamento" currentSort={sortConfig} onSort={handleSort} />
                        <SortableTh label="Status" sortKey="status" currentSort={sortConfig} onSort={handleSort} />
                        <th style={thStyle}>Histórico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processTableData(operationalData.inventario, ["equipamento", "status", "codigo_serial"]).map((item) => (
                        <tr key={item.id} style={tableRowStyle} className="table-row-hover">
                          <td style={tdStyle}>#{item.id}</td>
                          <td style={{ ...tdStyle, fontWeight: "700" }}>{item.codigo_serial || "---"}</td>
                          <td style={{ ...tdStyle, fontWeight: "600" }}>{item.equipamento}</td>
                          <td style={tdStyle}><span style={badgeStyle(item.status === "disponivel" ? "success" : item.status === "alugado" ? "info" : "danger")}>{item.status.toUpperCase()}</span></td>
                          <td style={tdStyle}>
                            <button onClick={() => openHistoryModal(item)} style={historyBtnStyle} title="Ver Histórico"><History size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </div>
          )}
        </>
      )}

      {/* MODAL MANUAL */}
      {showManual && (
        <div style={modalOverlayStyle} onClick={() => setShowManual(false)}>
          <div style={{ ...modalContentStyle, maxWidth: '650px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={manualHeaderStyle}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", color: "#1e293b" }}>
                <HelpCircle size={22} color="#2563eb" /> Manual do Usuário: Relatórios e Gestão de Ativos
              </h3>
              <button onClick={() => setShowManual(false)} style={manualCloseBtnStyle}><X size={22} /></button>
            </div>
            <div style={{ padding: "30px", overflowY: "auto", flexGrow: 1, maxHeight: "70vh" }}>
              <div style={{ color: "#475569", lineHeight: "1.6" }}>
                <div style={manualStepStyle}><div style={stepNumStyle}>1</div><div><strong>Relatórios Financeiros:</strong> Acompanhe faturamento, prejuízos e carrinhos abandonados. Use o filtro de data para ver o desempenho de períodos específicos.</div></div>
                <div style={manualStepStyle}><div style={stepNumStyle}>2</div><div><strong>Ranking de Rentabilidade:</strong> Descubra quais máquinas trazem mais dinheiro para a loja e quais ficam paradas.</div></div>
                <div style={manualStepStyle}><div style={stepNumStyle}>3</div><div><strong>Gestão de Ocorrências:</strong> Monitore equipamentos com ocorrências ou com defeitos graves. O sistema destaca pendências em vermelho para ação rápida.</div></div>
                <div style={manualStepStyle}><div style={stepNumStyle}>4</div><div><strong>Inventário e Histórico:</strong> Consulte cada unidade individual pelo Serial (S/N) e veja todo o histórico de manutenções dela clicando no ícone de relógio.</div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <MaintenanceHistoryModal isOpen={historyModalOpen} onClose={() => setHistoryModalOpen(false)} unitId={selectedUnitForHistory?.id} unitSerial={selectedUnitForHistory?.codigo_serial} equipmentName={selectedUnitForHistory?.equipamento} />
      
      <style>{`
        .table-row-hover:hover { background-color: #f8fafc !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }

        .custom-datepicker {
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid transparent;
          outline: none;
          width: 100%;
          font-size: 0.85rem;
          color: #334155;
          background: transparent;
          cursor: pointer;
        }
        .custom-datepicker:focus { border-color: #2563eb; }
        
        .react-datepicker-wrapper { width: 100%; }
        .react-datepicker {
          font-family: "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .react-datepicker__header {
          background-color: #fff;
          border-bottom: 1px solid #f1f5f9;
          padding-top: 15px;
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
        }
        .react-datepicker__day-name { color: #94a3b8; font-weight: 600; font-size: 0.75rem; }
        .react-datepicker__day { font-weight: 500; font-size: 0.85rem; color: #475569; }
        .react-datepicker__day--selected { background-color: #2563eb !important; color: #fff !important; border-radius: 8px; font-weight: bold; }
        .react-datepicker__day:hover { border-radius: 8px; background-color: #f1f5f9; }
      `}</style>
    </div>
  );
};

// Componentes Auxiliares
const TabButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 20px", border: "none", background: "none", cursor: "pointer", fontSize: "0.95rem", fontWeight: active ? "800" : "600", color: active ? "#2563eb" : "#64748b", borderBottom: active ? "3px solid #2563eb" : "3px solid transparent", transition: "all 0.2s" }}>
    {icon} {label}
  </button>
);

const SubTabButton = ({ active, onClick, label }: any) => (
  <button onClick={onClick} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", backgroundColor: active ? "#fff" : "transparent", color: active ? "#1e293b" : "#64748b", fontWeight: active ? "800" : "600", fontSize: "0.85rem", cursor: "pointer", boxShadow: active ? "0 2px 4px rgba(0,0,0,0.05)" : "none", transition: "0.2s" }}>
    {label}
  </button>
);

const KpiCard = ({ title, value, icon, color, isCurrency = true, highlight = false, subText }: any) => (
  <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "16px", border: highlight ? `2px solid ${color}` : "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: "10px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>{title}</span>
      <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: `${color}15`, color: color }}>{icon}</div>
    </div>
    <div>
      <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#1e293b" }}>{isCurrency ? `R$ ${Number(value).toFixed(2)}` : value}</div>
      {subText && <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "600" }}>{subText}</div>}
    </div>
  </div>
);

const SortableTh = ({ label, sortKey, currentSort, onSort }: any) => (
  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => onSort(sortKey)}>
    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
      {label} {currentSort?.key === sortKey && (currentSort.direction === "asc" ? <ArrowUpRight size={14}/> : <ChevronRight size={14} style={{ transform: 'rotate(90deg)' }}/>)}
    </div>
  </th>
);

// Estilos
const cardStyle: React.CSSProperties = { backgroundColor: "#fff", padding: "25px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" };
const cardHeaderStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "15px" };
const refreshBtnStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: "#eff6ff", color: "#2563eb", cursor: "pointer", transition: "0.2s" };
const pdfBtnStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", borderRadius: "10px", border: "none", backgroundColor: "#1e293b", color: "#fff", fontSize: "0.85rem", fontWeight: "700", cursor: "pointer" };
const helpBtnStyle: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "50%", width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" };
const searchBoxStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "8px", padding: "8px 15px", borderRadius: "10px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", width: "550px" };
const cleanInputStyle: React.CSSProperties = { border: "none", background: "none", outline: "none", fontSize: "0.85rem", color: "#334155", width: "250px" };
const tableWrapperStyle: React.CSSProperties = { overflowX: "auto", borderRadius: "12px", border: "1px solid #e2e8f0" };
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" };
const tableHeaderRowStyle: React.CSSProperties = { backgroundColor: "#f8fafc", color: "#64748b", textAlign: "left", borderBottom: "2px solid #e2e8f0" };
const thStyle: React.CSSProperties = { padding: "15px", fontWeight: "700", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "inherit" };
const tdStyle: React.CSSProperties = { padding: "15px", borderBottom: "1px solid #f1f5f9", color: "#1e293b" };
const tableRowStyle: React.CSSProperties = { transition: "0.2s" };
const actionBtnStyle: React.CSSProperties = { display: "inline-flex", padding: "6px", borderRadius: "6px", backgroundColor: "#eff6ff", color: "#2563eb", border: "none" };
const historyBtnStyle: React.CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", padding: "8px", borderRadius: "8px", color: "#475569", cursor: "pointer" };
const badgeStyle = (type: "success" | "danger" | "info") => ({ padding: "4px 10px", borderRadius: "20px", fontSize: "0.7rem", fontWeight: "800", textTransform: "uppercase", backgroundColor: type === "success" ? "#ecfdf5" : type === "danger" ? "#fff1f2" : "#eff6ff", color: type === "success" ? "#059669" : type === "danger" ? "#ef4444" : "#2563eb" } as React.CSSProperties);

const modalOverlayStyle: React.CSSProperties = { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, animation: "fadeIn 0.2s ease" };
const modalContentStyle: React.CSSProperties = { backgroundColor: "#fff", borderRadius: "16px", width: "90%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", overflow: "hidden" };
const manualHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 30px", borderBottom: "1px solid #f1f5f9" };
const manualCloseBtnStyle: React.CSSProperties = { background: "#f1f5f9", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center" };
const manualStepStyle: React.CSSProperties = { display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" };
const stepNumStyle: React.CSSProperties = { width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 };

export default AdminReportsPage;