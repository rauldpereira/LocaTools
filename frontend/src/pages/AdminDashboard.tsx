import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import AddCategoryForm from "../components/Admin/AddCategoryForm";
import AdminReservationsList from "../components/Admin/AdminReservationsList";
import AdminHorariosPage from "../components/HorarioFuncionamento";
import AdminReportsPage from "../pages/AdminReportsPage";
import AdminStoreConfig from "../pages/AdminStoreConfig";
import AdminCalendarPage from "../components/Admin/GerenciamentoCalendario";
import AdminTeamPage from "../components/Admin/AdminTeamPage";
import EquipamentosAdminManager from "../components/Admin/EquipamentosAdminManager";
import "../styles/AdminDashboard.css";

const Icons = {
  dashboard: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
  reservas: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  frete: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>,
  equipamentos: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="16" width="20" height="4" rx="1" />
      <circle cx="6" cy="20" r="2" fill="currentColor" />
      <circle cx="18" cy="20" r="2" fill="currentColor" />
      <path d="M4 16v-4" />
      <path d="M18 16v-5l-2-2h-3" />
      <path d="M22 16v-3l-2-2" />
      <ellipse cx="10" cy="9" rx="6" ry="4" transform="rotate(-30 10 9)" />
      <path d="M15 4l2 3" />
    </svg>
  ),
  equipe: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  categorias: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>,
  horarios: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  calendario: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  relatorios: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
  config: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
};

const AdminDashboard: React.FC = () => {
  const { isLoggedIn, user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem("adminActiveTab") || "vazio");
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  useEffect(() => {
    if (activeTab === "vazio") {
      if (
        hasPermission("gerenciar_reservas") || 
        hasPermission("fazer_vistoria") || 
        hasPermission("receber_pagamentos")
      )
        setActiveTab("reservas");
      else if (hasPermission("gerenciar_estoque")) setActiveTab("equipamentos");
      else if (hasPermission("configuracoes")) setActiveTab("config");
      else if (hasPermission("ver_financeiro")) setActiveTab("relatorios"); 
    }
  }, [user, activeTab, hasPermission]);

  useEffect(() => {
    if (activeTab !== "vazio") {
      sessionStorage.setItem("adminActiveTab", activeTab);
    }
  }, [activeTab]);

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
            <AdminReservationsList />
          </div>
        ) : null;
      case "equipamentos":
        return hasPermission("gerenciar_estoque") ? (
          <div className="admin-content-container">
            <EquipamentosAdminManager />
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
            <div style={{ marginBottom: "2rem", padding: "1.5rem", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
              <AddCategoryForm />
            </div>
          </div>
        ) : null;
      case "horarios":
        return hasPermission("configuracoes") ? (
          <div className="admin-content-container">
            <div style={{ padding: "1.5rem", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
              <AdminHorariosPage />
            </div>
          </div>
        ) : null;
      case "calendario":
        return hasPermission("configuracoes") ? (
          <div className="admin-content-container">
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
                label="Relatórios"
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