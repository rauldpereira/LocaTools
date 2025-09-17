// frontend/src/pages/Home.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

interface Categoria {
  id: number;
  nome: string;
}

interface Equipment {
  id: number;
  nome: string;
  descricao: string;
  preco_diaria: number;
  url_imagem?: string;
  Categoria: Categoria;
}

const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
};

const Home: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const response = await axios.get<any[]>('http://localhost:3001/api/equipment');
        const formattedEquipment: Equipment[] = response.data.map(item => ({
          ...item,
          preco_diaria: parseFloat(item.preco_diaria)
        }));
        setEquipment(formattedEquipment);
        setLoading(false);
      } catch (err) {
        setError('Falha ao carregar os equipamentos.');
        setLoading(false);
        console.error(err);
      }
    };

    fetchEquipment();
  }, []);

  if (loading) {
    return (
        <div style={{ paddingTop: '60px' }}>
            <Navbar />
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>Carregando equipamentos...</div>
        </div>
    );
  }

  if (error) {
    return (
        <div style={{ paddingTop: '60px' }}>
            <Navbar />
            <div style={{ textAlign: 'center', marginTop: '2rem', color: 'red' }}>{error}</div>
        </div>
    );
  }

  return (
    <div style={{ paddingTop: '60px' }}>
        <Navbar />
        <div style={{ padding: '2rem' }}>
          <h1 style={{ textAlign: 'center' }}>Nossos Equipamentos</h1>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem' }}>
            {equipment.map((item) => (
              <div key={item.id} style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '1rem',
                  textAlign: 'center',
                  backgroundColor: '#333',
                  color: '#f8f9fa',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
              }}>
                {item.url_imagem && (
                    <img src={item.url_imagem} alt={item.nome} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }} />
                )}
                <h3>{item.nome}</h3>
                <p style={{ fontSize: '0.9rem', flexGrow: 1 }}>{truncateText(item.descricao, 100)}</p>
                <p><strong>Categoria:</strong> {item.Categoria?.nome || 'N/A'}</p>
                <p><strong>R$ {item.preco_diaria.toFixed(2)}</strong></p>
                <Link to={`/equipment/${item.id}`} style={{
                    marginTop: '0.5rem',
                    textDecoration: 'none',
                    color: '#fff',
                    backgroundColor: '#007bff',
                    padding: '0.5rem 1rem',
                    borderRadius: '5px',
                    display: 'inline-block'
                }}>
                    Ver Detalhes
                </Link>
              </div>
            ))}
          </div>
        </div>
    </div>
  );
};

export default Home;