import React from 'react';
import { useAuth } from '../context/AuthContext';
import EquipmentForm from '../components/Admin/EquipmentForm';
import AddCategoryForm from '../components/Admin/AddCategoryForm';
import EquipmentList from '../components/Admin/EquipmentList';
import AdminReservationsList from '../components/Admin/AdminReservationsList';

const AdminDashboard: React.FC = () => {
  const { isLoggedIn, user } = useAuth();

  return (
    <div>
      <div style={{ padding: '2rem', marginTop: '60px' }}>
        <h1>Painel do Administrador</h1>
        {isLoggedIn && user?.tipo_usuario === 'admin' ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
              <EquipmentForm />
              <AddCategoryForm />
            </div>
            
            <hr style={{ margin: '2rem 0' }} />
            
            <AdminReservationsList />

            <hr style={{ margin: '2rem 0' }} />
            
            <EquipmentList />
          </>
        ) : (
          <p>Acesso negado. Esta área é restrita a administradores.</p>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;