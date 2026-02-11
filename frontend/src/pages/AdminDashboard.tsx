import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

import EquipmentForm from '../components/Admin/EquipmentForm';
import AddCategoryForm from '../components/Admin/AddCategoryForm';
import EquipmentList from '../components/Admin/EquipmentList';
import AdminReservationsList from '../components/Admin/AdminReservationsList';
import AdminHorariosPage from '../components/HorarioFuncionamento';
import AdminReportsPage from '../pages/AdminReportsPage';
import MaintenanceDashboard from '../components/MaintenanceDashboard';

const Icons = {
  dashboard: "📊",
  reservas: "📅",
  equipamentos: "🚜",
  categorias: "🏷️",
  horarios: "⏰",
  calendario: "📆",
  relatorios: "📈"
};

const AdminDashboard: React.FC = () => {
  const { isLoggedIn, user } = useAuth();
  const [activeTab, setActiveTab] = useState('reservas');

  if (!isLoggedIn || user?.tipo_usuario !== 'admin') {
    return (
      <div style={{ padding: '2rem', marginTop: '60px', textAlign: 'center', color: '#333' }}>
        <h2>🚫 Acesso Negado</h2>
        <p>Esta área é restrita a administradores.</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'reservas':
        return (
          <div style={contentContainerStyle}>
            <h2 style={headerStyle}>Gerenciamento de Reservas</h2>
            <AdminReservationsList />
          </div>
        );
      case 'equipamentos':
        return (
          <div style={contentContainerStyle}>

            <div style={{ marginBottom: '25px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
              <h2 style={{ ...headerStyle, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                Gestão de Equipamentos
              </h2>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <MaintenanceDashboard />
            </div>

            <div style={{
              marginBottom: '30px',
              padding: '25px',
              backgroundColor: '#fff',
              borderRadius: '12px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
              border: '1px solid #f0f0f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, color: '#007bff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ➕ Cadastrar Novo Equipamento
                </h4>
              </div>

              <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px dashed #dee2e6' }}>
                <EquipmentForm />
              </div>
            </div>

            <div style={{
              padding: '25px',
              backgroundColor: '#fff',
              borderRadius: '12px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
              border: '1px solid #f0f0f0'
            }}>
              <h4 style={{ marginTop: 0, marginBottom: '20px', color: '#333', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                Inventário Completo
              </h4>
              <EquipmentList />
            </div>

          </div>
        );
      case 'categorias':
        return (
          <div style={contentContainerStyle}>
            <h2 style={headerStyle}>Categorias do Sistema</h2>
            <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <AddCategoryForm />
            </div>
          </div>
        );
      case 'horarios':
        return (
          <div style={contentContainerStyle}>
            <h2 style={headerStyle}>Horários de Funcionamento</h2>
            <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <AdminHorariosPage />
            </div>
          </div>
        );
      case 'calendario':
        return (
          <div style={contentContainerStyle}>
            <h2 style={headerStyle}>Calendário de Feriados</h2>
            <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <p style={{ color: '#555', fontSize: '1.1rem' }}>Para gerenciar feriados e dias de bloqueio, acesse o painel dedicado.</p>
              <Link to="/admin/calendario" style={btnLinkStyle}>
                Abrir Gerenciador de Calendário ↗
              </Link>
            </div>
          </div>
        );
      case 'relatorios':
        return <AdminReportsPage />;
      default:
        return <AdminReservationsList />;
    }
  };

  return (
    <div style={layoutStyle}>
      <aside style={sidebarStyle}>
        <div style={{ padding: '20px', borderBottom: '1px solid #f0f0f0' }}>
          <h3 style={{ color: '#333', margin: 0, fontSize: '1.2rem' }}>Painel Admin</h3>
          <p style={{ color: '#888', fontSize: '0.85rem', margin: '5px 0 0 0' }}>Olá, {user?.nome}</p>
        </div>

        <nav style={{ marginTop: '10px', padding: '10px' }}>
          <MenuItem label="Reservas & Pedidos" icon={Icons.reservas} isActive={activeTab === 'reservas'} onClick={() => setActiveTab('reservas')} />
          <MenuItem label="Equipamentos" icon={Icons.equipamentos} isActive={activeTab === 'equipamentos'} onClick={() => setActiveTab('equipamentos')} />
          <MenuItem label="Categorias" icon={Icons.categorias} isActive={activeTab === 'categorias'} onClick={() => setActiveTab('categorias')} />
          <MenuItem label="Horários" icon={Icons.horarios} isActive={activeTab === 'horarios'} onClick={() => setActiveTab('horarios')} />
          <MenuItem label="Calendário" icon={Icons.calendario} isActive={activeTab === 'calendario'} onClick={() => setActiveTab('calendario')} />

          <div style={{ margin: '10px 0', borderTop: '1px solid #f0f0f0' }}></div>

          <MenuItem label="Relatórios & B.O." icon={Icons.relatorios} isActive={activeTab === 'relatorios'} onClick={() => setActiveTab('relatorios')} />
        </nav>
      </aside>

      <main style={mainContentStyle}>
        {renderContent()}
      </main>
    </div>
  );
};

const MenuItem = ({ label, icon, isActive, onClick }: any) => (
  <button
    onClick={onClick}
    style={{
      ...menuItemStyle,
      backgroundColor: isActive ? '#e6f7ff' : 'transparent', 
      color: isActive ? '#007bff' : '#555',
      fontWeight: isActive ? 'bold' : 'normal',
    }}
  >
    <span style={{ marginRight: '12px', fontSize: '1.2rem' }}>{icon}</span>
    {label}
  </button>
);

const layoutStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: '#f4f6f8',
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  paddingTop: '60px',
  boxSizing: 'border-box'
};

const sidebarStyle: React.CSSProperties = {
  width: '260px',
  backgroundColor: '#ffffff',
  borderRight: '1px solid #e0e0e0',
  display: 'flex',
  flexDirection: 'column',
  position: 'fixed',
  height: '100%',
  left: 0,
  top: 0,
  paddingTop: '80px',

  overflowY: 'auto',
  zIndex: 10
};

const mainContentStyle: React.CSSProperties = {
  flex: 1,
  marginLeft: '260px',
  padding: '2rem',
  overflowY: 'auto'
};

const contentContainerStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  padding: '2rem',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  minHeight: '80vh'
};

const headerStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: '1.5rem',
  color: '#2c3e50',
  borderBottom: '2px solid #f4f6f8',
  paddingBottom: '10px',
  fontSize: '1.5rem'
};

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  padding: '12px 15px',
  border: 'none',
  borderRadius: '8px',
  fontSize: '0.95rem',
  cursor: 'pointer',
  textAlign: 'left',
  marginBottom: '5px',
  transition: 'all 0.2s'
};

const btnLinkStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '12px 24px',
  backgroundColor: '#007bff',
  color: 'white',
  textDecoration: 'none',
  borderRadius: '6px',
  fontWeight: 'bold',
  marginTop: '1rem',
  boxShadow: '0 2px 5px rgba(0,123,255,0.3)'
};

export default AdminDashboard;