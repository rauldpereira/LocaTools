import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../styles/CalendarCommon.css';
import { parseDateStringAsLocal } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  Calendar as CalendarIcon, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info,
  Clock,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface RescheduleModalProps {
  order: any;
  onClose: () => void;
  onSuccess: () => void;
}

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

const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const RescheduleModal: React.FC<RescheduleModalProps> = ({ order, onClose, onSuccess }) => {
  const { token, isLoadingAuth, isLoggedIn } = useAuth();

  const originalStartDate = parseDateStringAsLocal(order.data_inicio);
  const originalEndDate = parseDateStringAsLocal(order.data_fim);
  const oneDay = 1000 * 60 * 60 * 24;
  const originalDurationMs = originalEndDate.getTime() - originalStartDate.getTime();
  const originalDurationDays = Math.round(originalDurationMs / oneDay);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPastOrToday = originalStartDate.getTime() <= today.getTime();

  const [newStartDate, setNewStartDate] = useState(order.data_inicio.split('T')[0]);
  const [newEndDate, setNewEndDate] = useState(order.data_fim.split('T')[0]);
  const [availability, setAvailability] = useState<{ available: boolean | null, checking: boolean }>({ available: null, checking: false });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [availabilityData, setAvailabilityData] = useState<{ [key: string]: number }>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(true);

  const [statusDias, setStatusDias] = useState<Map<string, IDiaStatus>>(new Map());
  const [currentMonthView, setCurrentMonthView] = useState(new Date());
  const [minDate, setMinDate] = useState<Date | undefined>(undefined);
  const [maxDate, setMaxDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (isLoadingAuth || !isLoggedIn) return;

    const fetchInitialData = async () => {
      try {
        setIsInitialLoading(true);
        setError('');

        const { data: meses } = await axios.get<IMesPublicado[]>(
          `${import.meta.env.VITE_API_URL}/api/calendario/meses-publicados`
        );

        if (meses.length === 0) {
          setError("Nenhum mês disponível.");
          setIsInitialLoading(false);
          return;
        }

        const primeiroMes = meses[0];
        const ultimoMes = meses[meses.length - 1];
        const adminMinDate = new Date(primeiroMes.ano, primeiroMes.mes - 1, 1);
        const effectiveMinDate = adminMinDate.getTime() < today.getTime() ? today : adminMinDate;
        const dataMax = new Date(ultimoMes.ano, ultimoMes.mes, 0);

        setMinDate(effectiveMinDate);
        setMaxDate(dataMax);
        setCurrentMonthView(effectiveMinDate);

        // Busca disponibilidade inicial ANTES de liberar o modal
        const [resAvailability, resStatus] = await Promise.all([
            axios.get(`${import.meta.env.VITE_API_URL}/api/equipment/${order.ItemReservas[0].Unidade.Equipamento.id}/daily-availability`, {
                params: { startDate: toISODate(effectiveMinDate), endDate: toISODate(dataMax), excludeOrderId: order.id }
            }),
            axios.get(`${import.meta.env.VITE_API_URL}/api/calendario/status-mensal`, {
                params: { ano: effectiveMinDate.getFullYear(), mes: effectiveMinDate.getMonth() + 1 }
            })
        ]);

        setAvailabilityData(resAvailability.data.availabilityByDay);
        setStatusDias(new Map(resStatus.data.map((dia: any) => [dia.data, dia])));
        
      } catch (err) {
        console.error("Erro no carregamento inicial:", err);
        setError("Erro ao carregar dados do calendário.");
      } finally {
        setIsInitialLoading(false);
        setLoadingCalendar(false);
      }
    };

    fetchInitialData();
  }, [isLoadingAuth, isLoggedIn, order.id]);


  useEffect(() => {
    if (isInitialLoading || !minDate) return;

    const fetchStatusMensal = async () => {
      setIsLoadingMonth(true);
      const ano = currentMonthView.getFullYear();
      const mes = currentMonthView.getMonth() + 1;

      try {
        const { data } = await axios.get<IDiaStatus[]>(
          `${import.meta.env.VITE_API_URL}/api/calendario/status-mensal`,
          { params: { ano, mes } }
        );
        const diasMap = new Map(data.map(dia => [dia.data, dia]));
        setStatusDias(diasMap);
      } catch (err) {
        console.error("Erro ao buscar status mensal:", err);
      } finally {
        setIsLoadingMonth(false);
      }
    };

    fetchStatusMensal();
  }, [currentMonthView]);

  useEffect(() => {
    if (!newStartDate || !newEndDate) return;

    // Validação de duração mínima antes de qualquer coisa
    const dInicio = parseDateStringAsLocal(newStartDate);
    const dFim = parseDateStringAsLocal(newEndDate);
    const oneDay = 1000 * 60 * 60 * 24;
    const selectedDuration = Math.round(Math.abs((dFim.getTime() - dInicio.getTime()) / oneDay)) + 1;
    const originalDur = originalDurationDays + 1;

    if (selectedDuration < originalDur) {
      setError(`A nova duração (${selectedDuration} dias) não pode ser menor que a original (${originalDur} dias).`);
      setAvailability({ available: false, checking: false });
      return; // Para aqui, não apaga o erro nem busca no banco
    }

    // Se passou na duração, limpa erro antigo e checa estoque
    setError('');

    // --- VALIDAÇÃO DE MÚLTIPLOS POR PLANO ---
    if (order.tipo_locacao === 'semanal' && selectedDuration % 7 !== 0) {
      setError(`Para o plano SEMANAL, a duração total deve ser múltipla de 7 dias (Atual: ${selectedDuration} dias).`);
      setAvailability({ available: false, checking: false });
      return;
    }
    if (order.tipo_locacao === 'quinzenal' && selectedDuration % 15 !== 0) {
      setError(`Para o plano QUINZENAL, a duração total deve ser múltipla de 15 dias (Atual: ${selectedDuration} dias).`);
      setAvailability({ available: false, checking: false });
      return;
    }
    if (order.tipo_locacao === 'mensal' && selectedDuration % 30 !== 0) {
      setError(`Para o plano MENSAL, a duração total deve ser múltipla de 30 dias (Atual: ${selectedDuration} dias).`);
      setAvailability({ available: false, checking: false });
      return;
    }

    setAvailability({ available: null, checking: true });

    const check = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/reservations/${order.id}/check-reschedule`, {
          startDate: newStartDate,
          endDate: newEndDate
        }, config);
        setAvailability({ available: data.available, checking: false });
      } catch (err: any) {
        setError(err.response?.data?.error || "Erro ao verificar disponibilidade.");
        setAvailability({ available: false, checking: false });
      }
    };
    const timer = setTimeout(check, 500);
    return () => clearTimeout(timer);
  }, [newStartDate, newEndDate, order.id, token, originalDurationDays]);


  const getTileClassName = ({ date, view }: { date: Date, view: string }) => {
    if (view !== 'month') return null;
    const dayString = toISODate(date);

    const newStart = parseDateStringAsLocal(newStartDate);
    const newEnd = parseDateStringAsLocal(newEndDate);

    // Prioridade: Seleção atual do usuário (Azul)
    if (date >= newStart && date <= newEnd) {
      return 'day-selected-reschedule';
    }

    if (date.getMonth() !== currentMonthView.getMonth()) {
      return 'day-neighboring-month';
    }

    // Dias Fechados/Feriados (Vermelho ou Cinza)
    const diaStatusAdmin = statusDias.get(dayString);
    if (diaStatusAdmin && diaStatusAdmin.status === 'FECHADO') {
      return 'day-closed';
    }

    // Estoque ZERO (Vermelho - Indisponível)
    const availabilityEstoque = availabilityData[dayString];
    if (availabilityEstoque === 0) {
        return 'day-red';
    }

    // Lógica visual: Se o dia faz parte da reserva ORIGINAL, tratamos como Verde
    if (date >= originalStartDate && date <= originalEndDate) {
        return 'day-green';
    }

    if (availabilityEstoque === undefined) return null;

    // Disponível (Verde) - Se houver qualquer quantidade acima de zero
    if (availabilityEstoque > 0) {
        return 'day-green';
    }

    return null;
  };


  const tileDisabled = ({ date, view }: { date: Date, view: string }): boolean => {
    if (view !== 'month') return false;

    if (loadingCalendar || isLoadingMonth) return true;

    // Se o pedido já começou, não pode selecionar datas ANTES do início original
    if (isPastOrToday && date < originalStartDate) return true;

    if (date.getMonth() !== currentMonthView.getMonth()) return true;

    // Se é a reserva atual dele, SEMPRE deixa clicar (mesmo que o estoque diga 0, pois ele é um dos que ocupa)
    if (date >= originalStartDate && date <= originalEndDate) return false;

    const dayString = toISODate(date);
    const availabilityEstoque = availabilityData[dayString];

    // Só desabilita se o estoque for zero E não for a reserva atual dele
    const isOriginalPeriod = date >= originalStartDate && date <= originalEndDate;
    if (!isOriginalPeriod && (availabilityEstoque === undefined || availabilityEstoque === 0)) return true;

    if (maxDate) {
      const endOfSelection = new Date(date.getTime() + originalDurationMs);
      if (endOfSelection > maxDate) return true;
    }

    return false;
  };


  const handleDateChange = (value: any) => {
    setError(''); // Limpa erros ao começar nova seleção
    
    if (isPastOrToday) {
      const clickedDate = value as Date;
      if (clickedDate < originalStartDate) return;
      setNewEndDate(toISODate(clickedDate));
    } else {
      if (Array.isArray(value) && value.length === 2) {
        const [start, end] = value;
        if (start && end) {
          const oneDay = 1000 * 60 * 60 * 24;
          const selectedDuration = Math.round(Math.abs((end.getTime() - start.getTime()) / oneDay)) + 1;
          
          if (selectedDuration < originalDurationDays + 1) {
            setError(`A nova duração (${selectedDuration} dias) não pode ser menor que a original (${originalDurationDays + 1} dias).`);
          }
          
          setNewStartDate(toISODate(start));
          setNewEndDate(toISODate(end));
        }
      }
    }
  };

  const handleSubmit = async () => {
    // Validação extra de segurança no clique
    const dInicio = parseDateStringAsLocal(newStartDate);
    const dFim = parseDateStringAsLocal(newEndDate);
    const oneDay = 1000 * 60 * 60 * 24;
    const newDurationDays = Math.round(Math.abs((dFim.getTime() - dInicio.getTime()) / oneDay)) + 1;

    if (newDurationDays < originalDurationDays + 1) {
        setError(`A nova duração (${newDurationDays} dias) não pode ser menor que a original (${originalDurationDays + 1} dias).`);
        return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${import.meta.env.VITE_API_URL}/api/reservations/${order.id}/reschedule`, { newStartDate, newEndDate }, config);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || "Não foi possível processar a remarcação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div className="availability-calendar-container" style={modalContentStyle} onClick={e => e.stopPropagation()}>
        
        {/* CABEÇALHO */}
        <div style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <div style={{ backgroundColor: "#fff7ed", padding: "12px", borderRadius: "12px" }}>
                <RefreshCw size={28} color="#f97316" />
            </div>
            <div>
                <h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.4rem", fontWeight: 800 }}>Remarcar Pedido #{order.id}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "0.9rem", fontWeight: "600" }}>
                  <CalendarIcon size={14} />
                  <span>Período atual: {originalStartDate.toLocaleDateString()} — {originalEndDate.toLocaleDateString()}</span>
                </div>
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}><X size={24} /></button>
        </div>

        <div style={{ padding: '25px' }}>
          {isPastOrToday && (
            <div style={{ ...warningBoxStyle, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <Info size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Pedido em andamento:</strong> A data de início está fixada. Escolha no calendário apenas a nova data de <strong>término</strong> (extensão).
              </div>
            </div>
          )}

          {/* LEGENDA */}
          <div style={legendContainerStyle}>
            <div style={legendItemStyle}><div style={{ ...legendCircleStyle, backgroundColor: '#10b981' }}></div> Disponível</div>
            <div style={legendItemStyle}><div style={{ ...legendCircleStyle, backgroundColor: '#ef4444' }}></div> Indisponível</div>
            <div style={legendItemStyle}><div style={{ ...legendCircleStyle, backgroundColor: '#3b82f6' }}></div> Sua Seleção</div>
          </div>

          <div style={{ ...calendarWrapperStyle, position: 'relative', opacity: isLoadingMonth ? 0.6 : 1, transition: 'opacity 0.2s' }}>
              {isInitialLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      <div className="spinner"></div>
                      <p style={{ fontWeight: 'bold', marginTop: '10px' }}>Carregando disponibilidade...</p>
                  </div>
              ) : error && !availabilityData ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#ef4444', backgroundColor: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                    <AlertTriangle size={24} style={{ margin: '0 auto 10px' }} />
                    <p style={{ fontWeight: 'bold' }}>{error}</p>
                  </div>
              ) : (
                  <>
                      {isLoadingMonth && (
                          <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>
                              <div className="spinner" style={{ width: '20px', height: '20px', margin: 0 }}></div>
                          </div>
                      )}
                      <Calendar
                          onChange={handleDateChange}
                          value={isPastOrToday 
                              ? parseDateStringAsLocal(newEndDate) 
                              : [parseDateStringAsLocal(newStartDate), parseDateStringAsLocal(newEndDate)]
                          }
                          selectRange={!isPastOrToday}
                          minDate={minDate}
                          maxDate={maxDate}
                          activeStartDate={currentMonthView}
                          onActiveStartDateChange={({ activeStartDate }) => setCurrentMonthView(activeStartDate || new Date())}
                          tileClassName={getTileClassName}
                          tileDisabled={tileDisabled}
                          minDetail="month"
                          maxDetail="month"
                          prev2Label={null}
                          next2Label={null}
                      />
                  </>
              )}
          </div>

          {/* BOX DE INFORMAÇÕES DO NOVO PERÍODO */}
          <div style={infoBoxStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>Novo Período</span>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#1e293b', display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                    {parseDateStringAsLocal(newStartDate).toLocaleDateString()} 
                    <ArrowRight size={18} color="#94a3b8" />
                    {parseDateStringAsLocal(newEndDate).toLocaleDateString()}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>Duração</span>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#2563eb' }}>
                  {Math.round(Math.abs((parseDateStringAsLocal(newEndDate).getTime() - parseDateStringAsLocal(newStartDate).getTime()) / oneDay)) + 1} dias
                </div>
              </div>
            </div>
            
            {error && (
              <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '15px', backgroundColor: '#fef2f2', padding: '10px', borderRadius: '8px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={18} /> {error}
              </div>
            )}

            {availability.checking ? (
              <div style={{ color: '#3b82f6', fontSize: '0.9rem', marginTop: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                <Clock size={18} className="spin-animation" /> Verificando estoque...
              </div>
            ) : !error && availability.available === true ? (
              <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '15px' }}>
                  <CheckCircle size={18} /> Período disponível para alteração
              </div>
            ) : !error && availability.available === false ? (
              <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '15px' }}>
                  <XCircle size={18} /> Indisponível: Não há equipamentos livres nestas datas.
              </div>
            ) : null}
          </div>

          <div style={footerActionStyle}>
              <button onClick={onClose} style={btnCancelStyle}>Desistir</button>
              <button 
                  onClick={handleSubmit} 
                  disabled={!!error || !availability.available || availability.checking || isSubmitting}
                  style={{
                      ...btnConfirmStyle,
                      backgroundColor: (!!error || !availability.available || availability.checking || isSubmitting) ? "#cbd5e1" : "#2563eb",
                      opacity: isSubmitting ? 0.7 : 1
                  }}
              >
                  {isSubmitting ? 'Processando...' : 'Confirmar Remarcação'}
              </button>
          </div>
        </div>
      </div>

      <style>{`
        .day-selected-reschedule {
            background: #3b82f6 !important;
            color: white !important;
            border-radius: 4px;
        }
        .spinner {
            width: 30px;
            height: 30px;
            border: 3px solid #f1f5f9;
            border-top: 3px solid #2563eb;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};


const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', zIndex: 3000, top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
  justifyContent: 'center', alignItems: 'center',
  padding: '15px',
  animation: "fadeIn 0.2s ease"
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: '24px',
  width: '100%',
  maxWidth: '600px',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '92vh',
  overflowY: 'auto',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '25px',
  borderBottom: '1px solid #f1f5f9'
};

const closeBtnStyle: React.CSSProperties = {
  background: '#f1f5f9',
  border: 'none',
  borderRadius: '50%',
  padding: '8px',
  cursor: 'pointer',
  color: '#64748b',
  display: 'flex',
  alignItems: 'center'
};

const warningBoxStyle: React.CSSProperties = {
    backgroundColor: '#fffbeb',
    color: '#92400e',
    padding: '15px',
    borderRadius: '12px',
    marginBottom: '20px',
    fontSize: '0.85rem',
    border: '1px solid #fef3c7',
    lineHeight: '1.5'
};

const legendContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '20px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #f1f5f9'
};

const legendItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    color: '#475569',
    fontWeight: '700',
    textTransform: 'uppercase'
};

const legendCircleStyle: React.CSSProperties = {
    width: 10,
    height: 10,
    borderRadius: '50%'
};

const calendarWrapperStyle: React.CSSProperties = {
    marginBottom: '25px',
    padding: '15px',
    border: '1px solid #f1f5f9',
    borderRadius: '16px',
    backgroundColor: '#fff'
};

const infoBoxStyle: React.CSSProperties = {
    backgroundColor: '#f8fafc',
    padding: '20px',
    borderRadius: '16px',
    marginBottom: '25px',
    border: '1px solid #e2e8f0'
};

const footerActionStyle: React.CSSProperties = {
    display: 'flex',
    gap: '15px'
};

const btnCancelStyle: React.CSSProperties = {
    flex: 1,
    padding: '14px',
    borderRadius: '12px',
    fontWeight: 'bold',
    fontSize: '1rem',
    border: '1px solid #e2e8f0',
    backgroundColor: 'white',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.2s'
};

const btnConfirmStyle: React.CSSProperties = {
    flex: 2,
    padding: '14px',
    borderRadius: '12px',
    fontWeight: '800',
    fontSize: '1rem',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
};

export default RescheduleModal;