import React, { useState } from 'react';
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

    const [pendingSelection, setPendingSelection] = useState<{ start: Date, end: Date } | null>(null);
    const [maintenanceReason, setMaintenanceReason] = useState('');

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

        setPendingSelection({ start, end });
        setMaintenanceReason('');
    };

    const confirmMaintenanceBlock = async (force = false) => {
        if (!pendingSelection || !token) return;

        const { start, end } = pendingSelection;
        const startStr = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');
        const endStr = end.getFullYear() + '-' + String(end.getMonth() + 1).padStart(2, '0') + '-' + String(end.getDate()).padStart(2, '0');

        try {
            await axios.post(`http://localhost:3001/api/units/${unitId}/maintenance`, {
                data_inicio: startStr,
                data_fim: endStr,
                motivo: maintenanceReason || 'Manutenção Preventiva',
                forceReallocation: force 
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert('✅ Bloqueio realizado com sucesso!');
            setPendingSelection(null);
            setMaintenanceReason('');
            onUpdate();
            
        } catch (error: any) {
            if (error.response?.status === 409 && error.response?.data?.requiresConfirmation) {
                if (window.confirm(error.response.data.message)) {
                    confirmMaintenanceBlock(true);
                } else {
                    setPendingSelection(null);
                }
            } else {
                alert(error.response?.data?.error || 'Erro ao bloquear datas.');
                setPendingSelection(null);
            }
        }
    };


    return (
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            <Calendar
                tileClassName={getTileClassName}
                selectRange={true}
                onChange={handleDateChange}
            />
            
            <div style={{ fontSize: '0.8rem', marginTop: '5px', display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '15px' }}>
                <span style={{ color: '#cc0000' }}>■ Alugado</span>
                <span style={{ color: '#ffc800' }}>■ Manutenção</span>
            </div>

            {pendingSelection && (
                <div style={{
                    backgroundColor: '#fff3cd', 
                    padding: '15px', 
                    borderRadius: '8px', 
                    border: '1px solid #ffeeba',
                    width: '100%',
                    boxSizing: 'border-box',
                    marginTop: '10px'
                }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>
                        Bloquear de {pendingSelection.start.toLocaleDateString()} a {pendingSelection.end.toLocaleDateString()}
                    </h4>
                    
                    <label style={{ display: 'block', fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>
                        Qual o motivo da manutenção?
                    </label>
                    <input 
                        type="text" 
                        value={maintenanceReason}
                        onChange={(e) => setMaintenanceReason(e.target.value)}
                        placeholder="Ex: Troca de óleo, Reparo no motor..."
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '10px', boxSizing: 'border-box' }}
                        autoFocus
                    />
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            onClick={() => confirmMaintenanceBlock(false)}
                            style={{ flex: 1, backgroundColor: '#dc3545', color: 'white', padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Confirmar Bloqueio
                        </button>
                        <button 
                            onClick={() => { setPendingSelection(null); setMaintenanceReason(''); }}
                            style={{ padding: '8px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UnitCalendar;