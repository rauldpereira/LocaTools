import React, { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import axios from 'axios';
import 'react-calendar/dist/Calendar.css';

interface Reservation {
  data_inicio: string;
  data_fim: string;
}

const UnitCalendar: React.FC<{ unitId: number; token: string | null }> = ({ unitId, token }) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    if (!token) return;
    const fetchReservations = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const { data } = await axios.get(`http://localhost:3001/api/units/${unitId}/reservations`, config);
        setReservations(data);
      } catch (error) {
        console.error('Erro ao buscar reservas da unidade:', error);
      }
    };
    fetchReservations();
  }, [unitId, token]);

  const isDateBooked = (date: Date) => {
    // Normaliza a data do calendário para o início do dia, para uma comparação justa
    const calendarDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    return reservations.some(res => {
      // Pega a string da data (ex: "2025-09-16") e cria um objeto Date que ignora o fuso horário
      const startDateParts = res.data_inicio.split('T')[0].split('-').map(Number);
      const endDateParts = res.data_fim.split('T')[0].split('-').map(Number);
      
      const startDate = new Date(startDateParts[0], startDateParts[1] - 1, startDateParts[2]);
      const endDate = new Date(endDateParts[0], endDateParts[1] - 1, endDateParts[2]);

      // Compara as datas normalizadas
      return calendarDate >= startDate && calendarDate <= endDate;
    });
  };

  const tileClassName = ({ date, view }: { date: Date, view: string }) => {
    if (view === 'month' && isDateBooked(date)) {
      return 'booked-day'; // Nome da classe CSS para o dia reservado
    }
    return null;
  };

  return (
    <div>
      <style>{`
        .booked-day { 
          background-color: #FF4136; /* Vermelho */
          color: white; 
          border-radius: 50%;
        }
      `}</style>
      <Calendar tileClassName={tileClassName} />
    </div>
  );
};

export default UnitCalendar;