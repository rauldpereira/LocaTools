import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Clock,
  Calendar,
  CheckCircle,
  Save,
  Loader2,
  HelpCircle,
  X
} from 'lucide-react';

interface HorarioConfig {
  dia_semana: string;
  horario_abertura: string;
  horario_fechamento: string;
  fechado: boolean;
}

const DIAS_ORDENADOS = [
  { key: 'segunda', label: 'Segunda-feira' },
  { key: 'terca', label: 'Terça-feira' },
  { key: 'quarta', label: 'Quarta-feira' },
  { key: 'quinta', label: 'Quinta-feira' },
  { key: 'sexta', label: 'Sexta-feira' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' }
];

const AdminHorariosPage: React.FC = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [horarios, setHorarios] = useState<HorarioConfig[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    fetchHorarios();
  }, []);

  const fetchHorarios = async () => {
    try {
      setFetching(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/horarios`);
      const dataBanco = response.data;

      const estruturaCompleta = DIAS_ORDENADOS.map(dia => {
        const existente = dataBanco.find((h: any) => h.dia_semana === dia.key);
        return {
          dia_semana: dia.key,
          horario_abertura: existente?.horario_abertura || '08:00',
          horario_fechamento: existente?.horario_fechamento || '18:00',
          fechado: existente ? existente.fechado : false
        };
      });

      setHorarios(estruturaCompleta);
    } catch (error) {
      console.error('Erro ao buscar horários', error);
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (index: number, field: keyof HorarioConfig, value: any) => {
    const novosHorarios = [...horarios];
    novosHorarios[index] = { ...novosHorarios[index], [field]: value };
    setHorarios(novosHorarios);
  };

  const handleSave = async () => {
    setLoading(true);
    setSuccessMsg('');
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${import.meta.env.VITE_API_URL}/api/horarios`, { horarios }, config);
      setSuccessMsg('Horários atualizados com sucesso!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar horários.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div style={{ textAlign: "center", padding: "100px", color: "#64748b" }}>Carregando configurações...</div>;

  return (
    <div style={{ animation: "fadeIn 0.3s ease", width: "100%", maxWidth: "900px", margin: "0 auto" }}>
      {/* HEADER */}
      <div style={{ marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: "0 0 10px 0", color: "#1e293b", fontSize: "1.6rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "12px" }}>
            <Clock size={28} color="#2563eb" /> Horários de Funcionamento
          </h2>
          <p style={{ color: "#64748b", margin: 0 }}>Ajuste os períodos de atendimento para retiradas e devoluções.</p>
        </div>

        <button
          onClick={() => setShowManual(true)}
          title="Manual do Usuário"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "45px", height: "45px", borderRadius: "50%", border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#64748b", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; e.currentTarget.style.color = "#2563eb"; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.color = "#64748b"; }}
        >
          <HelpCircle size={24} />
        </button>
      </div>

      {/* LISTA DE HORÁRIOS */}
      <div style={{ backgroundColor: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
              <th style={thStyle}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Calendar size={14} /> Dia</div></th>
              <th style={thStyle}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Clock size={14} /> Abertura</div></th>
              <th style={thStyle}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Clock size={14} /> Fechamento</div></th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Status de Abertura</th>
            </tr>
          </thead>
          <tbody>
            {horarios.map((item, index) => {
              const labelDia = DIAS_ORDENADOS.find(d => d.key === item.dia_semana)?.label;
              const estaAberto = !item.fechado;

              return (
                <tr key={item.dia_semana} style={{ borderBottom: '1px solid #f1f5f9', transition: "background 0.2s", opacity: estaAberto ? 1 : 0.6 }} className="table-row-hover">
                  <td style={{ ...tdStyle, fontWeight: '700', color: estaAberto ? '#1e293b' : '#94a3b8' }}>{labelDia}</td>

                  <td style={tdStyle}>
                    <input
                      type="time"
                      value={item.horario_abertura}
                      disabled={!estaAberto}
                      onChange={(e) => handleChange(index, 'horario_abertura', e.target.value)}
                      style={{ ...inputStyle, opacity: estaAberto ? 1 : 0.5 }}
                    />
                  </td>

                  <td style={tdStyle}>
                    <input
                      type="time"
                      value={item.horario_fechamento}
                      disabled={!estaAberto}
                      onChange={(e) => handleChange(index, 'horario_fechamento', e.target.value)}
                      style={{ ...inputStyle, opacity: estaAberto ? 1 : 0.5 }}
                    />
                  </td>

                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '10px', padding: "6px 16px", borderRadius: "20px", backgroundColor: estaAberto ? "#f0fdf4" : "#fef2f2", border: `1px solid ${estaAberto ? "#d1fae5" : "#fecaca"}`, transition: "all 0.2s" }}>
                      <input
                        type="checkbox"
                        checked={estaAberto}
                        onChange={(e) => handleChange(index, 'fechado', !e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ color: estaAberto ? '#10b981' : '#ef4444', fontWeight: '800', fontSize: "0.75rem", textTransform: "uppercase" }}>
                        {estaAberto ? 'Aberto' : 'Fechado'}
                      </span>
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ padding: "20px", backgroundColor: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {successMsg ? (
            <div style={{ color: "#10b981", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", animation: "fadeIn 0.3s ease" }}>
              <CheckCircle size={18} /> {successMsg}
            </div>
          ) : <div />}

          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              backgroundColor: '#2563eb',
              color: '#fff',
              padding: '12px 30px',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = '#1d4ed8')}
            onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = '#2563eb')}
          >
            {loading ? <Loader2 size={20} className="spin-animation" /> : <Save size={20} />}
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>

      {/* MODAL MANUAL DO USUÁRIO */}
      {showManual && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: "650px", padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* CABEÇALHO FIXO */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "25px 30px", borderBottom: "1px solid #f1f5f9", flexShrink: 0, position: "relative" }}>
              <h3 style={{ margin: 0, color: '#1e293b', display: "flex", alignItems: "center", gap: "10px" }}>
                <HelpCircle size={22} color="#2563eb" /> Manual do Usuário: Horários de Funcionamento
              </h3>
              <button
                onClick={() => setShowManual(false)}
                title="Fechar"
                style={{ ...closeBtnStyle, backgroundColor: "#f1f5f9", borderRadius: "50%", padding: "10px", color: "#64748b", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center" }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#fee2e2"; e.currentTarget.style.color = "#ef4444"; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#f1f5f9"; e.currentTarget.style.color = "#64748b"; }}
              >
                <X size={20} />
              </button>
            </div>

            {/* CORPO SCROLLABLE */}
            <div style={{ padding: "30px", overflowY: "auto", flexGrow: 1, maxHeight: "70vh" }}>
              <div style={{ color: "#475569", lineHeight: "1.6" }}>
                <p style={{ marginBottom: "25px", fontSize: "1rem" }}>Gerencie a disponibilidade da loja para retiradas e devoluções.</p>

                <div style={manualStepStyle}>
                  <div style={stepNumberStyle}>1</div>
                  <div>
                    <strong style={{ color: "#1e293b" }}>Status de Abertura:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Use o botão <strong>"Aberto"</strong> (Verde) para liberar o dia. Dias marcados como <strong>"Fechado"</strong> (Vermelho) bloqueiam qualquer operação naquele dia da semana.</p>
                  </div>
                </div>

                <div style={manualStepStyle}>
                  <div style={stepNumberStyle}>2</div>
                  <div>
                    <strong style={{ color: "#1e293b" }}>Horários de Atendimento:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Defina as horas de início e fim. Esses períodos aparecem para o cliente no site durante o agendamento.</p>
                  </div>
                </div>

                <div style={manualStepStyle}>
                  <div style={stepNumberStyle}>3</div>
                  <div>
                    <strong style={{ color: "#1e293b" }}>Bloqueio Automático:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>O sistema impede reservas em datas fechadas. Se fechar um dia, nenhum cliente conseguirá agendar para essa data.</p>
                  </div>
                </div>

                <div style={manualStepStyle}>
                  <div style={stepNumberStyle}>4</div>
                  <div>
                    <strong style={{ color: "#1e293b" }}>Regra de Reservas:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Alterar os horários ou dias de funcionamento <strong style={{ color: "#2563eb" }}>não afeta reservas já confirmadas</strong>, apenas novos pedidos.</p>
                  </div>
                </div>

                <div style={manualStepStyle}>
                  <div style={stepNumberStyle}>5</div>
                  <div>
                    <strong style={{ color: "#1e293b" }}>Aplicação:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>As mudanças só valem após clicar em <strong>"Salvar Configurações"</strong>.</p>
                  </div>
                </div>
              </div>
            </div>
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

const thStyle: React.CSSProperties = { padding: '16px', color: '#64748b', fontWeight: '700', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' };
const tdStyle: React.CSSProperties = { padding: '16px', verticalAlign: 'middle' };
const inputStyle: React.CSSProperties = { padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '110px', fontSize: "0.95rem", color: "#334155", outline: "none" };

const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, animation: "fadeIn 0.2s ease" };
const modalContentStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', width: '90%', maxWidth: '550px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh' };
const closeBtnStyle: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "5px" };
const manualStepStyle: React.CSSProperties = { display: "flex", gap: "15px", marginBottom: "20px", padding: "15px", borderRadius: "12px", backgroundColor: "#f8fafc", border: "1px solid #f1f5f9" };
const stepNumberStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", fontWeight: "bold", fontSize: "0.85rem", flexShrink: 0 };

export default AdminHorariosPage;