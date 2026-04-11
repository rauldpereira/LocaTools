import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { parseDateStringAsLocal } from "../../utils/dateUtils";

const EquipamentosEmLocacao: React.FC = () => {
  const [rentedItems, setRentedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    const fetchRentedEquipment = async () => {
      try {
        setLoading(true);
        // Busca as reservas
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/reservations/all`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Filtra SÓ os pedidos que estão com o cliente agora
        const activeOrders = data.filter((order: any) => order.status === "em_andamento");

        // Extrai as máquinas de dentro dos pedidos pra fazer uma lista plana
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

        // Ordena pela data de devolução
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

  if (loading) return <p style={{ color: "#666" }}>Carregando equipamentos em locação...</p>;

  if (rentedItems.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center", backgroundColor: "#f8f9fa", borderRadius: "8px", border: "1px dashed #ccc" }}>
        <span style={{ fontSize: "1.5rem" }}>😴</span>
        <p style={{ color: "#666", margin: "10px 0 0 0" }}>Nenhum equipamento em locação no momento.</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
        <thead>
          <tr style={{ backgroundColor: "#e3f2fd", color: "#0d47a1", fontSize: "0.9rem" }}>
            <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #b6d4fe" }}>Equipamento (Patrimônio)</th>
            <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #b6d4fe" }}>Cliente</th>
            <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #b6d4fe" }}>Período</th>
            <th style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #b6d4fe" }}>Pedido</th>
          </tr>
        </thead>
        <tbody>
          {rentedItems.map((item, index) => {
            const dataSaida = parseDateStringAsLocal(item.dataInicio).toLocaleDateString("pt-BR");
            const dataVolta = parseDateStringAsLocal(item.dataFim).toLocaleDateString("pt-BR");
            const dataFimReal = parseDateStringAsLocal(item.dataFim);
            dataFimReal.setHours(0,0,0,0);
            
            const hoje = new Date();
            hoje.setHours(0,0,0,0);
            
            // Pinta a data de vermelho se a devolução estiver atrasada
            const isAtrasado = dataFimReal.getTime() < hoje.getTime();

            return (
              <tr key={`${item.id}-${index}`} style={{ borderBottom: "1px solid #eee", backgroundColor: index % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "12px", fontWeight: "bold", color: "#333" }}>
                  {item.Unidade?.Equipamento?.nome} 
                  <span style={{ color: "#888", fontSize: "0.8rem", marginLeft: "5px" }}>(#{item.Unidade?.id})</span>
                </td>
                <td style={{ padding: "12px", color: "#555" }}>
                  👤 {item.clienteNome}
                </td>
                <td style={{ padding: "12px", textAlign: "center", fontSize: "0.9rem" }}>
                  <span style={{ color: "#666" }}>{dataSaida}</span>
                  <span style={{ margin: "0 5px", color: "#000" }}>até</span>
                  <strong style={{ color: isAtrasado ? "#dc3545" : "#28a745" }}>
                    {dataVolta} {isAtrasado && "⚠️"}
                  </strong>
                </td>
                <td style={{ padding: "12px", textAlign: "center" }}>
                  <Link to={`/admin/vistoria/${item.orderId}?tipo=devolucao`}>
                    <button style={{
                      backgroundColor: "#007bff", color: "white", padding: "6px 12px",
                      border: "none", borderRadius: "4px", cursor: "pointer",
                      fontWeight: "bold", fontSize: "0.85rem"
                    }}>
                      Ver Pedido #{item.orderId}
                    </button>
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default EquipamentosEmLocacao;