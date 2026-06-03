import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { parseDateStringAsLocal } from "../../utils/dateUtils";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale/pt-BR";
import "react-datepicker/dist/react-datepicker.css";
import { AlertTriangle, Clock, Calendar, CalendarClock, ClipboardCheck, FileSignature, FileCheck, Wallet, CreditCard, AlertOctagon, CheckCircle, XCircle, Siren, CircleDollarSign, Truck, RotateCcw, ClipboardList, History, HelpCircle, X, ChevronRight, Search } from "lucide-react";
import { useToast } from '../../context/ToastContext';
import CustomDropdown from "../CustomDropdown";

registerLocale("pt-BR", ptBR);

interface Order {
  id: number;
  status: string;
  data_inicio: string;
  data_fim: string;
  tipo_entrega?: string;
  solicitou_devolucao?: boolean;
  coleta_confirmada?: boolean;
  [key: string]: any;
}

type TabKey = "urgentes" | "saidas" | "devolucoes" | "pendencias" | "historico" | "financeiro";

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

const AdminReservationsList: React.FC = () => {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const { token, hasPermission, user } = useAuth();
  const [showManual, setShowManual] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, url: string, msg: string}>({isOpen: false, url: "", msg: ""});
  const [filterId, setFilterId] = useState("");
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);
  const [filterDeliveryType, setFilterDeliveryType] = useState<string>("todos");
  const podeGerenciarReservas = hasPermission("gerenciar_reservas");
  const podeFazerVistoria = hasPermission("fazer_vistoria");
  const podeReceberPagamentos = user?.tipo_usuario === "admin" || hasPermission("receber_pagamentos");
  const abaInicial = (podeGerenciarReservas || podeFazerVistoria) ? "urgentes" : "financeiro";
  const [activeTab, setActiveTab] = useState<TabKey>(() => (sessionStorage.getItem("adminResTab") as TabKey) || abaInicial);
  const [activeSubTab, setActiveSubTab] = useState<string>(() => sessionStorage.getItem("adminResSubTab") || "sub1");
  useEffect(() => { sessionStorage.setItem("adminResTab", activeTab); }, [activeTab]);
  useEffect(() => { sessionStorage.setItem("adminResSubTab", activeSubTab); }, [activeSubTab]);
  const fetchAllOrders = useCallback(async () => {
    if (!token) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/reservations/all`, config);
      setOrders(data);
    } catch (error) {} 
  }, [token]);
  useEffect(() => { fetchAllOrders(); }, [fetchAllOrders]);
  const filteredOrders = orders.filter((o) => {
    let matchId = true; if (filterId) matchId = o.id.toString().includes(filterId.replace(/\D/g, ""));
    let matchDate = true;
    if (filterStartDate || filterEndDate) {
      const oStartStr = o.data_inicio.substring(0, 10);
      const oEndStr = o.data_fim.substring(0, 10);
      if (filterStartDate && oEndStr < filterStartDate.toLocaleDateString('en-CA')) matchDate = false;
      if (filterEndDate && oStartStr > filterEndDate.toLocaleDateString('en-CA')) matchDate = false;
    }
    let matchDelivery = true; if (filterDeliveryType !== "todos") matchDelivery = o.tipo_entrega === filterDeliveryType;
    return matchId && matchDate && matchDelivery;
  });
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const sortByDateAsc = (a: Order, b: Order) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime();
  const sortByIdDesc = (a: Order, b: Order) => b.id - a.id;
  
  const ordersDelayed = filteredOrders.filter((o) => o.status === "aprovada" && parseDateStringAsLocal(o.data_inicio).setHours(0,0,0,0) < hoje.getTime()).sort(sortByDateAsc);
  const ordersDelayedReturn = filteredOrders.filter((o) => o.status === "em_andamento" && parseDateStringAsLocal(o.data_fim).setHours(0,0,0,0) < hoje.getTime()).sort(sortByDateAsc);
  const ordersReturnToday = filteredOrders.filter((o) => o.status === "em_andamento" && parseDateStringAsLocal(o.data_fim).setHours(0,0,0,0) === hoje.getTime()).sort(sortByDateAsc);
  
  const ordersToday = filteredOrders.filter((o) => (o.status === "aprovada" || o.status === "saiu_para_entrega") && parseDateStringAsLocal(o.data_inicio).setHours(0,0,0,0) === hoje.getTime()).sort(sortByDateAsc);
  const ordersFuture = filteredOrders.filter((o) => o.status === "aprovada" && parseDateStringAsLocal(o.data_inicio).setHours(0,0,0,0) > hoje.getTime()).sort(sortByDateAsc);
  const ordersInLocacao = filteredOrders.filter((o) => o.status === "em_andamento").sort(sortByDateAsc);
  
  const ordersAwaitingSignature = filteredOrders.filter((o) => o.status === "aguardando_assinatura").sort(sortByIdDesc);
  const ordersAwaitingReturnSignature = filteredOrders.filter((o) => o.status === "aguardando_assinatura_devolucao").sort(sortByIdDesc);
  const ordersFinalPayment = filteredOrders.filter((o) => o.status === "aguardando_pagamento_final").sort(sortByIdDesc);
  const ordersAbandoned = filteredOrders.filter((o) => o.status === "pendente").sort(sortByIdDesc);
  const ordersEmPrejuizo = filteredOrders.filter((o) => o.status === "PREJUIZO").sort(sortByIdDesc);
  const finalizedOrders = filteredOrders.filter((o) => o.status === "finalizada").sort(sortByIdDesc);
  const cancelledOrders = filteredOrders.filter((o) => o.status === "cancelada").sort(sortByIdDesc);
  
  const handleAction = (url: string, confirmMsg: string) => {
    setConfirmModal({ isOpen: true, url, msg: confirmMsg });
  };

  const confirmAction = async () => {
    const { url } = confirmModal;
    setConfirmModal({ isOpen: false, url: "", msg: "" });
    if (!url) return;
    try { 
      const config = { headers: { Authorization: `Bearer ${token}` } }; 
      await axios.put(`${import.meta.env.VITE_API_URL}${url}`, {}, config); 
      fetchAllOrders(); 
    } catch (e) { toast.error("Erro ao processar."); }
  };
  const PagedTable = ({ orderList, headers, action }: { orderList: Order[]; headers: { key: keyof Order; label: string }[]; action: (order: Order) => React.ReactNode; }) => {
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [sortKey, setSortKey] = useState<keyof Order | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const handleSort = (key: keyof Order) => {
      if (sortKey === key) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setSortKey(key);
        setSortOrder('asc');
      }
    };

    const sortedList = [...orderList].sort((a, b) => {
      if (!sortKey) return 0;
      let valA: any = a[sortKey];
      let valB: any = b[sortKey];

      if (typeof sortKey === 'string' && sortKey.includes("data")) {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const totalPages = Math.ceil(sortedList.length / perPage);
    const data = sortedList.slice((page - 1) * perPage, page * perPage);
    if (orderList.length === 0) return <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>Nenhum registro encontrado.</div>;
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Exibir:</span>
          <CustomDropdown className="filter-dropdown" value={perPage.toString()} onChange={(val) => { setPerPage(Number(val)); setPage(1); }} options={[{value: "10", label: "10 linhas"}, {value: "25", label: "25 linhas"}, {value: "50", label: "50 linhas"}, {value: "100", label: "100 linhas"}]} />
        </div>
        <div style={{ overflowX: "auto", backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead><tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>{headers.map(h => <th key={h.key as string} onClick={() => handleSort(h.key)} style={{ padding: "16px", color: "#64748b", fontWeight: "700", textAlign: "center", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em", cursor: "pointer", userSelect: "none" }}>{h.label} {sortKey === h.key ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</th>)}<th style={{ padding: "16px", color: "#64748b", fontWeight: "700", textAlign: "center", textTransform: "uppercase", fontSize: "0.75rem" }}>Ação</th></tr></thead>
            <tbody>{data.map((order) => (<tr key={order.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }} className="table-row-hover">{headers.map(h => { let val: any = order[h.key]; if (typeof h.key === 'string' && h.key.includes("data")) val = parseDateStringAsLocal(val as string).toLocaleDateString(); if (h.key === "id") val = <Link to={`/my-reservations/${order.id}`} style={{ color: "#2563eb", fontWeight: "bold", textDecoration: "none" }}>#{order.id}</Link>; if (h.key === "status") val = <span style={{ fontWeight: "700", color: order.status === "PREJUIZO" ? "#ef4444" : "#475569" }}>{order.status.replace(/_/g, " ").toUpperCase()}</span>; if (h.key === "tipo_entrega") val = <span style={{ color: val === "entrega" ? "#0056b3" : "#2c3e50", fontWeight: "600" }}>{val?.charAt(0).toUpperCase() + val?.slice(1)}</span>; return <td key={h.key as string} style={{ padding: "16px", textAlign: "center" }}>{val}</td>; })}<td style={{ padding: "16px", textAlign: "center" }}>{action(order)}</td></tr>))}</tbody>
          </table>
        </div>
        {totalPages > 1 && (<div style={{ display: "flex", justifyContent: "center", gap: "5px", marginTop: "20px" }}>{Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (<button key={n} onClick={() => setPage(n)} style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid", borderColor: page === n ? "#2563eb" : "#e2e8f0", backgroundColor: page === n ? "#2563eb" : "#fff", color: page === n ? "#fff" : "#64748b", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s" }}>{n}</button>))}</div>)}
      </div>
    );
  };
  const getTabStyle = (isActive: boolean, isAlert: boolean = false) => ({ padding: "14px 24px", border: "none", background: isActive ? (isAlert ? "#ef4444" : "#2563eb") : "transparent", color: isActive ? "#fff" : "#64748b", fontWeight: "bold" as const, cursor: "pointer", borderRadius: "10px", transition: "all 0.2s", fontSize: "0.95rem", whiteSpace: "nowrap" as const, display: "flex", alignItems: "center", gap: "8px" });
  const getSubTabStyle = (isActive: boolean) => ({ padding: "8px 16px", border: "none", background: isActive ? "#e2e8f0" : "transparent", color: isActive ? "#0f172a" : "#64748b", fontWeight: "600" as const, cursor: "pointer", borderRadius: "8px", fontSize: "0.85rem", transition: "all 0.2s", marginRight: "10px", display: "flex", alignItems: "center", gap: "6px" });
  return (
    <div style={{ width: "100%", padding: "10px 0", animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px" }}><h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.6rem", fontWeight: 800 }}>Gestão de Reservas e Pedidos</h2><button onClick={() => setShowManual(true)} title="Manual do Usuário" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "45px", height: "45px", borderRadius: "50%", border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#64748b", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }} onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; e.currentTarget.style.color = "#2563eb"; }} onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.color = "#64748b"; }}><HelpCircle size={24} /></button></div>
      <div style={{ display: "flex", gap: "15px", marginBottom: "30px", padding: "20px", backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}><label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase" }}>Pedido ID</label><div style={{ display: "flex", alignItems: "center", gap: "8px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0 10px", backgroundColor: "#f8fafc" }}><Search size={16} color="#94a3b8" /><input type="text" placeholder="ID" value={filterId} onChange={(e) => setFilterId(e.target.value)} style={{ border: "none", background: "none", outline: "none", padding: "10px 0", width: "80px", fontSize: "0.9rem" }} /></div></div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}><label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase" }}>Data Início</label><DatePicker selected={filterStartDate} onChange={(d: Date | null) => setFilterStartDate(d)} dateFormat="dd/MM/yyyy" locale="pt-BR" placeholderText="dd/mm/aaaa" todayButton="Hoje" className="custom-datepicker" renderCustomHeader={(props) => <CustomDatePickerHeader {...props} />} /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}><label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase" }}>Data Fim</label><DatePicker selected={filterEndDate} onChange={(d: Date | null) => setFilterEndDate(d)} dateFormat="dd/MM/yyyy" locale="pt-BR" placeholderText="dd/mm/aaaa" todayButton="Hoje" className="custom-datepicker" renderCustomHeader={(props) => <CustomDatePickerHeader {...props} />} /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "160px" }}><label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase" }}>Tipo</label><CustomDropdown className="filter-dropdown" value={filterDeliveryType} onChange={(val) => setFilterDeliveryType(val as string)} options={[{value: "todos", label: "Todos"}, {value: "entrega", label: "Só Entregas"}, {value: "retirada", label: "Só Retiradas"}]} /></div>
        {(filterId || filterStartDate || filterEndDate || filterDeliveryType !== "todos") && (<button onClick={() => { setFilterId(""); setFilterStartDate(null); setFilterEndDate(null); setFilterDeliveryType("todos"); }} style={{ padding: "0 20px", backgroundColor: "#f1f5f9", border: "none", borderRadius: "8px", color: "#ef4444", fontWeight: "bold", cursor: "pointer", height: "42px" }}>Limpar</button>)}
      </div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "25px", overflowX: "auto", paddingBottom: "10px" }}>
        {(podeGerenciarReservas || podeFazerVistoria) && <button onClick={() => { setActiveTab("urgentes"); setActiveSubTab("sub1"); }} style={getTabStyle(activeTab === "urgentes", (ordersDelayed.length + ordersDelayedReturn.length) > 0)}><Siren size={18} /> Urgentes ({ordersDelayed.length + ordersDelayedReturn.length})</button>}
        {podeReceberPagamentos && <button onClick={() => { setActiveTab("financeiro"); setActiveSubTab("sub1"); }} style={getTabStyle(activeTab === "financeiro", ordersEmPrejuizo.length > 0)}><CircleDollarSign size={18} /> Financeiro ({ordersAbandoned.length + ordersFinalPayment.length + ordersEmPrejuizo.length})</button>}
        {(podeGerenciarReservas || podeFazerVistoria) && (<React.Fragment><button onClick={() => { setActiveTab("saidas"); setActiveSubTab("sub1"); }} style={getTabStyle(activeTab === "saidas")}><Truck size={18} /> Saídas ({ordersToday.length})</button><button onClick={() => { setActiveTab("devolucoes"); setActiveSubTab("sub1"); }} style={getTabStyle(activeTab === "devolucoes")}><RotateCcw size={18} /> Devoluções ({ordersReturnToday.length + ordersDelayedReturn.length})</button><button onClick={() => { setActiveTab("pendencias"); setActiveSubTab("sub1"); }} style={getTabStyle(activeTab === "pendencias")}><ClipboardList size={18} /> Assinaturas ({ordersAwaitingSignature.length + ordersAwaitingReturnSignature.length})</button></React.Fragment>)}
        {podeGerenciarReservas && <button onClick={() => { setActiveTab("historico"); setActiveSubTab("sub1"); }} style={getTabStyle(activeTab === "historico")}><History size={18} /> Histórico</button>}
      </div>
      <div style={{ backgroundColor: "#fff", padding: "30px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
        <div style={{ marginBottom: "25px", display: "flex", borderBottom: "1px solid #f1f5f9", paddingBottom: "15px" }}>
          {activeTab === "urgentes" && (<React.Fragment><button onClick={() => setActiveSubTab("sub1")} style={getSubTabStyle(activeSubTab === "sub1")}><AlertTriangle size={14} /> Saídas Atrasadas ({ordersDelayed.length})</button><button onClick={() => setActiveSubTab("sub2")} style={getSubTabStyle(activeSubTab === "sub2")}><Clock size={14} /> Retornos Atrasados ({ordersDelayedReturn.length})</button></React.Fragment>)}
          {activeTab === "saidas" && (<React.Fragment><button onClick={() => setActiveSubTab("sub1")} style={getSubTabStyle(activeSubTab === "sub1")}><Calendar size={14} /> Hoje ({ordersToday.length})</button><button onClick={() => setActiveSubTab("sub2")} style={getSubTabStyle(activeSubTab === "sub2")}><CalendarClock size={14} /> Agendadas ({ordersFuture.length})</button></React.Fragment>)}
          {activeTab === "devolucoes" && (<button onClick={() => setActiveSubTab("sub1")} style={getSubTabStyle(activeSubTab === "sub1")}><ClipboardCheck size={14} /> Aguardando Vistoria ({ordersInLocacao.length})</button>)}
          {activeTab === "pendencias" && (<React.Fragment><button onClick={() => setActiveSubTab("sub1")} style={getSubTabStyle(activeSubTab === "sub1")}><FileSignature size={14} /> Saída ({ordersAwaitingSignature.length})</button><button onClick={() => setActiveSubTab("sub2")} style={getSubTabStyle(activeSubTab === "sub2")}><FileCheck size={14} /> Devolução ({ordersAwaitingReturnSignature.length})</button></React.Fragment>)}
          {activeTab === "financeiro" && (<React.Fragment><button onClick={() => setActiveSubTab("sub1")} style={getSubTabStyle(activeSubTab === "sub1")}><Wallet size={14} /> Sinal Pendente ({ordersAbandoned.length})</button><button onClick={() => setActiveSubTab("sub2")} style={getSubTabStyle(activeSubTab === "sub2")}><CreditCard size={14} /> Pagamento Final ({ordersFinalPayment.length})</button><button onClick={() => setActiveSubTab("sub3")} style={getSubTabStyle(activeSubTab === "sub3")}><AlertOctagon size={14} /> Dívidas/BO ({ordersEmPrejuizo.length})</button></React.Fragment>)}
          {activeTab === "historico" && (<React.Fragment><button onClick={() => setActiveSubTab("sub1")} style={getSubTabStyle(activeSubTab === "sub1")}><CheckCircle size={14} /> Finalizados ({finalizedOrders.length})</button><button onClick={() => setActiveSubTab("sub2")} style={getSubTabStyle(activeSubTab === "sub2")}><XCircle size={14} /> Cancelados ({cancelledOrders.length})</button></React.Fragment>)}
        </div>
        {activeTab === "urgentes" && activeSubTab === "sub1" && <PagedTable orderList={ordersDelayed} headers={[{key:"id", label:"ID"}, {key:"tipo_entrega", label:"Entrega"}, {key:"data_inicio", label:"Saída"}]} action={(o) => <Link to={`/admin/vistoria/${o.id}`}><button style={{backgroundColor:"#ef4444", color:"#fff", padding:"8px 12px", border:"none", borderRadius:"6px", fontWeight:"bold", cursor:"pointer"}}>Vistoria Atrasada</button></Link>} />}
        {activeTab === "urgentes" && activeSubTab === "sub2" && <PagedTable orderList={ordersDelayedReturn} headers={[{key:"id", label:"ID"}, {key:"tipo_entrega", label:"Entrega"}, {key:"data_fim", label:"Retorno"}]} action={(o) => <div style={{display:"flex", gap:"5px", justifyContent: "center", alignItems: "center"}}>{o.solicitou_devolucao && !o.coleta_confirmada && o.tipo_entrega === "entrega" && <button onClick={() => handleAction(`/api/reservations/${o.id}/confirm-pickup`, "Despachar coleta?")} style={{backgroundColor:"#0ea5e9", color:"#fff", padding:"8px 12px", border:"none", borderRadius:"6px", fontWeight:"bold", cursor:"pointer"}}>Coletar</button>}<Link to={`/admin/vistoria/${o.id}?tipo=devolucao`}><button style={{backgroundColor:"#f59e0b", color:"#fff", padding:"8px 12px", border:"none", borderRadius:"6px", fontWeight:"bold", cursor:"pointer"}}>Receber</button></Link></div>} />}
        {activeTab === "saidas" && activeSubTab === "sub1" && <PagedTable orderList={ordersToday} headers={[{key:"id", label:"ID"}, {key:"tipo_entrega", label:"Entrega"}, {key:"data_inicio", label:"Data"}]} action={(o) => <div style={{display:"flex", gap:"10px", alignItems:"center", justifyContent: "center"}}>{o.status === "aprovada" ? <button onClick={() => handleAction(`/api/reservations/${o.id}/dispatch`, "Confirmar saída?")} style={{backgroundColor: o.tipo_entrega === "entrega" ? "#0ea5e9" : "#10b981", color:"#fff", padding:"8px 12px", border:"none", borderRadius:"6px", fontWeight:"bold", cursor:"pointer"}}>{o.tipo_entrega === "entrega" ? "Despachar" : "Liberar"}</button> : <Link to={`/admin/vistoria/${o.id}`}><button style={{backgroundColor:"#2563eb", color:"#fff", padding:"8px 12px", border:"none", borderRadius:"6px", fontWeight:"bold", cursor:"pointer"}}>Fazer Vistoria</button></Link>}</div>} />}
        {activeTab === "saidas" && activeSubTab === "sub2" && <PagedTable orderList={ordersFuture} headers={[{key:"id", label:"ID"}, {key:"tipo_entrega", label:"Entrega"}, {key:"data_inicio", label:"Data Saída"}]} action={() => <button disabled style={{backgroundColor:"#f1f5f9", color:"#94a3b8", padding:"8px 12px", border:"none", borderRadius:"6px", cursor:"not-allowed"}}>Aguardando</button>} />}
        {activeTab === "devolucoes" && activeSubTab === "sub1" && <PagedTable orderList={ordersInLocacao} headers={[{key:"id", label:"ID"}, {key:"tipo_entrega", label:"Entrega"}, {key:"data_fim", label:"Data Retorno"}]} action={(o) => <div style={{display:"flex", gap:"5px", justifyContent: "center", alignItems: "center"}}>{o.solicitou_devolucao && !o.coleta_confirmada && o.tipo_entrega === "entrega" && <button onClick={() => handleAction(`/api/reservations/${o.id}/confirm-pickup`, "Avisar cliente da coleta?")} style={{backgroundColor:"#0ea5e9", color:"#fff", padding:"8px 12px", border:"none", borderRadius:"6px", fontWeight:"bold", cursor:"pointer"}}>Coletar</button>}<Link to={`/admin/vistoria/${o.id}?tipo=devolucao`}><button style={{backgroundColor:"#f59e0b", color:"#fff", padding:"8px 12px", border:"none", borderRadius:"6px", fontWeight:"bold", cursor:"pointer"}}>Vistoria</button></Link><button onClick={() => handleAction(`/api/reservations/${o.id}/skip-inspection`, "Devolução sem avarias?")} style={{backgroundColor:"#10b981", color:"#fff", padding:"8px 12px", border:"none", borderRadius:"6px", fontWeight:"bold", cursor:"pointer"}}>OK</button></div>} />}
        {activeTab === "pendencias" && activeSubTab === "sub1" && <PagedTable orderList={ordersAwaitingSignature} headers={[{key:"id", label:"ID"}, {key:"data_inicio", label:"Saída"}]} action={(o) => <Link to={`/my-reservations/${o.id}`}><button style={{backgroundColor:"#0ea5e9", color:"#fff", padding:"8px 12px", border:"none", borderRadius:"6px", fontWeight:"bold", cursor:"pointer"}}>Assinar</button></Link>} />}
        {activeTab === "pendencias" && activeSubTab === "sub2" && <PagedTable orderList={ordersAwaitingReturnSignature} headers={[{key:"id", label:"ID"}, {key:"data_fim", label:"Retorno"}]} action={(o) => <Link to={`/my-reservations/${o.id}`}><button style={{backgroundColor:"#10b981", color:"#fff", padding:"8px 12px", border:"none", borderRadius:"6px", fontWeight:"bold", cursor:"pointer"}}>Assinar Final</button></Link>} />}
        {activeTab === "financeiro" && activeSubTab === "sub1" && <PagedTable orderList={ordersAbandoned} headers={[{key:"id", label:"ID"}, {key:"data_inicio", label:"Saída"}]} action={(o) => <Link to={`/my-reservations/${o.id}`}><button style={{backgroundColor:"#f59e0b", color:"#fff", padding:"8px 12px", border:"none", borderRadius:"6px", fontWeight:"bold", cursor:"pointer"}}>Resgatar</button></Link>} />}
        {activeTab === "financeiro" && activeSubTab === "sub2" && <PagedTable orderList={ordersFinalPayment} headers={[{key:"id", label:"ID"}, {key:"status", label:"Status"}]} action={(o) => <Link to={`/admin/finalize-payment/${o.id}`}><button style={{backgroundColor:"#10b981", color:"#fff", padding:"8px 12px", border:"none", borderRadius:"6px", fontWeight:"bold", cursor:"pointer"}}>Cobrar</button></Link>} />}
        {activeTab === "financeiro" && activeSubTab === "sub3" && <PagedTable orderList={ordersEmPrejuizo} headers={[{key:"id", label:"ID"}, {key:"status", label:"Financeiro"}]} action={(o) => <Link to={`/my-reservations/${o.id}`}><button style={{backgroundColor:"#ef4444", color:"#fff", padding:"8px 12px", border:"none", borderRadius:"6px", fontWeight:"bold", cursor:"pointer"}}>Receber</button></Link>} />}
        {activeTab === "historico" && activeSubTab === "sub1" && <PagedTable orderList={finalizedOrders} headers={[{key:"id", label:"ID"}, {key:"data_fim", label:"Finalização"}]} action={(o) => <Link to={`/my-reservations/${o.id}`}><button style={{border:"1px solid #e2e8f0", color:"#64748b", padding:"8px 12px", borderRadius:"6px", fontWeight:"bold", cursor:"pointer"}}>Ver</button></Link>} />}
        {activeTab === "historico" && activeSubTab === "sub2" && <PagedTable orderList={cancelledOrders} headers={[{key:"id", label:"ID"}, {key:"status", label:"Status"}]} action={(o) => <Link to={`/my-reservations/${o.id}`}><button style={{border:"1px solid #e2e8f0", color:"#64748b", padding:"8px 12px", borderRadius:"6px", fontWeight:"bold", cursor:"pointer"}}>Ver</button></Link>} />}
      </div>
      {showManual && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, animation: 'fadeIn 0.2s ease' }} onClick={() => setShowManual(false)}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '90%', maxWidth: '650px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", color: "#1e293b" }}><HelpCircle size={22} color="#2563eb" /> Manual do Usuário: Reservas e Pedidos</h3>
              <button onClick={() => setShowManual(false)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center" }}><X size={22} /></button>
            </div>
            <div style={{ padding: "30px", overflowY: "auto", flexGrow: 1, maxHeight: "70vh" }}>
              <div style={{ color: "#475569", lineHeight: "1.6" }}>
                <p style={{ marginBottom: "25px", fontSize: "1rem" }}>Acompanhe todo o fluxo das locações, desde o orçamento até a devolução do equipamento.</p>
                <div style={manualStepStyle}><div style={stepNumStyle}>1</div><div><strong style={{ color: "#1e293b" }}>Painel de Urgências:</strong><p style={{ margin: "5px 0 0 0" }}>Onde tudo que precisa da sua atenção IMEDIATA aparece. Ex: Pedidos atrasados.</p></div></div>
                <div style={manualStepStyle}><div style={stepNumStyle}>2</div><div><strong style={{ color: "#1e293b" }}>Controle Operacional:</strong><p style={{ margin: "5px 0 0 0" }}>Nas abas de Saídas e Devoluções você gerencia a entrada e saída de equipamentos.</p></div></div>
                <div style={manualStepStyle}><div style={stepNumStyle}>3</div><div><strong style={{ color: "#1e293b" }}>Assinaturas e Financeiro:</strong><p style={{ margin: "5px 0 0 0" }}>Acompanhe pagamentos de sinal e contratos pendentes.</p></div></div>
                <div style={manualStepStyle}><div style={stepNumStyle}>4</div><div><strong style={{ color: "#1e293b" }}>Histórico e Buscas:</strong><p style={{ margin: "5px 0 0 0" }}>Use os filtros no topo para achar reservas antigas rapidamente.</p></div></div>
              </div>
            </div>
          </div>
        </div>
      )}
      {confirmModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, animation: 'fadeIn 0.2s ease' }} onClick={() => setConfirmModal({isOpen: false, url: "", msg: ""})}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '90%', maxWidth: '400px', padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b' }}>
              <AlertTriangle size={24} color="#f59e0b" />
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Confirmação</h3>
            </div>
            <p style={{ margin: 0, color: '#475569', fontSize: '1rem', lineHeight: '1.5' }}>
              {confirmModal.msg}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => setConfirmModal({isOpen: false, url: "", msg: ""})} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fff'}>
                Cancelar
              </button>
              <button onClick={confirmAction} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .table-row-hover:hover { background-color: #f8fafc !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .custom-datepicker { padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; outline: none; width: 140px; font-size: 0.9rem; color: #475569; height: 42px; box-sizing: border-box; }
        .custom-datepicker:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1); }
        .react-datepicker-wrapper { width: auto; }
        .react-datepicker { font-family: "Inter", sans-serif !important; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); }
        .react-datepicker__header { background-color: #fff; border-bottom: 1px solid #f1f5f9; padding-top: 15px; border-top-left-radius: 12px; border-top-right-radius: 12px; }
        .react-datepicker__day--selected { background-color: #2563eb !important; color: #fff !important; border-radius: 8px; }
        .react-datepicker__today-button { background-color: #fff; border-top: 1px solid #f1f5f9; color: #2563eb; font-weight: bold; padding: 10px; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; }
        .filter-dropdown .custom-dropdown-header { height: 42px !important; min-height: 42px !important; max-height: 42px !important; padding: 0 12px !important; border-radius: 8px !important; font-size: 0.9rem !important; box-sizing: border-box !important; }
      `}</style>
    </div>
  );
};
const manualStepStyle: React.CSSProperties = { display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" };
const stepNumStyle: React.CSSProperties = { width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 };
export default AdminReservationsList;