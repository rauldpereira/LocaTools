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
          'http://localhost:3001/api/calendario/meses-publicados'
        );

        if (meses.length === 0) {
          setError("Nenhum mês disponível para reagendamento.");
          setLoadingCalendar(false);
          return;
        }

        const primeiroMes = meses[0];
        const ultimoMes = meses[meses.length - 1];

        const adminMinDate = new Date(primeiroMes.ano, primeiroMes.mes - 1, 1);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

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
          'http://localhost:3001/api/calendario/status-mensal',
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
        const { data } = await axios.get(`http://localhost:3001/api/equipment/${order.ItemReservas[0].Unidade.Equipamento.id}/daily-availability`, {
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
        const { data } = await axios.post(`http://localhost:3001/api/reservations/${order.id}/check-reschedule`, {
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

    if (date >= newStart && date <= newEnd) {
      return 'day-blue';
    }

    if (date.getMonth() !== currentMonthView.getMonth()) {
      return 'day-neighboring-month';
    }

    const diaStatusAdmin = statusDias.get(dayString);
    const availabilityEstoque = availabilityData[dayString];

    if (!diaStatusAdmin) {
      return null;
    }
    if (diaStatusAdmin.status === 'FECHADO') {
      return (diaStatusAdmin.fonte === 'padrao')
        ? 'day-fechado-padrao'
        : 'day-red';
    }

    if (availabilityEstoque === undefined) return null;
    if (availabilityEstoque === 0) return 'day-red'; 

    const totalUnits = order.ItemReservas[0].Unidade.Equipamento.total_quantidade;
    if (totalUnits === 0) return 'day-red';

    const percentage = (availabilityEstoque / totalUnits) * 100;
    if (percentage <= 50) return 'day-yellow';

    return 'day-green';
  };


  const tileDisabled = ({ date, view }: { date: Date, view: string }): boolean => {
    if (view !== 'month') return false;

    if (loadingCalendar || isLoadingMonth) {
      return true;
    }

    if (date.getMonth() !== currentMonthView.getMonth()) {
      return true;
    }

    if (date >= originalStartDate && date <= originalEndDate) {
      return false;
    }

    const dayString = toISODate(date);
    const diaStatusAdmin = statusDias.get(dayString);
    const availabilityEstoque = availabilityData[dayString];

    if (!diaStatusAdmin || diaStatusAdmin.status === 'FECHADO') {
      return true;
    }

    if (availabilityEstoque === undefined || availabilityEstoque === 0) {
      return true;
    }

    if (maxDate) {
      const endOfSelection = new Date(date.getTime() + originalDurationMs);
      if (endOfSelection > maxDate) {
        return true;
      }
    }

    return false;
  };


  const handleDateChange = (value: any) => {
    const newStart = value as Date;
    const newEnd = new Date(newStart.getTime() + originalDurationMs);
    setNewStartDate(toISODate(newStart));
    setNewEndDate(toISODate(newEnd));
  };

  const handleSubmit = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`http://localhost:3001/api/reservations/${order.id}/reschedule`, { newStartDate, newEndDate }, config);
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
        <h2>Remarcar Pedido #{order.id}</h2>
        <p>Datas atuais: {parseDateStringAsLocal(order.data_inicio).toLocaleDateString()} a {parseDateStringAsLocal(order.data_fim).toLocaleDateString()}</p>
        <p style={{ fontWeight: 'bold' }}>Duração: {originalDurationDays + 1} dias (esta duração será mantida).</p>

        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Disponibilidade</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="day-green" style={{ width: 15, height: 15, marginRight: 5 }}></div> Alta
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="day-yellow" style={{ width: 15, height: 15, marginRight: 5 }}></div> Baixa
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="day-red" style={{ width: 15, height: 15, marginRight: 5 }}></div> Indisponível
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="day-blue" style={{ width: 15, height: 15, marginRight: 5 }}></div> Seu aluguel
            </div>
          </div>
        </div>

        {(loadingCalendar || isLoadingMonth) ? <p>Carregando calendário...</p> :
          error ? <p style={{ color: 'red' }}>{error}</p> : (
            <Calendar
              onChange={handleDateChange}
              value={parseDateStringAsLocal(newStartDate)}
              selectRange={false}

              minDate={minDate}
              maxDate={maxDate}
              activeStartDate={currentMonthView}
              onActiveStartDateChange={({ activeStartDate }) =>
                setCurrentMonthView(activeStartDate || new Date())
              }

              tileClassName={getTileClassName}
              tileDisabled={tileDisabled}

              minDetail="month"
              maxDetail="month"
            />
          )}

        <div style={{ margin: '1rem 0', minHeight: '24px' }}>
          <p>Novo Período: <strong>{parseDateStringAsLocal(newStartDate).toLocaleDateString()}</strong> a <strong>{parseDateStringAsLocal(newEndDate).toLocaleDateString()}</strong></p>
          {availability.checking && <p>Verificando disponibilidade...</p>}
          {availability.available === true && <p style={{ color: 'green', fontWeight: 'bold' }}>Datas disponíveis!</p>}
          {availability.available === false && <p style={{ color: 'red', fontWeight: 'bold' }}>Datas indisponíveis.</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>

        <button onClick={handleSubmit} disabled={!availability.available || availability.checking || isSubmitting}>
          {isSubmitting ? 'Processando...' : 'Confirmar Remarcação'}
        </button>
      </div>
    </div>
  );
};


const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', zIndex: 1000, top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
  justifyContent: 'center', alignItems: 'center'
};
const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'var(--cor-fundo-modal)',
  color: 'var(--cor-texto-principal)',
  padding: '2rem',
  borderRadius: '8px',
  border: '1px solid var(--cor-borda)',
  width: '90%',
  maxWidth: '500px',
  position: 'relative'
};
const closeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '15px',
  right: '15px',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  fontSize: '1.5rem',
  color: 'var(--cor-texto-principal)'
};


export default RescheduleModal;