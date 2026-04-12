import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './Admin/GerenciamentoCalendario.css';
import { parseDateStringAsLocal } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';

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

const toISODate = (date: Date) => date.toISOString().split('T')[0];

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
  const [loadingCalendar, setLoadingCalendar] = useState(true);

  const [isLoadingMonth, setIsLoadingMonth] = useState(false);

  const [statusDias, setStatusDias] = useState<Map<string, IDiaStatus>>(new Map());
  const [currentMonthView, setCurrentMonthView] = useState(new Date());
  const [minDate, setMinDate] = useState<Date | undefined>(undefined);
  const [maxDate, setMaxDate] = useState<Date | undefined>(undefined);


  useEffect(() => {
    if (isLoadingAuth || !isLoggedIn) return;

    const fetchMesesPublicados = async () => {
      try {
        setLoadingCalendar(true);
        setError('');

        const { data: meses } = await axios.get<IMesPublicado[]>(
          `${import.meta.env.VITE_API_URL}/api/calendario/meses-publicados`
        );

        if (meses.length === 0) {
          setError("Nenhum mês disponível para reagendamento.");
          setLoadingCalendar(false);
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

      } catch (err) {
        console.error("Erro ao buscar meses publicados:", err);
        setError("Erro ao carregar meses disponíveis.");
        setLoadingCalendar(false);
      }
    };

    fetchMesesPublicados();
  }, [isLoadingAuth, isLoggedIn]);


  useEffect(() => {
    if (!minDate) return;

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
  }, [currentMonthView, minDate]);


  useEffect(() => {

    if (!minDate || !maxDate || !order.ItemReservas || order.ItemReservas.length === 0) return;

    const fetchDailyAvailability = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/equipment/${order.ItemReservas[0].Unidade.Equipamento.id}/daily-availability`, {
          params: {
            startDate: toISODate(minDate),
            endDate: toISODate(maxDate),
            excludeOrderId: order.id
          }
        });

        setAvailabilityData(data.availabilityByDay);
      } catch (error) {
        console.error("Erro ao buscar disponibilidade diária", error);
        setError("Erro ao carregar disponibilidade do item.");
      } finally {
        setLoadingCalendar(false);
      }
    };
    fetchDailyAvailability();
  }, [minDate, maxDate, order.id, order.ItemReservas]);

  useEffect(() => {
    if (!newStartDate || !newEndDate) return;
    setAvailability({ available: null, checking: true });
    setError('');
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
  }, [newStartDate, newEndDate, order.id, token]);


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
      return (diaStatusAdmin.fonte === 'padrao') ? 'day-fechado-padrao' : 'day-red';
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
    const diaStatusAdmin = statusDias.get(dayString);
    const availabilityEstoque = availabilityData[dayString];

    if (!diaStatusAdmin || diaStatusAdmin.status === 'FECHADO') return true;

    if (availabilityEstoque === undefined || availabilityEstoque === 0) return true;

    if (maxDate) {
      const endOfSelection = new Date(date.getTime() + originalDurationMs);
      if (endOfSelection > maxDate) return true;
    }

    return false;
  };


  const handleDateChange = (value: any) => {
    const clickedDate = value as Date;
    
    if (isPastOrToday) {
      if (clickedDate < originalStartDate) return;
      setNewEndDate(toISODate(clickedDate));
    } else {
      const newEnd = new Date(clickedDate.getTime() + originalDurationMs);
      setNewStartDate(toISODate(clickedDate));
      setNewEndDate(toISODate(newEnd));
    }
  };

  const handleSubmit = async () => {
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

  const handleContentClick = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={handleContentClick}>
        <button onClick={onClose} style={closeButtonStyle}>&times;</button>
        
        <div style={{ marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '1.5rem', color: '#2c3e50' }}>Remarcar Pedido #{order.id}</h2>
            <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                Período Atual: <strong>{originalStartDate.toLocaleDateString()}</strong> a <strong>{originalEndDate.toLocaleDateString()}</strong>
            </p>
        </div>

        {isPastOrToday && (
          <div style={warningBoxStyle}>
            ⚠️ <strong>Pedido em andamento:</strong> A data de início está fixada. Escolha no calendário apenas a nova data de <strong>término</strong>.
          </div>
        )}

        <div style={legendContainerStyle}>
          <div style={legendItemStyle}><div className="day-green" style={legendCircleStyle}></div> Disponível</div>
          <div style={legendItemStyle}><div className="day-red" style={legendCircleStyle}></div> Indisponível</div>
          <div style={legendItemStyle}><div style={{ ...legendCircleStyle, backgroundColor: '#3498db' }}></div> Sua Seleção</div>
        </div>

        <div style={calendarWrapperStyle}>
            {(loadingCalendar || isLoadingMonth) ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                    <div className="spinner"></div>
                    <p>Carregando disponibilidade...</p>
                </div>
            ) : error && !availabilityData ? (
                <p style={{ color: '#e74c3c', textAlign: 'center', padding: '20px' }}>{error}</p>
            ) : (
                <Calendar
                    onChange={handleDateChange}
                    value={parseDateStringAsLocal(newStartDate)}
                    selectRange={false}
                    minDate={minDate}
                    maxDate={maxDate}
                    activeStartDate={currentMonthView}
                    onActiveStartDateChange={({ activeStartDate }) => setCurrentMonthView(activeStartDate || new Date())}
                    tileClassName={getTileClassName}
                    tileDisabled={tileDisabled}
                    minDetail="month"
                    maxDetail="month"
                />
            )}
        </div>

        <div style={infoBoxStyle}>
          <div style={{ marginBottom: '10px' }}>
            <span style={{ color: '#7f8c8d', fontSize: '0.85rem', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>Novo Período Selecionado</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2c3e50' }}>
                {parseDateStringAsLocal(newStartDate).toLocaleDateString()} — {parseDateStringAsLocal(newEndDate).toLocaleDateString()}
            </div>
          </div>
          
          {availability.checking ? (
            <div style={{ color: '#3498db', fontSize: '0.9rem' }}>Verificando estoque...</div>
          ) : availability.available === true ? (
            <div style={{ color: '#27ae60', fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                ✅ Período disponível para alteração
            </div>
          ) : availability.available === false ? (
            <div style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: '0.95rem' }}>
                ❌ Indisponível: Não há equipamentos livres nestas datas.
            </div>
          ) : null}
        </div>

        <div style={footerActionStyle}>
            <button 
                onClick={onClose} 
                style={btnCancelStyle}
            >
                Cancelar
            </button>
            <button 
                onClick={handleSubmit} 
                disabled={!availability.available || availability.checking || isSubmitting}
                style={{
                    ...btnConfirmStyle,
                    opacity: (!availability.available || availability.checking || isSubmitting) ? 0.6 : 1,
                    cursor: (!availability.available || availability.checking || isSubmitting) ? 'not-allowed' : 'pointer'
                }}
            >
                {isSubmitting ? 'Processando...' : 'Confirmar Alteração'}
            </button>
        </div>
      </div>

      <style>{`
        .day-selected-reschedule {
            background: #3498db !important;
            color: white !important;
            border-radius: 4px;
        }
        .spinner {
            width: 30px;
            height: 30px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .react-calendar {
            width: 100% !important;
            border: none !important;
            font-family: inherit !important;
        }
        @media (max-width: 480px) {
            h2 { fontSize: 1.2rem !important; }
        }
      `}</style>
    </div>
  );
};


const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', zIndex: 1000, top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
  justifyContent: 'center', alignItems: 'center',
  padding: '15px'
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: '30px',
  borderRadius: '16px',
  width: '100%',
  maxWidth: '550px',
  position: 'relative',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
};

const warningBoxStyle: React.CSSProperties = {
    backgroundColor: '#fff3cd',
    color: '#856404',
    padding: '12px 15px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '0.85rem',
    border: '1px solid #ffeeba',
    lineHeight: '1.4'
};

const legendContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '20px',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
};

const legendItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.75rem',
    color: '#666',
    fontWeight: '600'
};

const legendCircleStyle: React.CSSProperties = {
    width: 12,
    height: 12,
    borderRadius: '50%',
    marginRight: '5px'
};

const calendarWrapperStyle: React.CSSProperties = {
    marginBottom: '25px',
    padding: '10px',
    border: '1px solid #eee',
    borderRadius: '12px'
};

const infoBoxStyle: React.CSSProperties = {
    backgroundColor: '#f1f4f9',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '25px'
};

const footerActionStyle: React.CSSProperties = {
    display: 'flex',
    gap: '15px',
    marginTop: '10px'
};

const btnBaseStyle: React.CSSProperties = {
    flex: 1,
    padding: '14px',
    borderRadius: '10px',
    fontWeight: 'bold',
    fontSize: '1rem',
    border: 'none',
    transition: 'all 0.2s ease'
};

const btnCancelStyle: React.CSSProperties = {
    ...btnBaseStyle,
    backgroundColor: '#eee',
    color: '#666',
    cursor: 'pointer'
};

const btnConfirmStyle: React.CSSProperties = {
    ...btnBaseStyle,
    backgroundColor: '#3498db',
    color: 'white',
    boxShadow: '0 4px 10px rgba(52,152,219,0.3)'
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '20px',
  right: '20px',
  cursor: 'pointer',
  background: '#f8f9fa',
  border: 'none',
  fontSize: '1.2rem',
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#999'
};


export default RescheduleModal;