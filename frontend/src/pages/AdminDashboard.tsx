import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import EquipmentForm from "../components/Admin/EquipmentForm";
import AddCategoryForm from "../components/Admin/AddCategoryForm";
import EquipmentList from "../components/Admin/EquipmentList";
import AdminReservationsList from "../components/Admin/AdminReservationsList";
import AdminHorariosPage from "../components/HorarioFuncionamento";
import AdminReportsPage from "../pages/AdminReportsPage";
import MaintenanceDashboard from "../components/MaintenanceDashboard";
import AdminStoreConfig from "../pages/AdminStoreConfig";
import AdminCalendarPage from "../components/Admin/GerenciamentoCalendario";
import AdminTeamPage from "../components/Admin/AdminTeamPage";
import EquipamentosEmLocacao from "../components/Admin/EquipamentosEmLocacao";
import "../styles/AdminDashboard.css";

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
  config: "⚙️",
};

const AdminDashboard: React.FC = () => {
  const { isLoggedIn, user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState("vazio");
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  useEffect(() => {
    if (
      hasPermission("gerenciar_reservas") || 
      hasPermission("fazer_vistoria") || 
      hasPermission("receber_pagamentos")
    )
      setActiveTab("reservas");
    else if (hasPermission("gerenciar_estoque")) setActiveTab("equipamentos");
    else if (hasPermission("configuracoes")) setActiveTab("config");
    else if (hasPermission("ver_financeiro")) setActiveTab("relatorios"); 
  }, [user]);

  if (
    !isLoggedIn ||
    (user?.tipo_usuario !== "admin" && user?.tipo_usuario !== "funcionario")
  ) {
    return (
      <div style={{ padding: "2rem", marginTop: "60px", textAlign: "center", color: "#333" }}>
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
          <div className="admin-content-container">
            <h2 className="admin-header">Gerenciamento de Reservas e Vistorias</h2>
            <AdminReservationsList />
          </div>
        ) : null;
      case "equipamentos":
        return hasPermission("gerenciar_estoque") ? (
          <div className="admin-content-container">
            <div style={{ marginBottom: "25px", borderBottom: "1px solid #eee", paddingBottom: "15px" }}>
              <h2 className="admin-header admin-header-flex" style={{ margin: 0 }}>
                Gestão de Equipamentos
              </h2>
            </div>

            <div style={{ marginBottom: "30px" }}>
              <MaintenanceDashboard />
            </div>

            <div style={{ marginBottom: "30px", padding: "25px", backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", border: "1px solid #f0f0f0" }}>
              <h4 style={{ marginTop: 0, marginBottom: "20px", color: "#0d47a1", borderBottom: "2px solid #e3f2fd", paddingBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                🚜 Equipamentos em Locação
              </h4>
              <EquipamentosEmLocacao />
            </div>

            <div style={{ marginBottom: "30px", padding: "25px", backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", border: "1px solid #f0f0f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h4 style={{ margin: 0, color: "#007bff", display: "flex", alignItems: "center", gap: "8px" }}>
                  Cadastrar Novo Equipamento
                </h4>
              </div>
              <div style={{ backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "8px", border: "1px dashed #dee2e6" }}>
                <EquipmentForm />
              </div>
            </div>

            <div style={{ padding: "25px", backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", border: "1px solid #f0f0f0" }}>
              <h4 style={{ marginTop: 0, marginBottom: "20px", color: "#333", borderBottom: "2px solid #eee", paddingBottom: "10px" }}>
                Inventário Completo
              </h4>
              <EquipmentList />
            </div>
          </div>
        ) : null;
      case "equipe":
        return user?.tipo_usuario === "admin" ? (
          <div className="admin-content-container">
            <AdminTeamPage />
          </div>
        ) : null;
      case "categorias":
        return hasPermission("gerenciar_estoque") ? (
          <div className="admin-content-container">
            <h2 className="admin-header">Categorias do Sistema</h2>
            <div style={{ marginBottom: "2rem", padding: "1.5rem", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
              <AddCategoryForm />
            </div>
          </div>
        ) : null;
      case "horarios":
        return hasPermission("configuracoes") ? (
          <div className="admin-content-container">
            <h2 className="admin-header">Horários de Funcionamento</h2>
            <div style={{ padding: "1.5rem", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
              <AdminHorariosPage />
            </div>
          </div>
        ) : null;
      case "calendario":
        return hasPermission("configuracoes") ? (
          <div className="admin-content-container">
            <h2 className="admin-header">Calendário e Feriados</h2>
            <AdminCalendarPage />
          </div>
        ) : null;
      case "relatorios":
        return hasPermission("ver_financeiro") ? <AdminReportsPage /> : null;
      case "config":
        return hasPermission("configuracoes") ? (
          <div className="admin-content-container">
            <AdminStoreConfig />
          </div>
        ) : null;
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
    <div className="admin-layout">
      <aside className={`admin-sidebar ${!isSidebarExpanded ? 'collapsed' : ''}`}>
        <div className={`admin-sidebar-header ${!isSidebarExpanded ? 'collapsed' : ''}`}>
          <button 
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            className="admin-toggle-btn"
            title={isSidebarExpanded ? "Recolher menu" : "Expandir menu"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>

          {isSidebarExpanded && (
            <h3 style={{ color: "#333", margin: 0, fontSize: "1.15rem", whiteSpace: "nowrap" }}>
              Painel Interno
            </h3>
          )}
        </div>

        <nav className="admin-sidebar-nav">
          {(hasPermission("gerenciar_reservas") ||
            hasPermission("fazer_vistoria") ||
            hasPermission("receber_pagamentos")) && (
            <MenuItem
              label="Reservas & Pedidos"
              icon={Icons.reservas}
              isActive={activeTab === "reservas"}
              onClick={() => setActiveTab("reservas")}
              isExpanded={isSidebarExpanded}
            />
          )}

          {hasPermission("gerenciar_estoque") && (
            <>
              <MenuItem
                label="Equipamentos"
                icon={Icons.equipamentos}
                isActive={activeTab === "equipamentos"}
                onClick={() => setActiveTab("equipamentos")}
                isExpanded={isSidebarExpanded}
              />
              <MenuItem
                label="Categorias"
                icon={Icons.categorias}
                isActive={activeTab === "categorias"}
                onClick={() => setActiveTab("categorias")}
                isExpanded={isSidebarExpanded}
              />
            </>
          )}

          {user?.tipo_usuario === "admin" && (
            <MenuItem
              label="Equipe"
              icon={Icons.equipe}
              isActive={activeTab === "equipe"}
              onClick={() => setActiveTab("equipe")}
              isExpanded={isSidebarExpanded}
            />
          )}

          {hasPermission("configuracoes") && (
            <>
              <MenuItem
                label="Horários"
                icon={Icons.horarios}
                isActive={activeTab === "horarios"}
                onClick={() => setActiveTab("horarios")}
                isExpanded={isSidebarExpanded}
              />
              <MenuItem
                label="Calendário"
                icon={Icons.calendario}
                isActive={activeTab === "calendario"}
                onClick={() => setActiveTab("calendario")}
                isExpanded={isSidebarExpanded}
              />
              <MenuItem
                label="Configurações"
                icon={Icons.config}
                isActive={activeTab === "config"}
                onClick={() => setActiveTab("config")}
                isExpanded={isSidebarExpanded}
              />
            </>
          )}

          {hasPermission("ver_financeiro") && (
            <>
              <div className="admin-section-divider"></div>
              <MenuItem
                label="Relatórios & B.O."
                icon={Icons.relatorios}
                isActive={activeTab === "relatorios"}
                onClick={() => setActiveTab("relatorios")}
                isExpanded={isSidebarExpanded}
              />
            </>
          )}
        </nav>
      </aside>

      <main className={`admin-main-content ${!isSidebarExpanded ? 'collapsed' : ''}`}>
        {renderContent()}
      </main>
    </div>
  );
};

const MenuItem = ({ label, icon, isActive, onClick, isExpanded }: any) => (
  <button
    onClick={onClick}
    title={!isExpanded ? label : undefined}
    className={`admin-menu-item ${isActive ? 'active' : ''} ${!isExpanded ? 'collapsed' : ''}`}
  >
    <span className="admin-menu-icon">{icon}</span>
    {isExpanded && <span>{label}</span>}
  </button>
);

export default AdminDashboard;