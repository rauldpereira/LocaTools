import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import axios from 'axios';
import 'react-calendar/dist/Calendar.css';
import '../../styles/CalendarCommon.css';
import { CheckCircle } from 'lucide-react';

interface Reservation {
    id: number;
    data_inicio: string;
    data_fim: string;
    status: string;
    OrdemDeServico?: {
        id: number;
        status: string;
    };
}

interface UnitCalendarProps {
    unitId: number;
    reservations: Reservation[];
    token: string | null;
    onUpdate: () => void;
    isPicker?: boolean; 
    onSelectRange?: (start: Date, end: Date) => void;
}

const UnitCalendar: React.FC<UnitCalendarProps> = ({ unitId, reservations, token, onUpdate, isPicker, onSelectRange }) => {

    const [pendingSelection, setPendingSelection] = useState<{ start: Date, end: Date } | null>(null);
    const [maintenanceReason, setMaintenanceReason] = useState('');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    
    const [pickerSelection, setPickerSelection] = useState<[Date, Date] | null>(null);

    // Auto-limpar mensagem de sucesso
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

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

        // MODO PICKER, APENAS SELEÇÃO DE PERÍODO PARA NOVA RESERVA
        if (isPicker) {
            const sTime = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12, 0, 0).getTime();
            const eTime = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12, 0, 0).getTime();

            // Verifica se no MEIO do período selecionado existe um dia bloqueado
            const hasConflict = reservations.some(res => {
                const cleanStart = String(res.data_inicio).substring(0, 10);
                const cleanEnd = String(res.data_fim).substring(0, 10);
                const rStart = new Date(cleanStart + "T12:00:00").getTime();
                const rEnd = new Date(cleanEnd + "T12:00:00").getTime();

                // Lógica de overlap (sobreposição de datas)
                return Math.max(sTime, rStart) <= Math.min(eTime, rEnd);
            });

            if (hasConflict) {
                alert('⚠️ Atenção: O período selecionado entra em conflito com uma máquina já alugada ou em manutenção. Escolha datas livres!');
                setPickerSelection(null);
                if (onSelectRange) onSelectRange(null as any, null as any);
                return;
            }

            setPickerSelection([start, end]);
            if (onSelectRange) onSelectRange(start, end);
            return;
        }

        // MODO MANUTENÇÃO
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
                        await axios.delete(`${import.meta.env.VITE_API_URL}/api/units/maintenance/${existingBlock.id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        setSuccessMessage('🔓 Desbloqueado!');
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

    // Função de confirmar manutenção
    const confirmMaintenanceBlock = async (force = false) => {
        if (!pendingSelection || !token) return;

        const { start, end } = pendingSelection;
        const startStr = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');
        const endStr = end.getFullYear() + '-' + String(end.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0'); // Fix: should use end.getDate() but for range blocks it's common

        // Re-calculate dates properly
        const startFormatted = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
        const endFormatted = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/units/${unitId}/maintenance`, {
                data_inicio: startFormatted,
                data_fim: endFormatted,
                motivo: maintenanceReason || 'Manutenção Preventiva',
                forceReallocation: force 
            }, { headers: { Authorization: `Bearer ${token}` } });

            setSuccessMessage('✅ Bloqueio realizado!');
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="availability-calendar-container" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            
            {successMessage && (
                <div style={{
                    position: 'absolute',
                    top: '-10px',
                    zIndex: 10,
                    backgroundColor: '#10b981',
                    color: 'white',
                    padding: '8px 15px',
                    borderRadius: '50px',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.4)',
                    animation: 'slideDown 0.3s ease-out'
                }}>
                    <CheckCircle size={16} />
                    {successMessage}
                </div>
            )}

            <Calendar
                tileClassName={getTileClassName}
                selectRange={true}
                onChange={handleDateChange}
                value={isPicker ? pickerSelection : undefined} 
                minDate={today}
                minDetail="month"
                maxDetail="month"
                prev2Label={null}
                next2Label={null}
            />
            
            <div style={{ fontSize: '0.8rem', marginTop: '10px', display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#cc0000', borderRadius: '2px' }}></div>
                    <span style={{ color: '#444' }}>Alugado</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#ffc800', borderRadius: '2px' }}></div>
                    <span style={{ color: '#444' }}>Manutenção</span>
                </div>
            </div>

            {!isPicker && pendingSelection && (
                <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '8px', border: '1px solid #ffeeba', width: '100%', boxSizing: 'border-box', marginTop: '10px' }}>
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
            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default UnitCalendar;