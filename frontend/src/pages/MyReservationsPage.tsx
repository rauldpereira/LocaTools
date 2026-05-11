import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { parseDateStringAsLocal } from "../utils/dateUtils";
import { Package } from "lucide-react";

interface ItemReserva {
  id: number;
  Unidade: {
    Equipamento: {
      nome: string;
    };
  };
}

interface Order {
  id: number;
  status:
    | "pendente"
    | "aprovada"
    | "saiu_para_entrega"
    | "aguardando_assinatura"
    | "em_andamento"
    | "cancelada"
    | "finalizada"
    | "aguardando_pagamento_final"
    | "PREJUIZO"
    | "aguardando_assinatura_devolucao";
  data_inicio: string;
  data_fim: string;
  valor_total: string;
  taxa_cancelamento?: string;
  valor_reembolsado?: string;
  updatedAt?: string;
  tipo_entrega?: string;
  ItemReservas?: ItemReserva[];
}

const SkeletonCard = () => (
  <div style={{
    border: "1px solid #edf2f7",
    padding: "1.5rem",
    marginBottom: "1rem",
    borderRadius: "12px",
    backgroundColor: "#fff",
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
      <div className="skeleton" style={{ height: "24px", width: "120px", borderRadius: "4px" }}></div>
      <div className="skeleton" style={{ height: "24px", width: "150px", borderRadius: "12px" }}></div>
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
      <div>
        <div className="skeleton" style={{ height: "16px", width: "100px", marginBottom: "8px", borderRadius: "4px" }}></div>
        <div className="skeleton" style={{ height: "16px", width: "100px", borderRadius: "4px" }}></div>
      </div>
      <div className="skeleton" style={{ height: "24px", width: "80px", borderRadius: "4px", alignSelf: "flex-end" }}></div>
    </div>
  </div>
);

const MyReservationsPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("updated_desc");

  // --- FIDELIDADE ---
  const [loyaltyConfig, setLoyaltyConfig] = useState<{ num: number, pct: number, ativo: boolean } | null>(null);

  useEffect(() => {
    const fetchLoyaltyConfig = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/config`);
        if (data) {
          setLoyaltyConfig({
            num: data.fidelidade_num_pedidos,
            pct: parseFloat(data.fidelidade_desconto_pct),
            ativo: !!data.fidelidade_ativo
          });
        }
      } catch (error) {
        // Ignorar o log de erro no console
      }
    };
    fetchLoyaltyConfig();
  }, []);

  const validOrders = orders.filter(o => o.status !== 'cancelada');
  const totalValidos = validOrders.length;
  
  // Quantos pedidos ele já fez no ciclo atual
  const progressoNoCiclo = loyaltyConfig ? totalValidos % loyaltyConfig.num : 0;
  const faltamParaDesconto = loyaltyConfig ? loyaltyConfig.num - progressoNoCiclo : 0;
  const pctBarra = loyaltyConfig ? (progressoNoCiclo / loyaltyConfig.num) * 100 : 0;


  const cancellableStatuses = ["aprovada", "aguardando_assinatura"];

  const fetchOrders = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/reservations/my`,
        config,
      );
      setOrders(data);
    } catch (error) {
      // Falha silenciosa
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<number | null>(null);
  const [cancelResult, setCancelResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const requestCancelOrder = (orderId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOrderToCancel(orderId);
  };

  const confirmCancelOrder = async () => {
    if (orderToCancel === null) return;
    
    setCancellingId(orderToCancel);
    setOrderToCancel(null);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/reservations/${orderToCancel}/cancel`,
        {},
        config,
      );
      setCancelResult({ type: 'success', message: data.message || "Reserva cancelada com sucesso!" });
      fetchOrders();
    } catch (error: any) {
      setCancelResult({ type: 'error', message: error.response?.data?.error || "Não foi possível cancelar a reserva." });
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusStyle = (status: Order["status"]) => {
    switch (status) {
      case "aprovada":
      case "em_andamento":
        return { color: "green", fontWeight: "bold" };
      case "saiu_para_entrega":
        return { color: "#007bff", fontWeight: "bold" };
      case "pendente":
      case "aguardando_assinatura":
        return { color: "orange", fontWeight: "bold" };
      case "cancelada":
        return { color: "red", fontWeight: "bold" };
      default:
        return { color: "grey" };
    }
  };

  const processedOrders = orders
    .filter((order) => {
      const search = searchTerm.toLowerCase();
      const idMatch = order.id.toString().includes(search);
      const dateMatch = parseDateStringAsLocal(order.data_inicio)
        .toLocaleDateString()
        .includes(search);
      const itemsMatch = order.ItemReservas?.some((item) =>
        item.Unidade?.Equipamento?.nome.toLowerCase().includes(search)
      );
      return idMatch || dateMatch || itemsMatch;
    })
    .sort((a, b) => {
      if (sortBy === "updated_desc") {
        return (
          new Date(b.updatedAt || 0).getTime() -
          new Date(a.updatedAt || 0).getTime()
        );
      }
      if (sortBy === "updated_asc") {
        return (
          new Date(a.updatedAt || 0).getTime() -
          new Date(b.updatedAt || 0).getTime()
        );
      }

      if (sortBy === "id_desc") return b.id - a.id;
      if (sortBy === "id_asc") return a.id - b.id;

      const dateA = new Date(a.data_inicio).getTime();
      const dateB = new Date(b.data_inicio).getTime();
      if (sortBy === "date_asc") return dateA - dateB;
      if (sortBy === "date_desc") return dateB - dateA;

      return 0;
    });

  if (loading)
    return (
      <div
        style={{
          padding: "2rem",
          marginTop: "60px",
          maxWidth: "800px",
          margin: "80px auto",
        }}
      >
        <h1 style={{ marginBottom: "20px" }}>Minhas Reservas</h1>
        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
      </div>
    );

  return (
    <div
      style={{
        padding: "2rem",
        marginTop: "60px",
        maxWidth: "800px",
        margin: "80px auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <h1 style={{ margin: 0 }}>Minhas Reservas</h1>

        {/* BARRA DE CONTROLES */}
        {orders.length > 0 && (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Buscar por ID, data ou equipamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "10px 15px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                minWidth: "450px",
                outline: "none",
                fontSize: "0.95rem"
              }}
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: "10px 15px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                backgroundColor: "white",
                outline: "none",
                fontSize: "0.95rem",
                cursor: "pointer"
              }}
            >
              <option value="updated_desc">Mais recentes primeiro</option>
              <option value="updated_asc">Mais antigas primeiro</option>
              <option value="date_asc">Data da Locação Crescente</option>
              <option value="date_desc">Data da Locação Decrescente</option>
              <option value="id_desc">Maior ID</option>
              <option value="id_asc">Menor ID</option>
            </select>
          </div>
        )}
      </div>

      {/* CARD DE FIDELIDADE */}
      {loyaltyConfig && loyaltyConfig.ativo && orders.length > 0 && (
        <div style={{
          backgroundColor: "#fff",
          padding: "20px",
          borderRadius: "12px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
          border: "1px solid #e0e0e0",
          marginBottom: "25px",
          backgroundImage: "linear-gradient(to right, #ffffff, #f8f9fa)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h3 style={{ margin: 0, color: "#2c3e50", display: "flex", alignItems: "center", gap: "8px" }}>
              Programa de Fidelidade
            </h3>
            <span style={{ fontSize: "0.9rem", color: "#666", fontWeight: "bold" }}>
              {progressoNoCiclo} / {loyaltyConfig.num} pedidos
            </span>
          </div>
          
          <div style={{ 
            width: "100%", 
            height: "12px", 
            backgroundColor: "#eee", 
            borderRadius: "10px", 
            overflow: "hidden",
            marginBottom: "15px",
            border: "1px solid #ddd"
          }}>
            <div style={{ 
              width: `${pctBarra}%`, 
              height: "100%", 
              backgroundColor: pctBarra === 100 ? "#28a745" : "#007bff",
              transition: "width 0.5s ease-in-out"
            }} />
          </div>

          <p style={{ margin: 0, color: "#555", fontSize: "0.95rem" }}>
            {faltamParaDesconto > 0 ? (
              <>
                Faltam apenas <strong>{faltamParaDesconto}</strong> {faltamParaDesconto === 1 ? 'pedido' : 'pedidos'} para você ganhar 
                <span style={{ color: "#28a745", fontWeight: "bold" }}> {loyaltyConfig.pct}% de desconto</span> no seu próximo aluguel!
              </>
            ) : (
              <span style={{ color: "#28a745", fontWeight: "bold" }}>
                🎉 Parabéns! Seu próximo pedido terá {loyaltyConfig.pct}% de desconto automático!
              </span>
            )}
          </p>
        </div>
      )}

      {orders.length === 0 ? (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            backgroundColor: "#f8fafc",
            borderRadius: "12px",
            border: "1px dashed #cbd5e1",
          }}
        >
          <p style={{ fontSize: "1.2rem", color: "#64748b", marginBottom: "15px" }}>
            Você ainda não fez nenhuma reserva.
          </p>
          <Link
            to="/"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              backgroundColor: "#0056b3",
              color: "white",
              textDecoration: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              transition: "background-color 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#004494"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#0056b3"}
          >
            🚜 Alugar Equipamentos
          </Link>
        </div>
      ) : processedOrders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #edf2f7" }}>
          <p style={{ color: "#718096", fontSize: "1.1rem", margin: 0 }}>
            Nenhuma reserva encontrada para a sua busca.
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {processedOrders.map((order) => (
            <li
              key={order.id}
              style={{
                border: "1px solid #edf2f7",
                padding: "1.5rem",
                marginBottom: "1.2rem",
                borderRadius: "16px",
                backgroundColor: "#fff",
                boxShadow: "0 4px 6px rgba(0,0,0,0.02)",
                transition: "box-shadow 0.2s, transform 0.2s",
                display: "flex",
                flexDirection: "column"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 15px rgba(0,0,0,0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.02)";
              }}
            >
              <Link
                to={`/my-reservations/${order.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "block",
                  flex: 1
                }}
              >

                {(() => {
                  let badgeText = order.status.replace(/_/g, " ").toUpperCase();
                  let badgeColor = getStatusStyle(order.status).color;
                  let badgeBg = "#f8f9fa";

                  if (order.status === "aprovada") {
                    badgeColor = "#d97706";
                    badgeBg = "#fef3c7";
                    badgeText =
                      order.tipo_entrega === "entrega"
                        ? "AGENDADA PARA ENTREGA"
                        : "AGENDADA PARA RETIRADA";
                  } else if (order.status === "saiu_para_entrega") {
                    if (order.tipo_entrega === "entrega") {
                      badgeColor = "#0056b3";
                      badgeBg = "#e7f1ff";
                      badgeText = "EM TRÂNSITO";
                    } else {
                      badgeColor = "#2b8a3e"; 
                      badgeBg = "#ebfbee";
                      badgeText = "PRONTO PARA RETIRADA";
                    }
                  }

                  return (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: "1px solid #f1f5f9",
                        paddingBottom: "12px",
                        marginBottom: "15px",
                      }}
                    >
                      <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1.3rem" }}>
                        Pedido #{order.id}
                      </h3>
                      <span
                        style={{
                          color: badgeColor,
                          backgroundColor: badgeBg,
                          padding: "6px 14px",
                          borderRadius: "20px",
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                          letterSpacing: "0.5px",
                          border: `1px solid ${badgeColor}33`,
                        }}
                      >
                        {badgeText}
                      </span>
                    </div>
                  );
                })()}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#475569",
                    fontSize: "0.95rem",
                    marginBottom: "15px"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <span>
                        <strong>Saída:</strong>{" "}
                        {parseDateStringAsLocal(order.data_inicio).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>
                        <strong>Retorno:</strong>{" "}
                        {parseDateStringAsLocal(order.data_fim).toLocaleDateString()}
                      </span>
                    </div>
                    {order.ItemReservas && order.ItemReservas.length > 0 && (
                      <div style={{ marginTop: "10px" }}>
                        <strong style={{ fontSize: "0.9rem" }}>Itens:</strong>
                        <ul style={{ margin: "4px 0 0 0", paddingLeft: "18px", fontSize: "0.85rem", color: "#64748b" }}>
                          {order.ItemReservas.map(item => (
                             <li key={item.id}>{item.Unidade?.Equipamento?.nome}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", alignSelf: "center" }}>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>Valor Total</p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "1.4rem",
                        color: "#0f172a",
                        fontWeight: "800"
                      }}
                    >
                      R$ {Number(order.valor_total).toFixed(2)}
                    </p>
                  </div>
                </div>
              </Link>

              {order.status === "cancelada" && (
                <div
                  style={{
                    marginTop: "10px",
                    backgroundColor: "#fef2f2",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #fee2e2",
                    fontSize: "0.9rem"
                  }}
                >
                  {Number(order.taxa_cancelamento) > 0 && (
                    <div style={{ color: "#991b1b", display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <strong>Taxa de Cancelamento:</strong> 
                      <span>R$ {Number(order.taxa_cancelamento).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ color: "#166534", display: "flex", justifyContent: "space-between" }}>
                    <strong>Valor Reembolsado:</strong> 
                    <span>R$ {Number(order.valor_reembolsado).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "15px", paddingTop: "15px", borderTop: "1px solid #f1f5f9" }}>
                <Link
                  to={`/my-reservations/${order.id}`}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    backgroundColor: "#f8fafc",
                    color: "#334155",
                    border: "1px solid #e2e8f0",
                    padding: "10px 15px",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontWeight: "600",
                    fontSize: "0.9rem",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#f1f5f9";
                    e.currentTarget.style.color = "#0f172a";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                    e.currentTarget.style.color = "#334155";
                  }}
                >
                  Ver Detalhes do Pedido
                </Link>

                {cancellableStatuses.includes(order.status) && (
                  <button
                    onClick={(e) => requestCancelOrder(order.id, e)}
                    disabled={cancellingId === order.id}
                    style={{
                      flex: 1,
                      backgroundColor: cancellingId === order.id ? "#f1f5f9" : "#fff",
                      color: cancellingId === order.id ? "#94a3b8" : "#ef4444",
                      border: `1px solid ${cancellingId === order.id ? "#e2e8f0" : "#fca5a5"}`,
                      padding: "10px 15px",
                      borderRadius: "8px",
                      cursor: cancellingId === order.id ? "wait" : "pointer",
                      fontWeight: "600",
                      fontSize: "0.9rem",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (cancellingId !== order.id) {
                        e.currentTarget.style.backgroundColor = "#fef2f2";
                        e.currentTarget.style.borderColor = "#ef4444";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (cancellingId !== order.id) {
                        e.currentTarget.style.backgroundColor = "#fff";
                        e.currentTarget.style.borderColor = "#fca5a5";
                      }
                    }}
                  >
                    {cancellingId === order.id ? "Aguarde..." : "Cancelar Reserva"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO */}
      {orderToCancel !== null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '30px', borderRadius: '16px',
            width: '90%', maxWidth: '450px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            textAlign: 'center', animation: 'slideUp 0.3s ease-out'
          }}>
            <style>{`
              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
              @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
            
            <div style={{ backgroundColor: '#fee2e2', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>

            <h2 style={{ color: '#1e293b', margin: '0 0 15px 0', fontSize: '1.4rem' }}>Deseja mesmo cancelar?</h2>
            
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '15px' }}>
              Ao confirmar, o seu pedido <strong>#{orderToCancel}</strong> será cancelado permanentemente.
            </p>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '15px', borderRadius: '8px', marginBottom: '25px', textAlign: 'left', fontSize: '0.85rem', color: '#64748b' }}>
              <strong style={{ color: '#475569', display: 'block', marginBottom: '5px' }}>Sobre o Reembolso:</strong>
              Caso o pagamento já tenha sido aprovado, o estorno do valor (descontando eventuais taxas previstas na política de cancelamento) poderá levar alguns dias para aparecer na fatura, conforme os prazos da administradora do cartão de crédito.
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setOrderToCancel(null)}
                style={{ flex: 1, padding: '12px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Não, voltar
              </button>
              <button 
                onClick={confirmCancelOrder}
                style={{ flex: 1, padding: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Sim, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CARREGAMENTO (SPINNER) */}
      {cancellingId !== null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="spinner" style={{ width: '50px', height: '50px', borderLeftColor: '#ef4444', marginBottom: '20px' }}></div>
          <p style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>Cancelando reserva...</p>
        </div>
      )}

      {/* MODAL DE RESULTADO DO CANCELAMENTO */}
      {cancelResult !== null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '30px', borderRadius: '16px',
            width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            textAlign: 'center', animation: 'slideUp 0.3s ease-out'
          }}>
            <div style={{ 
              backgroundColor: cancelResult.type === 'success' ? '#dcfce7' : '#fee2e2', 
              width: '60px', height: '60px', borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' 
            }}>
              {cancelResult.type === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              )}
            </div>

            <h2 style={{ color: '#1e293b', margin: '0 0 15px 0', fontSize: '1.4rem' }}>
              {cancelResult.type === 'success' ? 'Cancelamento Concluído' : 'Erro no Cancelamento'}
            </h2>
            
            <p style={{ color: '#475569', fontSize: '1rem', lineHeight: '1.5', marginBottom: '25px' }}>
              {cancelResult.message}
            </p>

            <button 
              onClick={() => setCancelResult(null)}
              style={{ width: '100%', padding: '12px', backgroundColor: cancelResult.type === 'success' ? '#16a34a' : '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              OK, Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyReservationsPage;
