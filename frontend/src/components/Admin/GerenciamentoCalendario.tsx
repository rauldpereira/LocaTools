import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './GerenciamentoCalendario.css';
import ModalEditarDia from './ModalEditarDia';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar as CalendarIcon,
  Download,
  Globe,
  Lock,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  X,
  Loader2
} from 'lucide-react';

interface IDiaStatus {
  data: string;
  status: 'ABERTO' | 'FECHADO';
  fonte: 'padrao' | 'excecao';
  descricao: string | null;
  tipo?: 'feriado' | 'parada' | 'extra' | 'outro';
}

interface IMesPublicado {
  ano: number;
  mes: number;
}

const toISODate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const GerenciamentoCalendario: React.FC = () => {
  const { isLoadingAuth, isLoggedIn } = useAuth();

  const [activeStartDate, setActiveStartDate] = useState(new Date());
  const [statusDias, setStatusDias] = useState<Map<string, IDiaStatus>>(new Map());
  const [isMonthPublished, setIsMonthPublished] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState<IDiaStatus | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);

  const forcarRecarga = () => {
    setActiveStartDate(new Date(activeStartDate.getTime()));
  };

  useEffect(() => {
    if (isLoadingAuth || !isLoggedIn) return;

    const fetchDadosMensais = async () => {
      setIsLoading(true);
      setError(null);
      const mes = activeStartDate.getMonth() + 1;
      const ano = activeStartDate.getFullYear();

      try {
        const { data: dataDias } = await axios.get<IDiaStatus[]>(`${import.meta.env.VITE_API_URL}/api/calendario/status-mensal`, {
          params: { ano, mes }
        });
        const diasMap = new Map(dataDias.map(dia => [dia.data, dia]));
        setStatusDias(diasMap);

        const { data: mesesPublicados } = await axios.get<IMesPublicado[]>(
          `${import.meta.env.VITE_API_URL}/api/calendario/meses-publicados`
        );

        const publicado = mesesPublicados.some(m => m.ano === ano && m.mes === mes);
        setIsMonthPublished(publicado);
      } catch (err) {
        console.error("Erro ao buscar dados mensais:", err);
        setError("Não foi possível carregar os dados.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDadosMensais();
  }, [activeStartDate, isLoadingAuth, isLoggedIn]);

  const executeTogglePublishMonth = async () => {
    setConfirmPublishOpen(false);
    const ano = activeStartDate.getFullYear();
    const mes = activeStartDate.getMonth() + 1;
    const novoStatus = !isMonthPublished;
    setIsLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/calendario/publicar-mes`, { ano, mes, publicado: novoStatus });
      setIsMonthPublished(novoStatus);
      setSuccessMsg(`Mês ${novoStatus ? 'publicado' : 'não publicado'}!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError("Erro ao atualizar status do mês.");
    } finally {
      setIsLoading(false);
    }
  };

  const getTileClassName = ({ date, view }: { date: Date, view: string }): string | null => {
    if (view !== 'month') return null;
    const dataString = toISODate(date);
    const diaStatus = statusDias.get(dataString);
    if (!diaStatus) return null;
    if (diaStatus.fonte === 'excecao') {
      return diaStatus.status === 'FECHADO' ? 'dia-excecao-fechado' : 'dia-excecao-aberto';
    }
    return diaStatus.status === 'FECHADO' ? 'dia-padrao-fechado' : 'dia-excecao-aberto';
  };

  const executeImportarFeriados = async () => {
    const ano = activeStartDate.getFullYear();
    setConfirmImportOpen(false);
    setIsLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/calendario/importar-feriados`, { ano });
      setSuccessMsg("Feriados importados!");
      setTimeout(() => setSuccessMsg(''), 4000);
      forcarRecarga();
    } catch (err) {
      setError("Erro ao importar feriados.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiaClick = (date: Date) => {
    const dataString = toISODate(date);
    const diaStatus = statusDias.get(dataString);
    if (diaStatus) {
      setDiaSelecionado(diaStatus);
      setModalAberto(true);
    }
  };

  return (
    <div className="admin-calendario-container">
      {/* HEADER */}
      <div className="calendario-header-flex">
        <div>
          <h2><CalendarIcon size={24} color="#2563eb" /> Gestão de Calendário</h2>
          <p>Organize feriados e visibilidade do mês.</p>
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

      {/* LEGENDA */}
      <div className="calendario-legenda">
        <span className="legenda-item"><div className="cor dia-excecao-aberto"></div> Aberto</span>
        <span className="legenda-item"><div className="cor dia-padrao-fechado"></div> Fechado Padrão</span>
        <span className="legenda-item"><div className="cor dia-excecao-fechado"></div> Feriado / Parada</span>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", backgroundColor: "#fef2f2", border: "1px solid #ef4444", borderRadius: "8px", color: "#b91c1c", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", fontWeight: "bold" }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* CALENDÁRIO */}
      <div style={{ position: 'relative' }}>
        {isLoading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}>
            <Loader2 size={40} className="spin" color="#2563eb" />
          </div>
        )}
        <Calendar
          locale="pt-BR"
          calendarType="gregory"
          activeStartDate={activeStartDate}
          onActiveStartDateChange={({ activeStartDate }) => setActiveStartDate(activeStartDate || new Date())}
          tileClassName={getTileClassName}
          onClickDay={handleDiaClick}
          showNeighboringMonth={false}
        />
      </div>

      {/* FOOTER */}
      <div className="calendario-footer">
        <div className={`status-mes-badge ${isMonthPublished ? 'sim' : 'nao'}`}>
          {isMonthPublished ? <CheckCircle size={14} /> : <Lock size={14} />}
          {isMonthPublished ? 'Mês Publicado' : 'Mês Não publicado'}
        </div>

        {successMsg && <div style={{ color: "#10b981", fontWeight: "700", fontSize: "0.85rem" }}>{successMsg}</div>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setConfirmImportOpen(true)} className="btn-cal-action btn-import">
            <Download size={16} /> Feriados {activeStartDate.getFullYear()}
          </button>
          <button onClick={() => setConfirmPublishOpen(true)} className={`btn-cal-action btn-publish ${isMonthPublished ? 'publicado' : 'nao-publicado'}`}>
            {isMonthPublished ? <Lock size={16} /> : <Globe size={16} />}
            {isMonthPublished ? 'Ocultar Mês' : 'Publicar Mês'}
          </button>
        </div>
      </div>

      {modalAberto && diaSelecionado && (
        <ModalEditarDia diaInfo={diaSelecionado} onClose={() => setModalAberto(false)} onSave={() => { forcarRecarga(); setModalAberto(false); }} />
      )}

      {/* MODAL IMPORTAÇÃO */}
      {confirmImportOpen && (
        <div className="manual-overlay" onClick={() => setConfirmImportOpen(false)}>
          <div className="manual-content" style={{ maxWidth: '400px', borderRadius: '12px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={20} color="#2563eb" /> Importar Feriados
              </h3>
              <p style={{ color: "#475569", fontSize: "0.95rem", margin: "0 0 24px 0", lineHeight: "1.5" }}>
                Deseja carregar e fechar automaticamente os feriados nacionais de <strong>{activeStartDate.getFullYear()}</strong>?
              </p>
              <div style={{ display: "flex", justifyContent: 'flex-end', gap: "12px" }}>
                <button onClick={() => setConfirmImportOpen(false)} style={modalBtnCancelStyle}>
                  Cancelar
                </button>
                <button onClick={executeImportarFeriados} style={modalBtnConfirmStyle}>
                  Importar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PUBLICAR/OCULTAR MÊS */}
      {confirmPublishOpen && (
        <div className="manual-overlay" onClick={() => setConfirmPublishOpen(false)}>
          <div className="manual-content" style={{ maxWidth: '400px', borderRadius: '12px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isMonthPublished ? <Lock size={20} color="#ef4444" /> : <Globe size={20} color="#10b981" />}
                {isMonthPublished ? 'Ocultar Mês' : 'Publicar Mês'}
              </h3>
              <p style={{ color: "#475569", fontSize: "0.95rem", margin: "0 0 24px 0", lineHeight: "1.5" }}>
                Tem certeza que deseja {isMonthPublished ? 'ocultar' : 'publicar'} o mês de <strong>{activeStartDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</strong>?
                {!isMonthPublished && " Os clientes poderão realizar agendamentos neste período."}
                {isMonthPublished && " Os clientes não poderão mais realizar agendamentos neste período."}
              </p>
              <div style={{ display: "flex", justifyContent: 'flex-end', gap: "12px" }}>
                <button onClick={() => setConfirmPublishOpen(false)} style={modalBtnCancelStyle}>
                  Cancelar
                </button>
                <button onClick={executeTogglePublishMonth} style={isMonthPublished ? modalBtnDangerStyle : modalBtnSuccessStyle}>
                  {isMonthPublished ? 'Ocultar' : 'Publicar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MANUAL (ESTILO HORARIOS) */}
      {showManual && (
        <div className="manual-overlay" onClick={() => setShowManual(false)}>
          <div className="manual-content" style={{ maxWidth: '650px', padding: 0, display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            {/* CABEÇALHO FIXO */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "25px 30px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
              <h3 style={{ margin: 0, color: '#1e293b', display: "flex", alignItems: "center", gap: "10px" }}>
                <HelpCircle size={22} color="#2563eb" /> Manual do Usuário: Calendário
              </h3>
              <button
                onClick={() => setShowManual(false)}
                title="Fechar"
                style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", padding: "10px", color: "#64748b", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#fee2e2"; e.currentTarget.style.color = "#ef4444"; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#f1f5f9"; e.currentTarget.style.color = "#64748b"; }}
              >
                <X size={20} />
              </button>
            </div>

            {/* CORPO SCROLLABLE */}
            <div style={{ padding: "30px", overflowY: "auto", flexGrow: 1, maxHeight: "70vh" }}>
              <div style={{ color: "#475569", lineHeight: "1.6" }}>
                <p style={{ marginBottom: "25px", fontSize: "1rem" }}>Gerencie os dias de funcionamento da loja.</p>

                <div style={manualStepStyle}>
                  <div style={stepNumberStyle}>1</div>
                  <div>
                    <strong style={{ color: "#1e293b" }}>Legenda de Cores:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>
                      <span style={{ color: "#10b981", fontWeight: "bold" }}>Verde:</span> Dia liberado para locações.<br />
                      <span style={{ color: "#94a3b8", fontWeight: "bold" }}>Cinza:</span> Dia fechado por padrão (ex: domingos).<br />
                      <span style={{ color: "#ef4444", fontWeight: "bold" }}>Vermelho:</span> Feriado ou fechamento forçado.
                    </p>
                  </div>
                </div>

                <div style={manualStepStyle}>
                  <div style={stepNumberStyle}>2</div>
                  <div>
                    <strong style={{ color: "#1e293b" }}>Ajuste Manual:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Clique em qualquer dia do calendário para abrir as opções. Você pode forçar a abertura de um dia fechado por padrão ou fechar uma data específica por alguma exceção. Os dias fechados por padrão são ajustados na aba horários.</p>
                  </div>
                </div>

                <div style={manualStepStyle}>
                  <div style={stepNumberStyle}>3</div>
                  <div>
                    <strong style={{ color: "#1e293b" }}>Importação de Feriados:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>O botão <strong>"Feriados [ANO]"</strong> carrega automaticamente os feriados nacionais, poupando o trabalho de fechar cada feriado manualmente.</p>
                  </div>
                </div>

                <div style={manualStepStyle}>
                  <div style={stepNumberStyle}>4</div>
                  <div>
                    <strong style={{ color: "#1e293b" }}>Publicação do Mês:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Clientes só conseguem ver e agendar meses marcados como <strong>"Mês Publicado"</strong> no canto inferior esquerdo. Meses não publicados ficam bloqueados para locação no site.</p>
                  </div>
                </div>

                <div style={manualStepStyle}>
                  <div style={stepNumberStyle}>5</div>
                  <div>
                    <strong style={{ color: "#1e293b" }}>Segurança:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>As alterações feitas no calendário <strong style={{ color: "#2563eb" }}>não afetam reservas que já foram confirmadas</strong> antes da mudança.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .manual-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 3000; animation: fadeIn 0.2s ease; }
        .manual-content { background: #fff; border-radius: 16px; width: 90%; boxShadow: 0 20px 25px -5px rgba(0,0,0,0.1); overflow: hidden; display: flex; flexDirection: column; }
      `}</style>
    </div>
  );
};


const manualStepStyle: React.CSSProperties = { display: "flex", gap: "15px", marginBottom: "20px", padding: "15px", borderRadius: "12px", backgroundColor: "#f8fafc", border: "1px solid #f1f5f9" };
const stepNumberStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", fontWeight: "bold", fontSize: "0.85rem", flexShrink: 0 };

const modalBtnCancelStyle: React.CSSProperties = { padding: "10px 18px", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#475569", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s" };
const modalBtnConfirmStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", borderRadius: "8px", border: "none", backgroundColor: "#2563eb", color: "#fff", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s" };
const modalBtnSuccessStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", borderRadius: "8px", border: "none", backgroundColor: "#10b981", color: "#fff", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s" };
const modalBtnDangerStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", borderRadius: "8px", border: "none", backgroundColor: "#ef4444", color: "#fff", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s" };

export default GerenciamentoCalendario;