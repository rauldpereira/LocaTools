import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Printer, ArrowLeft } from 'lucide-react';
import { generateNfseHtml } from '../assets/nfse_html_generator';

const NFSeViewPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [storeConfig, setStoreConfig] = useState<any>(null);

  const backendUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchData = async () => {
      if (!token || !orderId) return;
      try {
        const [orderRes, configRes] = await Promise.all([
          axios.get(`${backendUrl}/api/reservations/${orderId}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${backendUrl}/api/config`)
        ]);
        setOrder(orderRes.data);
        setStoreConfig(configRes.data);
      } catch (error) {
        console.error("Erro ao buscar dados para NFSe:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [orderId, token]);

  if (loading) return <div style={{ padding: '20px' }}>Carregando Nota Fiscal...</div>;
  if (!order) return <div style={{ padding: '20px' }}>Erro ao carregar dados do pedido.</div>;

  const handlePrint = () => {
    window.print();
  };

  const rawHtml = generateNfseHtml(order, storeConfig);

  return (
    <div className="nfse-view-container">
      {/* BARRA DE FERRAMENTAS */}
      <div className="no-print" style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, 
        height: '60px', backgroundColor: '#1e293b', 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', zIndex: 10000, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)'
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          <ArrowLeft size={20} /> Voltar ao Pedido
        </button>
        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>Visualização de Nota Fiscal Digital</div>
        <button onClick={handlePrint} style={{ backgroundColor: '#10b981', border: 'none', color: 'white', padding: '10px 20px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          <Printer size={20} /> Imprimir / Salvar PDF
        </button>
      </div>

      <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <div dangerouslySetInnerHTML={{ __html: rawHtml }} />
      </div>

      <style>{`
        .nfse-view-container {
          background-color: #525659;
          min-height: 100vh;
          padding-top: 80px;
          padding-bottom: 50px;
        }
        @media print {
          body { margin: 0; padding: 0; background: white; }
          .nfse-view-container { padding: 0; background: white; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default NFSeViewPage;
