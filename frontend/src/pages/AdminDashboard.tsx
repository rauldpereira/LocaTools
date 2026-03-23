import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import EquipmentForm from "../components/Admin/EquipmentForm";
import AddCategoryForm from "../components/Admin/AddCategoryForm";
import EquipmentList from "../components/Admin/EquipmentList";
import AdminReservationsList from "../components/Admin/AdminReservationsList";
import AdminHorariosPage from "../components/HorarioFuncionamento";
import AdminReportsPage from "../pages/AdminReportsPage";
import MaintenanceDashboard from "../components/MaintenanceDashboard";
import AdminFreightConfig from "../pages/AdminFreightConfig";
import AdminCalendarPage from "../components/Admin/GerenciamentoCalendario";
import AdminTeamPage from "../components/Admin/AdminTeamPage";
import EquipamentosEmLocacao from "../components/Admin/EquipamentosEmLocacao";

const Icons = {
  dashboard: "📊",
  reservas: "📅",
  frete: "🚚",
  equipamentos: "🚜",
  equipe: "👥",
  categorias: "🏷️",
  horarios: "⏰",
  calendario: "📆",
  relatorios: "📈",
};

const AdminDashboard: React.FC = () => {
  const { isLoggedIn, user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState("vazio");

  // Ajusta a aba inicial dependendo do que o cara tem permissão de ver
  useEffect(() => {
    if (
      hasPermission("gerenciar_reservas") || 
      hasPermission("fazer_vistoria") || 
      hasPermission("receber_pagamentos")
    )
      setActiveTab("reservas");
    else if (hasPermission("gerenciar_estoque")) setActiveTab("equipamentos");
    else if (hasPermission("configuracoes")) setActiveTab("frete");
    else if (hasPermission("ver_financeiro")) setActiveTab("relatorios"); 
  }, [user]);

  // Se não tá logado, ou não é nem admin, nem funcionário
  if (
    !isLoggedIn ||
    (user?.tipo_usuario !== "admin" && user?.tipo_usuario !== "funcionario")
  ) {
    return (
      <div
        style={{
          padding: "2rem",
          marginTop: "60px",
          textAlign: "center",
          color: "#333",
        }}
      >
        <h2>Acesso Negado</h2>
        <p>Esta área é restrita a colaboradores da empresa.</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "reservas":
        return hasPermission("gerenciar_reservas") ||
          hasPermission("fazer_vistoria") ||
          hasPermission("receber_pagamentos") ? (
          <div style={contentContainerStyle}>
            <h2 style={headerStyle}>Gerenciamento de Reservas e Vistorias</h2>
            <AdminReservationsList />
          </div>
        ) : null;
      case "frete":
        return hasPermission("configuracoes") ? (
          <div style={contentContainerStyle}>
            <AdminFreightConfig />
          </div>
        ) : null;
      case "equipamentos":
        return hasPermission("gerenciar_estoque") ? (
          <div style={contentContainerStyle}>
            <div
              style={{
                marginBottom: "25px",
                borderBottom: "1px solid #eee",
                paddingBottom: "15px",
              }}
            >
              <h2
                style={{
                  ...headerStyle,
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                Gestão de Equipamentos
              </h2>
            </div>

            <div style={{ marginBottom: "30px" }}>
              <MaintenanceDashboard />
            </div>

            {/* EQUIPAMENTOS EM LOCAÇÃO */}
            <div
              style={{
                marginBottom: "30px",
                padding: "25px",
                backgroundColor: "#fff",
                borderRadius: "12px",
                boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                border: "1px solid #f0f0f0",
              }}
            >
              <h4
                style={{
                  marginTop: 0,
                  marginBottom: "20px",
                  color: "#0d47a1",
                  borderBottom: "2px solid #e3f2fd",
                  paddingBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                🚜 Equipamentos Atualmente em Locação
              </h4>
              <EquipamentosEmLocacao />
            </div>

            <div
              style={{
                marginBottom: "30px",
                padding: "25px",
                backgroundColor: "#fff",
                borderRadius: "12px",
                boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                border: "1px solid #f0f0f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    color: "#007bff",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  Cadastrar Novo Equipamento
                </h4>
              </div>

              <div
                style={{
                  backgroundColor: "#f8f9fa",
                  padding: "20px",
                  borderRadius: "8px",
                  border: "1px dashed #dee2e6",
                }}
              >
                <EquipmentForm />
              </div>
            </div>

            <div
              style={{
                padding: "25px",
                backgroundColor: "#fff",
                borderRadius: "12px",
                boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                border: "1px solid #f0f0f0",
              }}
            >
              <h4
                style={{
                  marginTop: 0,
                  marginBottom: "20px",
                  color: "#333",
                  borderBottom: "2px solid #eee",
                  paddingBottom: "10px",
                }}
              >
                Inventário Completo
              </h4>
              <EquipmentList />
            </div>
          </div>
        ) : null;
      case "equipe":
        return user?.tipo_usuario === "admin" ? (
          <div style={contentContainerStyle}>
            <AdminTeamPage />
          </div>
        ) : null;
      case "categorias":
        return hasPermission("gerenciar_estoque") ? (
          <div style={contentContainerStyle}>
            <h2 style={headerStyle}>Categorias do Sistema</h2>
            <div
              style={{
                marginBottom: "2rem",
                padding: "1.5rem",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
              }}
            >
              <AddCategoryForm />
            </div>
          </div>
        ) : null;
      case "horarios":
        return hasPermission("configuracoes") ? (
          <div style={contentContainerStyle}>
            <h2 style={headerStyle}>Horários de Funcionamento</h2>
            <div
              style={{
                padding: "1.5rem",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
              }}
            >
              <AdminHorariosPage />
            </div>
          </div>
        ) : null;
      case "calendario":
        return hasPermission("configuracoes") ? (
          <div style={contentContainerStyle}>
            <h2 style={headerStyle}>Calendário e Feriados</h2>
            <AdminCalendarPage />
          </div>
        ) : null;
      case "relatorios":
        return hasPermission("ver_financeiro") ? <AdminReportsPage /> : null;
      default:
        return (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <h2>Bem-vindo ao Painel!</h2>
            <p>Selecione uma opção no menu ao lado.</p>
          </div>
        );
    }
  };

  return (
    <div style={layoutStyle}>
      <aside style={sidebarStyle}>
        <div style={{ padding: "20px", borderBottom: "1px solid #f0f0f0" }}>
          <h3 style={{ color: "#333", margin: 0, fontSize: "1.2rem" }}>
            Painel Interno
          </h3>
          <p
            style={{ color: "#888", fontSize: "0.85rem", margin: "5px 0 0 0" }}
          >
            Olá, {user?.nome}
          </p>
        </div>

        <nav style={{ marginTop: "10px", padding: "10px" }}>
          
          {(hasPermission("gerenciar_reservas") ||
            hasPermission("fazer_vistoria") ||
            hasPermission("receber_pagamentos")) && (
            <MenuItem
              label="Reservas & Pedidos"
              icon={Icons.reservas}
              isActive={activeTab === "reservas"}
              onClick={() => setActiveTab("reservas")}
            />
          )}

          {hasPermission("configuracoes") && (
            <MenuItem
              label="Config. Frete"
              icon={Icons.frete}
              isActive={activeTab === "frete"}
              onClick={() => setActiveTab("frete")}
            />
          )}

          {hasPermission("gerenciar_estoque") && (
            <>
              <MenuItem
                label="Equipamentos"
                icon={Icons.equipamentos}
                isActive={activeTab === "equipamentos"}
                onClick={() => setActiveTab("equipamentos")}
              />
              <MenuItem
                label="Categorias"
                icon={Icons.categorias}
                isActive={activeTab === "categorias"}
                onClick={() => setActiveTab("categorias")}
              />
            </>
          )}

          {user?.tipo_usuario === "admin" && (
            <MenuItem
              label="Funcionários"
              icon={Icons.equipe}
              isActive={activeTab === "equipe"}
              onClick={() => setActiveTab("equipe")}
            />
          )}

          {hasPermission("configuracoes") && (
            <>
              <MenuItem
                label="Horários"
                icon={Icons.horarios}
                isActive={activeTab === "horarios"}
                onClick={() => setActiveTab("horarios")}
              />
              <MenuItem
                label="Calendário"
                icon={Icons.calendario}
                isActive={activeTab === "calendario"}
                onClick={() => setActiveTab("calendario")}
              />
            </>
          )}

          {hasPermission("ver_financeiro") && (
            <>
              <div
                style={{ margin: "10px 0", borderTop: "1px solid #f0f0f0" }}
              ></div>
              <MenuItem
                label="Relatórios & B.O."
                icon={Icons.relatorios}
                isActive={activeTab === "relatorios"}
                onClick={() => setActiveTab("relatorios")}
              />
            </>
          )}
        </nav>
      </aside>

      <main style={mainContentStyle}>{renderContent()}</main>
    </div>
  );
};

const MenuItem = ({ label, icon, isActive, onClick }: any) => (
  <button
    onClick={onClick}
    style={{
      ...menuItemStyle,
      backgroundColor: isActive ? "#e6f7ff" : "transparent",
      color: isActive ? "#007bff" : "#555",
      fontWeight: isActive ? "bold" : "normal",
    }}
  >
    <span style={{ marginRight: "12px", fontSize: "1.2rem" }}>{icon}</span>
    {label}
  </button>
);

const layoutStyle: React.CSSProperties = {
  display: "flex",
  minHeight: "100vh",
  backgroundColor: "#f4f6f8",
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  paddingTop: "60px",
  boxSizing: "border-box",
};

const sidebarStyle: React.CSSProperties = {
  width: "260px",
  backgroundColor: "#ffffff",
  borderRight: "1px solid #e0e0e0",
  display: "flex",
  flexDirection: "column",
  position: "fixed",
  height: "100%",
  left: 0,
  top: 0,
  paddingTop: "80px",

  overflowY: "auto",
  zIndex: 10,
};

const mainContentStyle: React.CSSProperties = {
  flex: 1,
  marginLeft: "260px",
  padding: "2rem",
  overflowY: "auto",
};

const contentContainerStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  padding: "2rem",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  minHeight: "80vh",
};

const headerStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: "1.5rem",
  color: "#2c3e50",
  borderBottom: "2px solid #f4f6f8",
  paddingBottom: "10px",
  fontSize: "1.5rem",
};

const menuItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  width: "100%",
  padding: "12px 15px",
  border: "none",
  borderRadius: "8px",
  fontSize: "0.95rem",
  cursor: "pointer",
  textAlign: "left",
  marginBottom: "5px",
  transition: "all 0.2s",
};

export default AdminDashboard;