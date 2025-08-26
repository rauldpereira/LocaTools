import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface UserProfile {
  id: number;
  nome: string;
  email: string;
  tipo_usuario: 'cliente' | 'admin' | 'motorista';
}

const Profile: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Token de autenticação não encontrado.');
          return;
        }

        const response = await axios.get('http://localhost:3001/api/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUser(response.data);
      } catch (err) {
        setError('Falha ao carregar o perfil. Por favor, faça o login novamente.');
        console.error(err);
      }
    };

    fetchProfile();
  }, []);

  if (error) {
    return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;
  }

  if (!user) {
    return <div style={{ padding: '2rem' }}>Carregando perfil...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Perfil do Usuário</h2>
      <p><strong>ID:</strong> {user.id}</p>
      <p><strong>Nome:</strong> {user.nome}</p>
      <p><strong>E-mail:</strong> {user.email}</p>
      <p><strong>Tipo de Usuário:</strong> {user.tipo_usuario}</p>
    </div>
  );
};

export default Profile;