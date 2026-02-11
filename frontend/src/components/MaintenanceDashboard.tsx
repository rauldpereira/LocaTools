import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface MaintenanceItem {
  id: number;
  data_inicio: string;
  data_fim: string;
  Unidade: {
    id: number;
    codigo_serial: string;
    Equipamento: {
      nome: string;
      url_imagem: string;
    };
  };
}

const MaintenanceDashboard: React.FC = () => {
  const { token } = useAuth();
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaintenance = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const { data } = await axios.get('http://localhost:3001/api/units/maintenances/dashboard', config);
        setItems(data);
      } catch (error) {
        console.error("Erro ao carregar manutenções", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMaintenance();
  }, [token]);

  const getStatusLabel = (inicio: string) => {
    const now = new Date();
    const startDate = new Date(inicio);
    
    if (startDate <= now) {
        return <span style={{background:'#ffeeba', color:'#856404', padding:'2px 8px', borderRadius:'10px', fontSize:'0.8rem', fontWeight:'bold'}}>Em Andamento 🛠️</span>;
    } else {
        return <span style={{background:'#d1ecf1', color:'#0c5460', padding:'2px 8px', borderRadius:'10px', fontSize:'0.8rem', fontWeight:'bold'}}>Agendado 📅</span>;
    }
  };

  if (loading) return <div>Carregando painel...</div>;

  return (
    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop:'20px' }}>
      <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginTop: 0, color:'#333' }}>
        Cronograma de Manutenção
      </h3>

      {items.length === 0 ? (
        <p style={{ color: '#28a745', fontWeight: 'bold' }}>Tudo certo! Nenhuma manutenção pendente. ✅</p>
      ) : (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#666', fontSize: '0.9rem' }}>
                <th style={{ padding: '10px', borderBottom:'1px solid #eee' }}>Equipamento</th>
                <th style={{ padding: '10px', borderBottom:'1px solid #eee' }}>S/N</th>
                <th style={{ padding: '10px', borderBottom:'1px solid #eee' }}>Período</th>
                <th style={{ padding: '10px', borderBottom:'1px solid #eee' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                 let imgUrl = '';
                 try {
                    const parsed = JSON.parse(item.Unidade.Equipamento.url_imagem);
                    imgUrl = Array.isArray(parsed) ? parsed[0] : parsed;
                 } catch {
                    imgUrl = item.Unidade.Equipamento.url_imagem;
                 }

                 return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px', display:'flex', alignItems:'center', gap:'10px' }}>
                        {imgUrl && <img src={`http://localhost:3001${imgUrl}`} alt="" style={{width:40, height:40, objectFit:'cover', borderRadius:4}} />}
                        <strong style={{color:"#000"}}>{item.Unidade.Equipamento.nome}</strong>
                    </td>
                    <td style={{ padding: '10px', fontWeight:'bold', color:'#555' }}>
                        #{item.Unidade.id} - {item.Unidade.codigo_serial || 'Sem S/N'}
                    </td>
                    <td style={{ padding: '10px', fontSize:'0.9rem', color: '#666'}}>
                      De: {new Date(item.data_inicio).toLocaleDateString()}<br/>
                      Até: {new Date(item.data_fim).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px' }}>
                        {getStatusLabel(item.data_inicio)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MaintenanceDashboard;