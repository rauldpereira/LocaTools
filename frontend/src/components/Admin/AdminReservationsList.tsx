import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { parseDateStringAsLocal } from "../../utils/dateUtils";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale/pt-BR";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("pt-BR", ptBR);

interface Order {
  id: number;
  status: string;
  data_inicio: string;
  data_fim: string;
  tipo_entrega?: string;
  solicitou_devolucao?: boolean;
  coleta_confirmada?: boolean;
}

type TabKey = "urgentes" | "saidas" | "devolucoes" | "pendencias" | "historico" | "financeiro";

const CustomDatePickerHeader = ({
  date,
  changeYear,
  changeMonth,
  decreaseMonth,
  increaseMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
}: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - 5 + i);

  return (
    <div style={{ margin: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <button type="button" onClick={decreaseMonth} disabled={prevMonthButtonDisabled} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', color: '#64748b', padding: '0 10px' }}>{"<"}</button>
      
      <div style={{ position: "relative" }}>
        <div 
          onClick={() => setIsOpen(!isOpen)}
          style={{ fontWeight: 800, fontSize: "1rem", color: "#1e293b", textTransform: "capitalize", cursor: "pointer", padding: "6px 12px", borderRadius: "8px", backgroundColor: isOpen ? "#e2e8f0" : "transparent", transition: "background 0.2s" }}
        >
          {date.toLocaleString("pt-BR", { month: "long", year: "numeric" })}
        </div>
        
        {isOpen && (
          <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 100, display: "flex", gap: "10px", padding: "15px", width: "260px", marginTop: "5px" }}>
            <div style={{ display: "flex", flexDirection: "column", height: "180px", overflowY: "auto", flex: 1, gap: "4px" }}>
              {months.map((m, i) => (
                <button key={m} type="button" onClick={() => { changeMonth(i); setIsOpen(false); }} style={{ padding: "8px", border: "none", background: date.getMonth() === i ? "#2563eb" : "transparent", color: date.getMonth() === i ? "#fff" : "#475569", cursor: "pointer", borderRadius: "6px", fontWeight: date.getMonth() === i ? "bold" : "normal", textAlign: "left" }}>{m}</button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", height: "180px", overflowY: "auto", flex: 1, gap: "4px" }}>
              {years.map((y) => (
                <button key={y} type="button" onClick={() => { changeYear(y); setIsOpen(false); }} style={{ padding: "8px", border: "none", background: date.getFullYear() === y ? "#2563eb" : "transparent", color: date.getFullYear() === y ? "#fff" : "#475569", cursor: "pointer", borderRadius: "6px", fontWeight: date.getFullYear() === y ? "bold" : "normal", textAlign: "center" }}>{y}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button type="button" onClick={increaseMonth} disabled={nextMonthButtonDisabled} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', color: '#64748b', padding: '0 10px' }}>{">"}</button>
    </div>
  );
};

const AdminReservationsList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { token, hasPermission, user } = useAuth();

  const [filterId, setFilterId] = useState("");
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);
  const [filterDeliveryType, setFilterDeliveryType] = useState<string>("todos");

  const podeGerenciarReservas = hasPermission("gerenciar_reservas");
  const podeFazerVistoria = hasPermission("fazer_vistoria");
  const podeReceberPagamentos = user?.tipo_usuario === "admin" || hasPermission("receber_pagamentos");
  
  const abaInicial = (podeGerenciarReservas || podeFazerVistoria) ? "urgentes" : "financeiro";
  const [activeTab, setActiveTab] = useState<TabKey>(abaInicial);
  const [activeSubTab, setActiveSubTab] = useState<string>("sub1");

  useEffect(() => {
    setActiveSubTab("sub1");
  }, [activeTab]);

  const fetchAllOrders = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/reservations/all`, config);
      setOrders(data);
    } catch (error) {
      // Silencioso
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  const filteredOrders = orders.filter((o) => {
    let matchId = true;
    if (filterId) matchId = o.id.toString().includes(filterId.replace(/\D/g, ""));
    
    let matchDate = true;
    if (filterStartDate || filterEndDate) {
      const oStartStr = o.data_inicio.substring(0, 10);
      const oEndStr = o.data_fim.substring(0, 10);
      if (filterStartDate) {
        const fStartStr = filterStartDate.toLocaleDateString('en-CA');
        if (oEndStr < fStartStr) matchDate = false;
      }
      if (filterEndDate) {
        const fEndStr = filterEndDate.toLocaleDateString('en-CA');
        if (oStartStr > fEndStr) matchDate = false;
      }
    }

    let matchDelivery = true;
    if (filterDeliveryType !== "todos") {
      matchDelivery = o.tipo_entrega === filterDeliveryType;
    }

    return matchId && matchDate && matchDelivery;
  });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const sortByDateAsc = (a: Order, b: Order) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime();
  const sortByIdDesc = (a: Order, b: Order) => b.id - a.id;

  const ordersDelayed = filteredOrders.filter((o) => o.status === "aprovada" && parseDateStringAsLocal(o.data_inicio).setHours(0,0,0,0) < hoje.getTime()).sort(sortByDateAsc);
  const ordersDelayedReturn = filteredOrders.filter((o) => o.status === "em_andamento" && parseDateStringAsLocal(o.data_fim).setHours(0,0,0,0) < hoje.getTime()).sort(sortByDateAsc);
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

  const handleAction = async (url: string, confirmMsg: string) => {
    if (!window.confirm(confirmMsg)) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${import.meta.env.VITE_API_URL}${url}`, {}, config);
      fetchAllOrders();
    } catch (e) { alert("Erro ao processar."); }
  };

  const PagedTable = ({ orderList, headers, action }: { orderList: Order[]; headers: { key: keyof Order; label: string }[]; action: (order: Order) => React.ReactNode; }) => {
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const totalPages = Math.ceil(orderList.length / perPage);
    const data = orderList.slice((page - 1) * perPage, page * perPage);

    const handlePerPageChange = (newVal: number) => { setPerPage(newVal); setPage(1); };

    if (orderList.length === 0) return <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>Nenhum registro encontrado.</div>;

    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Exibir:</span>
          <select value={perPage} onChange={(e) => handlePerPageChange(Number(e.target.value))} style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.85rem", color: "#475569", outline: "none", cursor: "pointer" }}>
            <option value={10}>10 linhas</option>
            <option value={25}>25 linhas</option>
            <option value={50}>50 linhas</option>
            <option value={100}>100 linhas</option>
          </select>
        </div>
        <div style={{ overflowX: "auto", backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                {headers.map(h => <th key={h.key} style={{ padding: "16px", color: "#64748b", fontWeight: "700", textAlign: "center", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>{h.label}</th>)}
                <th style={{ padding: "16px", color: "#64748b", fontWeight: "700", textAlign: "center", textTransform: "uppercase", fontSize: "0.75rem" }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {data.map((order) => (
                <tr key={order.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }} className="table-row-hover">
                  {headers.map(h => {
                    let val: any = order[h.key];
                    if (h.key.includes("data")) val = parseDateStringAsLocal(val as string).toLocaleDateString();
                    if (h.key === "id") val = <Link to={`/my-reservations/${order.id}`} style={{ color: "#2563eb", fontWeight: "bold", textDecoration: "none" }}>#{order.id}</Link>;
                    if (h.key === "status") val = <span style={{ fontWeight: "700", color: order.status === "PREJUIZO" ? "#ef4444" : "#475569" }}>{order.status.replace(/_/g, " ").toUpperCase()}</span>;
                    if (h.key === "tipo_entrega") val = <span style={{ color: val === "entrega" ? "#0056b3" : "#2c3e50", fontWeight: "600" }}>{val?.charAt(0).toUpperCase() + val?.slice(1)}</span>;
                    return <td key={h.key} style={{ padding: "16px", textAlign: "center" }}>{val}</td>;
                  })}
                  <td style={{ padding: "16px", textAlign: "center" }}>{action(order)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "5px", marginTop: "20px" }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)} style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid", borderColor: page === n ? "#2563eb" : "#e2e8f0", backgroundColor: page === n ? "#2563eb" : "#fff", color: page === n ? "#fff" : "#64748b", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s" }}>{n}</button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const getTabStyle = (isActive: boolean, isAlert: boolean = false) => ({
    padding: "14px 24px", border: "none", background: isActive ? (isAlert ? "#ef4444" : "#2563eb") : "transparent", color: isActive ? "#fff" : "#64748b", fontWeight: "bold" as const, cursor: "pointer", borderRadius: "10px", transition: "all 0.2s", fontSize: "0.95rem", whiteSpace: "nowrap" as const
  });

  const getSubTabStyle = (isActive: boolean) => ({
    padding: "8px 16px", border: "none", background: isActive ? "#e2e8f0" : "transparent", color: isActive ? "#0f172a" : "#64748b", fontWeight: "600" as const, cursor: "pointer", borderRadius: "8px", fontSize: "0.85rem", transition: "all 0.2s", marginRight: "10px"
  });

  if (loading) return <div style={{ textAlign: "center", padding: "100px", color: "#64748b" }}>Carregando pedidos...</div>;

  return (
    <div style={{ width: "100%", padding: "10px 0" }}>
      <div style={{ display: "flex", gap: "15px", marginBottom: "30px", padding: "20px", backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase" }}>Pedido ID</label>
          <input type="text" placeholder="Ex: 12" value={filterId} onChange={(e) => setFilterId(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", width: "120px", outline: "none", height: "42px" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase" }}>Data Início</label>
          <DatePicker
            selected={filterStartDate}
            onChange={(d: Date | null) => setFilterStartDate(d)}
            dateFormat="dd/MM/yyyy"
            locale="pt-BR"
            placeholderText="dd/mm/aaaa"
            todayButton="Hoje"
            className="custom-datepicker"
            renderCustomHeader={(props) => <CustomDatePickerHeader {...props} />}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase" }}>Data Fim</label>
          <DatePicker
            selected={filterEndDate}
            onChange={(d: Date | null) => setFilterEndDate(d)}
            dateFormat="dd/MM/yyyy"
            locale="pt-BR"
            placeholderText="dd/mm/aaaa"
            todayButton="Hoje"
            className="custom-datepicker"
            renderCustomHeader={(props) => <CustomDatePickerHeader {...props} />}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase" }}>Tipo</label>
          <select value={filterDeliveryType} onChange={(e) => setFilterDeliveryType(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", outline: "none", backgroundColor: "#fff", cursor: "pointer", height: "42px", color: "#475569" }}>
            <option value="todos">Todos</option>
            <option value="entrega">Só Entregas</option>
            <option value="retirada">Só Retiradas</option>
          </select>
        </div>
        {(filterId || filterStartDate || filterEndDate || filterDeliveryType !== "todos") && (
          <button onClick={() => { setFilterId(""); setFilterStartDate(null); setFilterEndDate(null); setFilterDeliveryType("todos"); }} style={{ padding: "0 20px", backgroundColor: "#f1f5f9", border: "none", borderRadius: "8px", color: "#ef4444", fontWeight: "bold", cursor: "pointer", height: "42px" }}>Limpar</button>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "25px", overflowX: "auto", paddingBottom: "10px" }}>
        {(podeGerenciarReservas || podeFazerVistoria) && <button onClick={() => setActiveTab("urgentes")} style={getTabStyle(activeTab === "urgentes", (ordersDelayed.length + ordersDelayedReturn.length) > 0)}>Urgentes ({ordersDelayed.length + ordersDelayedReturn.length})</button>}
        {podeReceberPagamentos && <button onClick={() => setActiveTab("financeiro")} style={getTabStyle(activeTab === "financeiro", ordersEmPrejuizo.length > 0)}>Financeiro</button>}
        {(podeGerenciarReservas || podeFazerVistoria) && (
          <><button onClick={() => setActiveTab("saidas")} style={getTabStyle(activeTab === "saidas")}>Saídas</button>
            <button onClick={() => setActiveTab("devolucoes")} style={getTabStyle(activeTab === "devolucoes")}>Devoluções</button>
            <button onClick={() => setActiveTab("pendencias")} style={getTabStyle(activeTab === "pendencias")}>Assinaturas</button></>
        )}
        {podeGerenciarReservas && <button onClick={() => setActiveTab("historico")} style={getTabStyle(activeTab === "historico")}>Histórico</button>}
      </div>

      <div style={{ backgroundColor: "#fff", padding: "30px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
        <div style={{ marginBottom: "25px", display: "flex", borderBottom: "1px solid #f1f5f9", paddingBottom: "15px" }}>
          {activeTab === "urgentes" && (
            <><button onClick={() => setActiveSubTab("sub1")} style={getSubTabStyle(activeSubTab === "sub1")}>Saídas Atrasadas ({ordersDelayed.length})</button>
              <button onClick={() => setActiveSubTab("sub2")} style={getSubTabStyle(activeSubTab === "sub2")}>Retornos Atrasados ({ordersDelayedReturn.length})</button></>
          )}
          {activeTab === "saidas" && (
            <><button onClick={() => setActiveSubTab("sub1")} style={getSubTabStyle(activeSubTab === "sub1")}>Hoje ({ordersToday.length})</button>
              <button onClick={() => setActiveSubTab("sub2")} style={getSubTabStyle(activeSubTab === "sub2")}>Agendadas ({ordersFuture.length})</button></>
          )}
          {activeTab === "devolucoes" && (
            <><button onClick={() => setActiveSubTab("sub1")} style={getSubTabStyle(activeSubTab === "sub1")}>Aguardando Vistoria ({ordersInLocacao.length})</button></>
          )}
          {activeTab === "pendencias" && (
            <><button onClick={() => setActiveSubTab("sub1")} style={getSubTabStyle(activeSubTab === "sub1")}>Saída ({ordersAwaitingSignature.length})</button>
              <button onClick={() => setActiveSubTab("sub2")} style={getSubTabStyle(activeSubTab === "sub2")}>Devolução ({ordersAwaitingReturnSignature.length})</button></>
          )}
          {activeTab === "financeiro" && (
            <><button onClick={() => setActiveSubTab("sub1")} style={getSubTabStyle(activeSubTab === "sub1")}>Sinal Pendente ({ordersAbandoned.length})</button>
              <button onClick={() => setActiveSubTab("sub2")} style={getSubTabStyle(activeSubTab === "sub2")}>Pagamento Final ({ordersFinalPayment.length})</button>
              <button onClick={() => setActiveSubTab("sub3")} style={getSubTabStyle(activeSubTab === "sub3")}>Dívidas/BO ({ordersEmPrejuizo.length})</button></>
          )}
          {activeTab === "historico" && (
            <><button onClick={() => setActiveSubTab("sub1")} style={getSubTabStyle(activeSubTab === "sub1")}>Finalizados ({finalizedOrders.length})</button>
              <button onClick={() => setActiveSubTab("sub2")} style={getSubTabStyle(activeSubTab === "sub2")}>Cancelados ({cancelledOrders.length})</button></>
          )}
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

      <style>{`
        .table-row-hover:hover { background-color: #f8fafc !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .custom-datepicker {
          padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; outline: none; width: 140px; font-size: 0.9rem; color: #475569; height: 42px; box-sizing: border-box;
        }
        .custom-datepicker:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1); }
        .react-datepicker-wrapper { width: auto; }
        
        /* ESTILIZAÇÃO DO CALENDÁRIO */
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
        .react-datepicker__day-name {
          color: #94a3b8;
          font-weight: 600;
          font-size: 0.75rem;
        }
        .react-datepicker__day {
          font-weight: 500;
          font-size: 0.85rem;
          color: #475569;
        }
        .react-datepicker__day--selected { 
          background-color: #2563eb !important; 
          color: #fff !important;
          border-radius: 8px; 
          font-weight: bold;
        }
        .react-datepicker__day:hover { 
          border-radius: 8px; 
          background-color: #f1f5f9;
        }
        .react-datepicker__today-button {
          background-color: #fff;
          border-top: 1px solid #f1f5f9;
          color: #2563eb;
          font-weight: bold;
          padding: 10px;
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
        }
      `}</style>
    </div>
  );
};

export default AdminReservationsList;