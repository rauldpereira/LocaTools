import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { parseDateStringAsLocal } from "../../utils/dateUtils";
import { 
  Wrench, 
  UserCircle, 
  CalendarDays, 
  FileText,
  AlertCircle,
  Search
} from "lucide-react";

const EquipamentosEmLocacao: React.FC = () => {
  const [rentedItems, setRentedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredItems = rentedItems.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const equipName = (item.Unidade?.Equipamento?.nome || "").toLowerCase();
    const equipId = (item.Unidade?.id || "").toString();
    const clientName = (item.clienteNome || "").toLowerCase();
    const orderId = (item.orderId || "").toString();
    return equipName.includes(term) || equipId.includes(term) || clientName.includes(term) || orderId.includes(term);
  });

  const totalPages = Math.ceil(filteredItems.length / perPage);
  const currentData = filteredItems.slice((page - 1) * perPage, page * perPage);

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
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", marginBottom: "20px", flexWrap: "wrap", gap: "15px" }}>
        
        <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#f8fafc", padding: "8px 15px", borderRadius: "8px", border: "1px solid #e2e8f0", flex: "1 1 250px" }}>
          <Search size={18} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Buscar por cliente, equipamento ou pedido..." 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            style={{ border: "none", backgroundColor: "transparent", outline: "none", width: "100%", fontSize: "0.9rem", color: "#334155" }}
          />
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600" }}>Exibir:</span>
          <select 
            value={perPage} 
            onChange={(e) => handlePerPageChange(Number(e.target.value))} 
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem", color: "#475569", outline: "none", cursor: "pointer", backgroundColor: "#fff" }}
          >
            <option value={10}>10 linhas</option>
            <option value={25}>25 linhas</option>
            <option value={50}>50 linhas</option>
            <option value={100}>100 linhas</option>
          </select>
        </div>
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
                <th style={{ padding: "16px", color: "#64748b", fontWeight: "700", textAlign: "left", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><Wrench size={14}/> Equipamento</div>
                </th>
                <th style={{ padding: "16px", color: "#64748b", fontWeight: "700", textAlign: "left", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><UserCircle size={14}/> Cliente</div>
                </th>
                <th style={{ padding: "16px", color: "#64748b", fontWeight: "700", textAlign: "center", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}><CalendarDays size={14}/> Período</div>
                </th>
                <th style={{ padding: "16px", color: "#64748b", fontWeight: "700", textAlign: "center", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}><FileText size={14}/> Pedido</div>
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
      `}</style>
    </div>
  );
};

export default EquipamentosEmLocacao;