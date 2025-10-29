import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { parseDateStringAsLocal } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';

interface RescheduleModalProps {
  order: any;
  onClose: () => void;
  onSuccess: () => void;
}

const toISODate = (date: Date) => date.toISOString().split('T')[0];

const RescheduleModal: React.FC<RescheduleModalProps> = ({ order, onClose, onSuccess }) => {
  const { token } = useAuth();

  const originalStartDate = parseDateStringAsLocal(order.data_inicio);
  const originalEndDate = parseDateStringAsLocal(order.data_fim);
  const oneDay = 1000 * 60 * 60 * 24;
  const originalDurationMs = originalEndDate.getTime() - originalStartDate.getTime();
  const originalDurationDays = Math.round(originalDurationMs / oneDay);

  const [newStartDate, setNewStartDate] = useState(order.data_inicio.split('T')[0]);
  const [newEndDate, setNewEndDate] = useState(order.data_fim.split('T')[0]);

  const [availabilityData, setAvailabilityData] = useState<{ [key: string]: number }>({});
  const [loadingCalendar, setLoadingCalendar] = useState(true);

  const [availability, setAvailability] = useState<{ available: boolean | null, checking: boolean }>({ available: null, checking: false });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + 60);

    const fetchDailyAvailability = async () => {
      if (!order.ItemReservas || order.ItemReservas.length === 0) return;
      setLoadingCalendar(true);
      try {
        const { data } = await axios.get(`http://localhost:3001/api/equipment/${order.ItemReservas[0].Unidade.Equipamento.id}/daily-availability`, {
          params: {
            startDate: toISODate(today),
            endDate: toISODate(endDate),
            excludeOrderId: order.id
          }
        });

        setAvailabilityData(data.availabilityByDay);
      } catch (error) {
        console.error("Erro ao buscar disponibilidade diária", error);
      } finally {
        setLoadingCalendar(false);
      }
    };
    fetchDailyAvailability();
  }, [order.id, order.ItemReservas]);

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
    const availability = availabilityData[dayString];

    const start = parseDateStringAsLocal(order.data_inicio);
    const end = parseDateStringAsLocal(order.data_fim);
    if (date >= start && date <= end) {
      return 'day-blue';
    }

    if (availability === undefined) return 'day-disabled';

    const totalUnits = order.ItemReservas[0].Unidade.Equipamento.total_quantidade;
    if (totalUnits === 0) return 'day-red';

    const percentage = (availability / totalUnits) * 100;

    if (availability === 0) return 'day-red';
    if (percentage <= 50) return 'day-yellow';
    return 'day-green';
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


        {loadingCalendar ? <p>Carregando calendário...</p> : (
          <Calendar
            onChange={handleDateChange}
            value={parseDateStringAsLocal(newStartDate)}
            selectRange={false}
            minDate={new Date()}
            tileClassName={getTileClassName}
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