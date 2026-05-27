import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  Wrench, 
  Calendar, 
  Clock, 
  Package, 
  Loader2,
  CheckCircle2,
  Info,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface MaintenanceItem {
  id: number;
  data_inicio: string;
  data_fim: string;
  observacao?: string;
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
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/units/maintenances/dashboard`, config);
        setItems(data);
      } catch (error) {
        console.error("Erro ao carregar manutenções", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMaintenance();
  }, [token]);

  const getStatusBadge = (inicio: string) => {
    const now = new Date();
    const startDate = new Date(inicio);
    
    if (startDate <= now) {
        return (
            <span style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                backgroundColor: '#fffbeb', color: '#92400e', 
                padding: '4px 10px', borderRadius: '20px', 
                fontSize: '0.75rem', fontWeight: '800', textTransform: "uppercase",
                border: "1px solid #fef3c7"
            }}>
                <Wrench size={12} /> Em Andamento
            </span>
        );
    } else {
        return (
            <span style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                backgroundColor: '#eff6ff', color: '#1e40af', 
                padding: '4px 10px', borderRadius: '20px', 
                fontSize: '0.75rem', fontWeight: '800', textTransform: "uppercase",
                border: "1px solid #bfdbfe"
            }}>
                <Calendar size={12} /> Agendado
            </span>
        );
    }
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "60px", color: "#64748b" }}>
        <Loader2 size={40} className="spin-animation" style={{ margin: "0 auto 15px", color: "#2563eb" }} />
        <p style={{ fontWeight: "bold" }}>Sincronizando painel operacional...</p>
    </div>
  );

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      
      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", backgroundColor: "#ecfdf5", borderRadius: "16px", border: "2px dashed #10b981", color: "#047857" }}>
            <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: "15px" }} />
            <h3 style={{ margin: 0, fontSize: "1.2rem" }}>Tudo em ordem!</h3>
            <p style={{ margin: "5px 0 0 0", opacity: 0.8 }}>Nenhum equipamento em manutenção no momento.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'left', borderBottom: "2px solid #e2e8f0" }}>
                  <th style={thStyle}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Package size={14}/> Equipamento</div></th>
                  <th style={thStyle}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><ShieldCheck size={14}/> Patrimônio</div></th>
                  <th style={thStyle}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Clock size={14}/> Período</div></th>
                  <th style={thStyle}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Info size={14}/> Motivo</div></th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                   let imgUrl = '';
                   const equipamentoNome = item.Unidade?.Equipamento?.nome || 'Equipamento não encontrado';
                   const urlImagem = item.Unidade?.Equipamento?.url_imagem;
                   
                   if (urlImagem) {
                       try {
                          const parsed = JSON.parse(urlImagem);
                          imgUrl = Array.isArray(parsed) ? parsed[0] : parsed;
                       } catch {
                          imgUrl = urlImagem;
                       }
                   }
                   
                   const fullImgUrl = imgUrl ? (imgUrl.startsWith('http') ? imgUrl : `${import.meta.env.VITE_API_URL}${imgUrl}`) : '';

                   return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: "background 0.2s" }} className="table-row-hover">
                      <td style={tdStyle}>
                          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                              <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", border: "1px solid #f1f5f9" }}>
                                {fullImgUrl ? <img src={fullImgUrl} alt="" style={{ width: "100%", height: "100%", objectFit:'cover' }} /> : <div style={{ width: "100%", height: "100%", backgroundColor: "#e2e8f0" }}></div>}
                              </div>
                              <strong style={{ color: "#1e293b" }}>{equipamentoNome}</strong>
                          </div>
                      </td>
                      <td style={tdStyle}>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontWeight:'800', color:'#475569' }}>#{item.Unidade?.id || 'N/A'}</span>
                              <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "600" }}>{item.Unidade?.codigo_serial || 'S/N Não Inf.'}</span>
                          </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#475569", fontWeight: "600" }}>
                            {new Date(item.data_inicio).toLocaleDateString()}
                            <ChevronRight size={12} color="#cbd5e1" />
                            {new Date(item.data_fim).toLocaleDateString()}
                        </div>
                      </td>
                      
                      <td style={{ ...tdStyle, maxWidth: '250px' }}>
                          <span style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: "1.4" }}>
                            {item.observacao || 'Manutenção Preventiva Padrão'}
                          </span>
                      </td>

                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {getStatusBadge(item.data_inicio)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        .table-row-hover:hover { background-color: #f8fafc !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin-animation { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

const thStyle: React.CSSProperties = { padding: '16px', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle: React.CSSProperties = { padding: '16px', verticalAlign: 'middle' };

export default MaintenanceDashboard;