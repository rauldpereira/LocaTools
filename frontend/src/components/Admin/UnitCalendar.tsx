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

        const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0).getTime();

        const found = reservations.find(res => {
            const cleanStart = String(res.data_inicio).substring(0, 10);
            const cleanEnd = String(res.data_fim).substring(0, 10);

            const start = new Date(cleanStart + "T12:00:00").getTime();
            const end = new Date(cleanEnd + "T12:00:00").getTime();

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

        const clickedDate = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12, 0, 0).getTime();

        const existingBlock = reservations.find(res => {
            const cleanStart = String(res.data_inicio).substring(0, 10);
            const cleanEnd = String(res.data_fim).substring(0, 10);

            const rStart = new Date(cleanStart + "T12:00:00").getTime();
            const rEnd = new Date(cleanEnd + "T12:00:00").getTime();

            return clickedDate >= rStart && clickedDate <= rEnd;
        });

        if (existingBlock) {
            if (existingBlock.status === 'manutencao') {
                if (window.confirm('Desbloquear esta data de manutenção?')) {
                    try {
                        await axios.delete(`http://localhost:3001/api/units/maintenance/${existingBlock.id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        alert('🔓 Desbloqueado com sucesso!');
                        onUpdate();
                    } catch (error) { alert('Erro ao desbloquear.'); }
                }
            } else {
                alert('Esta data está alugada para um cliente (Reserva #' + existingBlock.id + '). Não pode alterar por aqui.');
            }
            return;
        }

        if (window.confirm(`Bloquear unidade para manutenção de ${start.toLocaleDateString()} até ${end.toLocaleDateString()}?`)) {

            const startStr = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');
            const endStr = end.getFullYear() + '-' + String(end.getMonth() + 1).padStart(2, '0') + '-' + String(end.getDate()).padStart(2, '0');

            const requestMaintenance = async (force = false) => {
                try {
                    await axios.post(`http://localhost:3001/api/units/${unitId}/maintenance`, {
                        data_inicio: startStr,
                        data_fim: endStr,
                        descricao: 'Bloqueio Manual via Calendário',
                        forceReallocation: force 
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    alert('✅ Bloqueio realizado com sucesso!');
                    onUpdate();
                } catch (error: any) {
                    if (error.response?.status === 409 && error.response?.data?.requiresConfirmation) {
                        if (window.confirm(error.response.data.message)) {
                            requestMaintenance(true);
                        }
                    } else {
                        alert(error.response?.data?.error || 'Erro ao bloquear datas.');
                    }
                }
            };

            requestMaintenance();
        }
    };

    return (
        <div style={{ marginTop: '10px' }}>
            <Calendar
                tileClassName={getTileClassName}
                selectRange={true}
                onChange={handleDateChange}
            />
            <div style={{ fontSize: '0.8rem', marginTop: '5px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <span style={{ color: '#cc0000' }}>■ Alugado</span>
                <span style={{ color: '#ffc800' }}>■ Manutenção</span>
            </div>
        </div>
    );
};

export default UnitCalendar;