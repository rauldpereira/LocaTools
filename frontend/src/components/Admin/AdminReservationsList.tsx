import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { parseDateStringAsLocal } from "../../utils/dateUtils";

interface Order {
  id: number;
  status: string;
  data_inicio: string;
  data_fim: string;
  tipo_entrega?: string;
  solicitou_devolucao?: boolean;
  coleta_confirmada?: boolean;
}

type TabKey =
  | "urgentes"
  | "saidas"
  | "devolucoes"
  | "pendencias"
  | "historico"
  | "financeiro";

const AdminReservationsList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { token, hasPermission, user } = useAuth();

  const [filterId, setFilterId] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const podeGerenciarReservas = hasPermission("gerenciar_reservas");
  const podeFazerVistoria = hasPermission("fazer_vistoria");

  const podeReceberPagamentos = user?.tipo_usuario === "admin" || hasPermission("receber_pagamentos");
  
  const abaInicial = (podeGerenciarReservas || podeFazerVistoria) ? "urgentes" : "financeiro";

  const [activeTab, setActiveTab] = useState<TabKey>(abaInicial);

  const fetchAllOrders = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(
        "http://localhost:3001/api/reservations/all",
        config,
      );
      setOrders(data);
    } catch (error) {
      console.error("Erro ao buscar todas as reservas:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  // APLICA O FILTRO ANTES DE DIVIDIR NAS ABAS
  const filteredOrders = orders.filter((o) => {
    let matchId = true;
    if (filterId) {
      // Remove tudo que não é número da busca e checa se o ID do pedido inclui o número
      matchId = o.id.toString().includes(filterId.replace(/\D/g, ""));
    }

    let matchDate = true;
    if (filterStartDate || filterEndDate) {
      const oStart = o.data_inicio.substring(0, 10);
      const oEnd = o.data_fim.substring(0, 10);
      
      // Verifica intersecção de datas
      if (filterStartDate && oEnd < filterStartDate) matchDate = false;
      if (filterEndDate && oStart > filterEndDate) matchDate = false;
    }

    return matchId && matchDate;
  });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const sortByDateAsc = (a: Order, b: Order) =>
    new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime();
  const sortByIdDesc = (a: Order, b: Order) => b.id - a.id;

  // --- FILTROS DE CATEGORIA ---
  const ordersToday = filteredOrders
    .filter(
      (o) =>
        (o.status === "aprovada" || o.status === "saiu_para_entrega") &&
        parseDateStringAsLocal(o.data_inicio).setHours(0, 0, 0, 0) ===
          hoje.getTime(),
    )
    .sort(sortByDateAsc);

  const ordersDelayed = filteredOrders
    .filter(
      (o) =>
        o.status === "aprovada" &&
        parseDateStringAsLocal(o.data_inicio).setHours(0, 0, 0, 0) <
          hoje.getTime(),
    )
    .sort(sortByDateAsc);

  const ordersFutureScheduled = filteredOrders
    .filter(
      (o) =>
        o.status === "aprovada" &&
        parseDateStringAsLocal(o.data_inicio).setHours(0, 0, 0, 0) >
          hoje.getTime(),
    )
    .sort(sortByDateAsc);

  const ordersDelayedReturn = filteredOrders
    .filter((o) => {
      if (o.status !== "em_andamento") return false;
      const dataFim = parseDateStringAsLocal(o.data_fim);
      dataFim.setHours(0, 0, 0, 0);
      return dataFim.getTime() < hoje.getTime();
    })
    .sort(sortByDateAsc);

  const ordersAwaitingSignature = filteredOrders
    .filter((o) => o.status === "aguardando_assinatura")
    .sort(sortByIdDesc);
  const ordersAwaitingFinalPayment = filteredOrders
    .filter((o) => o.status === "aguardando_pagamento_final")
    .sort(sortByIdDesc);
  const ordersAbandoned = filteredOrders
    .filter((o) => o.status === "pendente")
    .sort(sortByIdDesc);
  const ordersEmPrejuizo = filteredOrders
    .filter((o) => o.status === "PREJUIZO")
    .sort(sortByIdDesc);
  const finalizedOrders = filteredOrders
    .filter((o) => o.status === "finalizada")
    .sort(sortByIdDesc);
  const cancelledOrders = filteredOrders
    .filter((o) => o.status === "cancelada")
    .sort(sortByIdDesc);
  const ordersAwaitingReturnSignature = filteredOrders
    .filter((o) => o.status === "aguardando_assinatura_devolucao")
    .sort(sortByIdDesc);
  const ordersForReturnInspection = filteredOrders
    .filter((o) => o.status === "em_andamento")
    .sort(sortByDateAsc);

  const qtdePendencias = ordersAwaitingSignature.length + ordersAwaitingReturnSignature.length;

  if (loading)
    return (
      <p style={{ textAlign: "center", padding: "20px", fontSize: "1.2rem" }}>
        A carregar reservas...
      </p>
    );

  const handleSkipInspection = async (orderId: number) => {
    if (
      !window.confirm(
        "Confirmar devolução sem avarias? O pedido irá direto para o pagamento final.",
      )
    )
      return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(
        `http://localhost:3001/api/reservations/${orderId}/skip-inspection`,
        {},
        config,
      );
      alert("Devolução rápida registrada!");
      fetchAllOrders();
    } catch (error: any) {
      alert(
        `Erro: ${error.response?.data?.error || "Não foi possível processar."}`,
      );
    }
  };

  const handleDispatchOrder = async (orderId: number) => {
    if (
      !window.confirm(
        "Confirmar a saída deste pedido para entrega? O cliente será notificado na hora!",
      )
    )
      return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(
        `http://localhost:3001/api/reservations/${orderId}/dispatch`,
        {},
        config,
      );
      alert("🚚 Pedido despachado com sucesso!");
      fetchAllOrders();
    } catch (error: any) {
      alert(
        `Erro: ${error.response?.data?.error || "Não foi possível despachar o pedido."}`,
      );
    }
  };

  const handleConfirmPickup = async (orderId: number) => {
    if (
      !window.confirm(
        "Avisar o cliente que o caminhão está a caminho para recolher?",
      )
    )
      return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(
        `http://localhost:3001/api/reservations/${orderId}/confirm-pickup`,
        {},
        config,
      );
      alert("🚚 Cliente notificado!");
      fetchAllOrders();
    } catch (error: any) {
      alert(`Erro ao confirmar coleta.`);
    }
  };

  // --- RENDERIZADOR DA TABELA BASE ---
  const renderOrderTable = (
    title: string,
    orderList: Order[],
    headers: { key: keyof Order; label: string }[],
    action: (order: Order) => React.ReactNode,
  ) => (
    <div style={{ marginBottom: "3rem", animation: "fadeIn 0.3s ease-in-out" }}>
      <h3
        style={{
          color: "#444",
          borderLeft: "4px solid #007bff",
          paddingLeft: "10px",
          marginBottom: "1rem",
        }}
      >
        {title}{" "}
        <span
          style={{ fontSize: "0.8rem", color: "#888", fontWeight: "normal" }}
        >
          ({orderList.length})
        </span>
      </h3>

      {orderList.length === 0 ? (
        <div
          style={{
            padding: "2rem",
            backgroundColor: "#f8f9fa",
            border: "1px dashed #ccc",
            borderRadius: "8px",
            textAlign: "center",
            color: "#666",
          }}
        >
          Nenhum pedido nesta etapa no momento.
        </div>
      ) : (
        <div
          style={{
            overflowX: "auto",
            border: "1px solid #eee",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "800px",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#f1f3f5",
                  color: "#495057",
                  textTransform: "uppercase",
                  fontSize: "0.85rem",
                }}
              >
                {headers.map((h) => (
                  <th
                    key={h.key}
                    style={{
                      padding: "15px",
                      textAlign: "left",
                      borderBottom: "2px solid #dee2e6",
                    }}
                  >
                    {h.label}
                  </th>
                ))}
                <th
                  style={{ padding: "15px", borderBottom: "2px solid #dee2e6" }}
                >
                  Ação
                </th>
              </tr>
            </thead>
            <tbody>
              {orderList.map((order, index) => {
                const isPrejuizo = order.status === "PREJUIZO";
                return (
                  <tr
                    key={order.id}
                    style={{
                      backgroundColor: isPrejuizo
                        ? "#fff0f0"
                        : index % 2 === 0
                          ? "#fff"
                          : "#fcfcfc",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    {headers.map((header) => {
                      let cellContent: React.ReactNode = order[header.key];

                      if (
                        typeof cellContent === "string" &&
                        header.key.includes("data")
                      ) {
                        cellContent =
                          parseDateStringAsLocal(
                            cellContent,
                          ).toLocaleDateString();
                      } else if (header.key === "status") {
                        const statusText = String(cellContent)
                          .replace(/_/g, " ")
                          .toUpperCase();
                        const color = isPrejuizo
                          ? "#d32f2f"
                          : cellContent === "finalizada"
                            ? "#28a745"
                            : "#495057";
                        const bgBadge = isPrejuizo
                          ? "#ffebee"
                          : cellContent === "finalizada"
                            ? "#e6fffa"
                            : "#e9ecef";
                        cellContent = (
                          <span
                            style={{
                              fontWeight: "bold",
                              color,
                              backgroundColor: bgBadge,
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "0.8rem",
                            }}
                          >
                            {isPrejuizo ? "🚨 " : ""}
                            {statusText}
                          </span>
                        );
                      } else if (header.key === "tipo_entrega") {
                        const texto = String(cellContent || "Não Informado");
                        const isLoja =
                          texto.toLowerCase().includes("loja") ||
                          texto.toLowerCase().includes("retirada");
                        cellContent = (
                          <span
                            style={{
                              color: "#555",
                              fontWeight: "bold",
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            {isLoja ? "🏪 " : "🚚 "} {texto}
                          </span>
                        );
                      } else if (header.key === "id") {
                        cellContent = (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "5px",
                            }}
                          >
                            <span style={{ fontWeight: "bold" }}>
                              #{order.id}
                            </span>
                            {order.solicitou_devolucao &&
                              order.status === "em_andamento" && (
                                <span
                                  style={{
                                    backgroundColor: "#ffc107",
                                    color: "#856404",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontSize: "0.75rem",
                                    fontWeight: "bold",
                                    width: "fit-content",
                                  }}
                                >
                                  🔔 Coleta Solicitada!
                                </span>
                              )}
                          </div>
                        );
                      }

                      return (
                        <td
                          key={header.key}
                          style={{ padding: "15px", color: "#333" }}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                    <td style={{ padding: "15px" }}>{action(order)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const getTabStyle = (isActive: boolean, isAlert: boolean = false) => ({
    padding: "12px 24px",
    border: "none",
    background: isActive ? (isAlert ? "#dc3545" : "#007bff") : "transparent",
    color: isActive ? "#fff" : "#6c757d",
    borderBottom: isActive ? "none" : "3px solid transparent",
    borderTopLeftRadius: "8px",
    borderTopRightRadius: "8px",
    fontWeight: "bold",
    fontSize: "1rem",
    cursor: "pointer",
    transition: "all 0.2s",
    outline: "none",
  });

  return (
    <div style={{ width: "100%", padding: "20px 0" }}>
      
      {/*FILTROS GLOBAIS */}
      <div style={{ display: "flex", gap: "15px", marginBottom: "25px", flexWrap: "wrap", alignItems: "flex-end", backgroundColor: "#f8f9fa", padding: "15px", borderRadius: "8px", border: "1px solid #dee2e6" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#495057" }}>ID do Pedido:</label>
          <input 
            type="text" 
            placeholder="Ex: 12" 
            value={filterId} 
            onChange={(e) => setFilterId(e.target.value)} 
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ced4da", outline: "none", width: "120px" }} 
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#495057" }}>Período (De):</label>
          <input 
            type="date" 
            value={filterStartDate} 
            onChange={(e) => setFilterStartDate(e.target.value)} 
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ced4da", outline: "none" }} 
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#495057" }}>Período (Até):</label>
          <input 
            type="date" 
            value={filterEndDate} 
            onChange={(e) => setFilterEndDate(e.target.value)} 
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ced4da", outline: "none" }} 
          />
        </div>
        {(filterId || filterStartDate || filterEndDate) && (
          <button 
            onClick={() => { setFilterId(""); setFilterStartDate(""); setFilterEndDate(""); }} 
            style={{ padding: "8px 15px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", height: "fit-content", marginBottom: "2px" }}
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {/* MENUS DAS ABAS */}
      <div
        style={{
          display: "flex",
          gap: "5px",
          borderBottom: "3px solid #dee2e6",
          marginBottom: "30px",
          overflowX: "auto",
          paddingBottom: "2px",
        }}
      >
        {(podeGerenciarReservas || podeFazerVistoria) && (
          <button
            onClick={() => setActiveTab("urgentes")}
            style={getTabStyle(activeTab === "urgentes", true)}
          >
            🚨 Urgentes ({ordersDelayed.length + ordersDelayedReturn.length})
          </button>
        )}

        {/* ABA DO CAIXA/PAGAMENTOS */}
        {podeReceberPagamentos && ( 
          <button
            onClick={() => setActiveTab("financeiro")}
            style={getTabStyle(activeTab === "financeiro", ordersEmPrejuizo.length > 0)}
            className={ordersEmPrejuizo.length > 0 ? "piscar-alerta" : ""}
          >
            💲 Caixa & Cobranças ({ordersAwaitingFinalPayment.length + ordersAbandoned.length + ordersEmPrejuizo.length})
          </button>
        )}

        {(podeGerenciarReservas || podeFazerVistoria) && (
          <>
            <button
              onClick={() => setActiveTab("saidas")}
              style={getTabStyle(activeTab === "saidas")}
            >
              🚚 Saídas ({ordersToday.length})
            </button>
            <button
              onClick={() => setActiveTab("devolucoes")}
              style={getTabStyle(activeTab === "devolucoes")}
            >
              🔄 Devoluções ({ordersForReturnInspection.length})
            </button>
            <button
              onClick={() => setActiveTab("pendencias")}
              style={getTabStyle(activeTab === "pendencias")}
            >
              ✍️ Pendências ({qtdePendencias})
            </button>
          </>
        )}

        {podeGerenciarReservas && (
          <button
            onClick={() => setActiveTab("historico")}
            style={getTabStyle(activeTab === "historico")}
          >
            ✅ Histórico
          </button>
        )}
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div className="tab-content">
        {/* ABA: URGENTES */}
        {activeTab === "urgentes" && (
          <>
            {renderOrderTable(
              "🚨 Vistorias de Saída Atrasadas",
              ordersDelayed,
              [
                { key: "id", label: "Pedido ID" },
                { key: "tipo_entrega", label: "Tipo de Entrega" },
                { key: "data_inicio", label: "Data de Saída" },
              ],
              (order) => (
                <Link to={`/admin/vistoria/${order.id}`}>
                  <button
                    style={{
                      backgroundColor: "#dc3545",
                      color: "white",
                      fontWeight: "bold",
                      padding: "8px",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Vistoria Atrasada
                  </button>
                </Link>
              ),
            )}

            {renderOrderTable(
              "⚠️ Devoluções Atrasadas",
              ordersDelayedReturn,
              [
                { key: "id", label: "Pedido ID" },
                { key: "tipo_entrega", label: "Tipo de Entrega" },
                { key: "data_fim", label: "Data de Devolução Original" },
              ],
              (order) => (
                <div
                  style={{ display: "flex", gap: "5px", alignItems: "center" }}
                >
                  {/* BOTÃO PARA MANDAR O CAMINHÃO BUSCAR  */}
                  {order.solicitou_devolucao &&
                    !order.coleta_confirmada &&
                    order.tipo_entrega === "entrega" && (
                      <button
                        onClick={() => handleConfirmPickup(order.id)}
                        style={{
                          backgroundColor: "#17a2b8",
                          color: "white",
                          fontWeight: "bold",
                          padding: "8px",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        }}
                      >
                        🚚 Despachar Coleta
                      </button>
                    )}

                  {/* Botão padrão da tabela de atrasados */}
                  <Link to={`/admin/vistoria/${order.id}?tipo=devolucao`}>
                    <button
                      style={{
                        backgroundColor: "#856404",
                        color: "white",
                        fontWeight: "bold",
                        padding: "8px",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Registrar Retorno com Atraso
                    </button>
                  </Link>
                </div>
              ),
            )}
          </>
        )}

        {/* ABA: SAÍDAS */}
        {activeTab === "saidas" && (
          <>
            {renderOrderTable(
              "Reservas de Hoje (Aguardando Saída)",
              ordersToday,
              [
                { key: "id", label: "Pedido ID" },
                { key: "tipo_entrega", label: "Tipo de Entrega" },
                { key: "data_inicio", label: "Data de Saída" },
              ],
              (order) => (
                <div
                  style={{ display: "flex", gap: "10px", alignItems: "center" }}
                >
                  {/* SÓ MOSTRA O BOTÃO DE LIBERAR*/}
                  {order.status === "aprovada" && (
                    <button
                      onClick={() => handleDispatchOrder(order.id)}
                      style={{
                        backgroundColor:
                          order.tipo_entrega === "entrega"
                            ? "#17a2b8"
                            : "#28a745",
                        color: "white",
                        padding: "8px 12px",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                    >
                      {order.tipo_entrega === "entrega"
                        ? "🚚 Despachar Caminhão"
                        : "✅ Liberar p/ Retirada"}
                    </button>
                  )}

                  {/* SÓ MOSTRA A VISTORIA DEPOIS QUE FOI LIBERADO*/}
                  {order.status === "saiu_para_entrega" && (
                    <>
                      <span
                        style={{
                          color:
                            order.tipo_entrega === "entrega"
                              ? "#007bff"
                              : "#28a745",
                          fontWeight: "bold",
                          fontSize: "0.9rem",
                          padding: "0 5px",
                        }}
                      >
                        {order.tipo_entrega === "entrega"
                          ? "🚚 Em Trânsito"
                          : "✅ Na Loja"}
                      </span>

                      <Link to={`/admin/vistoria/${order.id}`}>
                        <button
                          style={{
                            backgroundColor: "#007bff",
                            color: "white",
                            padding: "8px 12px",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontWeight: "bold",
                          }}
                        >
                          {order.tipo_entrega === "entrega"
                            ? "📋 Fazer Vistoria na Obra"
                            : "🏪 Fazer Vistoria no Loja"}
                        </button>
                      </Link>
                    </>
                  )}
                </div>
              ),
            )}
            {renderOrderTable(
              "Reservas Agendadas",
              ordersFutureScheduled,
              [
                { key: "id", label: "Pedido ID" },
                { key: "tipo_entrega", label: "Tipo de Entrega" },
                { key: "data_inicio", label: "Data de Saída" },
              ],
              () => (
                <button
                  disabled
                  style={{
                    backgroundColor: "#e9ecef",
                    color: "#6c757d",
                    border: "1px solid #ced4da",
                    cursor: "not-allowed",
                    padding: "8px",
                    borderRadius: "4px",
                  }}
                >
                  Aguardando Data
                </button>
              ),
            )}
          </>
        )}

        {/* ABA: DEVOLUÇÕES */}
        {activeTab === "devolucoes" && (
          <>
            {renderOrderTable(
              "Equipamentos em Locação (Aguardando Devolução)",
              ordersForReturnInspection,
              [
                { key: "id", label: "Pedido ID" },
                { key: "tipo_entrega", label: "Tipo de Entrega" },
                { key: "data_fim", label: "Data de Devolução" },
              ],
              (order) => (
                <div
                  style={{ display: "flex", gap: "5px", alignItems: "center" }}
                >
                  {order.solicitou_devolucao &&
                    !order.coleta_confirmada &&
                    order.tipo_entrega === "entrega" && (
                      <button
                        onClick={() => handleConfirmPickup(order.id)}
                        style={{
                          backgroundColor: "#17a2b8",
                          color: "white",
                          fontWeight: "bold",
                          padding: "8px",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        }}
                      >
                        🚚 Despachar Coleta
                      </button>
                    )}

                  <Link to={`/admin/vistoria/${order.id}?tipo=devolucao`}>
                    <button
                      style={{
                        backgroundColor: "#ffc107",
                        color: "#212529",
                        fontWeight: "bold",
                        padding: "8px",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      {order.tipo_entrega === "entrega"
                        ? "🚚 Vistoria de Coleta"
                        : "🏪 Vistoria na Loja"}
                    </button>
                  </Link>

                  {podeGerenciarReservas && (
                    <button
                      onClick={() => handleSkipInspection(order.id)}
                      style={{
                        backgroundColor: "#28a745",
                        color: "white",
                        padding: "8px",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Devolução Rápida (OK)
                    </button>
                  )}
                </div>
              ),
            )}
          </>
        )}

        {/* ABA: PENDÊNCIAS */}
        {(podeGerenciarReservas || podeFazerVistoria) &&
          activeTab === "pendencias" && (
            <>
              {/* TABELA DE ASSINATURA DE SAÍDA */}
              {renderOrderTable(
                "Aguardando Assinatura de Saída (Entrega)",
                ordersAwaitingSignature,
                [
                  { key: "id", label: "Pedido ID" },
                  { key: "status", label: "Status" },
                  { key: "data_inicio", label: "Data de Início" },
                ],
                (order) => (
                  <Link to={`/my-reservations/${order.id}`}>
                    <button
                      style={{
                        backgroundColor: "#17a2b8",
                        color: "white",
                        padding: "8px",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      Coletar Assinatura
                    </button>
                  </Link>
                ),
              )}

              {/* TABELA DE ASSINATURA DE DEVOLUÇÃO*/}
              {renderOrderTable(
                "Aguardando Assinatura de Devolução",
                ordersAwaitingReturnSignature,
                [
                  { key: "id", label: "Pedido ID" },
                  { key: "status", label: "Status" },
                  { key: "data_fim", label: "Data de Devolução" },
                ],
                (order) => (
                  <Link to={`/my-reservations/${order.id}`}>
                    <button
                      style={{
                        backgroundColor: "#28a745",
                        color: "white",
                        padding: "8px",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      Coletar Assinatura Final
                    </button>
                  </Link>
                ),
              )}
            </>
          )}

        {/* ABA: HISTÓRICO*/}
        {podeGerenciarReservas && activeTab === "historico" && (
          <>
            {renderOrderTable(
              "Histórico de Pedidos Finalizados",
              finalizedOrders,
              [
                { key: "id", label: "Pedido ID" },
                { key: "data_fim", label: "Data de Finalização" },
              ],
              (order) => (
                <Link to={`/my-reservations/${order.id}`}>
                  <button
                    style={{
                      border: "1px solid #ccc",
                      background: "white",
                      color: "#333",
                      fontWeight: "bold",
                      padding: "8px",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Ver Completo
                  </button>
                </Link>
              ),
            )}

            {renderOrderTable(
              "Histórico de Pedidos Cancelados",
              cancelledOrders,
              [
                { key: "id", label: "Pedido ID" },
                { key: "status", label: "Status" },
              ],
              (order) => (
                <Link to={`/my-reservations/${order.id}`}>
                  <button
                    style={{
                      border: "1px solid #ccc",
                      background: "white",
                      color: "#333",
                      fontWeight: "bold",
                      padding: "8px",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Ver Motivo
                  </button>
                </Link>
              ),
            )}
          </>
        )}

        {/* ABA: FINANCEIRO */}
        {podeReceberPagamentos && activeTab === "financeiro" && ( 
          <>
            {/* SINAL PENDENTE */}
            {renderOrderTable(
              "Retenção: Clientes no Checkout (Pagamento do Sinal Pendente)",
              ordersAbandoned,
              [
                { key: "id", label: "Pedido ID" },
                { key: "data_inicio", label: "Criado em (Data Saída)" },
              ],
              (order) => (
                <Link to={`/my-reservations/${order.id}`}>
                  <button
                    style={{
                      backgroundColor: "#fd7e14",
                      color: "white",
                      fontWeight: "bold",
                      padding: "8px",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Resgatar Venda
                  </button>
                </Link>
              ),
            )}

            {/* PAGAMENTO FINAL PENDENTE */}
            {renderOrderTable(
              "Reservas Aguardando Pagamento Final (Pós-Vistoria)",
              ordersAwaitingFinalPayment,
              [
                { key: "id", label: "Pedido ID" },
                { key: "status", label: "Status" },
              ],
              (order) => (
                <Link to={`/admin/finalize-payment/${order.id}`}>
                  <button
                    style={{
                      backgroundColor: "#28a745",
                      color: "white",
                      fontWeight: "bold",
                      padding: "8px",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Finalizar e Cobrar
                  </button>
                </Link>
              ),
            )}

            {/* DÍVIDAS ATIVAS (Prejuízos e Avarias) */}
            {ordersEmPrejuizo.length > 0 && (
              <div
                style={{
                  backgroundColor: "#fff5f5",
                  border: "1px solid #dc3545",
                  borderLeft: "6px solid #dc3545",
                  padding: "15px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  marginTop: "20px"
                }}
              >
                <h3 style={{ margin: "0 0 5px 0", color: "#c62828" }}>
                  ⚠️ Clientes com Dívida Ativa
                </h3>
                <p style={{ margin: 0, color: "#333" }}>
                  Estes pedidos foram encerrados com pendências financeiras
                  (Avarias, multas, ou perda de equipamento). O cliente precisa
                  regularizar a situação.
                </p>
              </div>
            )}
            
            {renderOrderTable(
              "Aguardando Pagamento do Prejuízo/Multa",
              ordersEmPrejuizo,
              [
                { key: "id", label: "Pedido ID" },
                { key: "status", label: "Status Financeiro" },
                { key: "data_fim", label: "Data do Sinistro" },
              ],
              (order) => (
                <Link to={`/my-reservations/${order.id}`}>
                  <button
                    style={{
                      backgroundColor: "#c62828",
                      color: "white",
                      fontWeight: "bold",
                      padding: "10px 15px",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      boxShadow: "0 2px 4px rgba(198,40,40,0.3)",
                    }}
                  >
                    💰 Receber Dívida
                  </button>
                </Link>
              ),
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminReservationsList;