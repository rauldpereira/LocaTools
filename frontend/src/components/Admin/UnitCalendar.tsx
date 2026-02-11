import React from 'react';
import Calendar from 'react-calendar';
import axios from 'axios';
import 'react-calendar/dist/Calendar.css'; 

interface Reservation {
  id: number;
  data_inicio: string;
  data_fim: string;
  status: string;
}

interface UnitCalendarProps {
  unitId: number;
  reservations: Reservation[];
  token: string | null;
  onUpdate: () => void;
}

const UnitCalendar: React.FC<UnitCalendarProps> = ({ unitId, reservations, token, onUpdate }) => {

  const getTileClassName = ({ date, view }: { date: Date, view: string }) => {
    if (view !== 'month') return null;

    const checkDate = new Date(date.setHours(0,0,0,0));

    const found = reservations.find(res => {
      const start = new Date(new Date(res.data_inicio).setHours(0,0,0,0));
      const end = new Date(new Date(res.data_fim).setHours(23,59,59,999));
      return checkDate >= start && checkDate <= end;
    });

    if (found) {
      if (found.status === 'manutencao') return 'bloqueio-manutencao';
      return 'alugado-cliente';
    }
    return null;
  };

  const handleDateChange = async (value: any) => {
    const [start, end] = Array.isArray(value) ? value : [value, value];

    if (!token) return;

    const clickedDate = new Date(start).getTime();
    const existingBlock = reservations.find(res => {
        const rStart = new Date(res.data_inicio).getTime();
        const rEnd = new Date(res.data_fim).getTime();
        return clickedDate >= rStart && clickedDate <= rEnd;
    });

    // Clicou em algo existente
    if (existingBlock) {
        if (existingBlock.status === 'manutencao') {
            if (window.confirm('Desbloquear esta data de manutenção?')) {
                try {
                    await axios.delete(`http://localhost:3001/api/units/maintenance/${existingBlock.id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    onUpdate();
                } catch (error) { alert('Erro ao desbloquear.'); }
            }
        } else {
            alert('Esta data está alugada para um cliente (Reserva #' + existingBlock.id + '). Não pode alterar por aqui.');
        }
        return;
    }

    // Clicou em data livre -> Criar Manutenção
    if (window.confirm(`Bloquear unidade para manutenção de ${start.toLocaleDateString()} até ${end.toLocaleDateString()}?`)) {
        try {
            await axios.post(`http://localhost:3001/api/units/${unitId}/maintenance`, {
                data_inicio: start,
                data_fim: end,
                descricao: 'Bloqueio Manual via Calendário'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onUpdate();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Erro ao bloquear datas.');
        }
    }
  };

  return (
    <div style={{ marginTop: '10px' }}>
        <Calendar 
            tileClassName={getTileClassName}
            selectRange={true}
            onChange={handleDateChange}
        />
        <div style={{fontSize:'0.8rem', marginTop:'5px', display:'flex', gap:'10px'}}>
            <span style={{color:'#cc0000'}}>■ Alugado</span>
            <span style={{color:'#ffc800'}}>■ Manutenção</span>
        </div>
    </div>
  );
};

export default UnitCalendar;