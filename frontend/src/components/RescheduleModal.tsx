import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { parseDateStringAsLocal } from '../utils/dateUtils';

interface RescheduleModalProps {
    order: any;
    token: string | null;
    onClose: () => void;
    onSuccess: () => void;
}

const RescheduleModal: React.FC<RescheduleModalProps> = ({ order, token, onClose, onSuccess }) => {
    const [newStartDate, setNewStartDate] = useState(order.data_inicio.split('T')[0]);
    const [newEndDate, setNewEndDate] = useState(order.data_fim.split('T')[0]);
    const [availability, setAvailability] = useState<{ available: boolean | null, checking: boolean }>({ available: null, checking: false });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const dataInicioOriginal = new Date(order.data_inicio);
    const hoje = new Date();
    const diffTime = dataInicioOriginal.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const taxaRemarcacao = (diffDays <= 2) ? (Number(order.valor_total) * 0.05) : 0;

    useEffect(() => {
        if (!newStartDate || !newEndDate || new Date(newEndDate) < new Date(newStartDate)) {
            setAvailability({ available: null, checking: false });
            return;
        }

        setAvailability({ available: null, checking: true });
        const check = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const { data } = await axios.post(`http://localhost:3001/api/reservations/${order.id}/check-reschedule`, {
                    startDate: newStartDate,
                    endDate: newEndDate
                }, config);
                setAvailability({ available: data.available, checking: false });
            } catch (err) {
                setError("Erro ao verificar disponibilidade.");
                setAvailability({ available: false, checking: false });
            }
        };

        const timer = setTimeout(check, 500);
        return () => clearTimeout(timer);
    }, [newStartDate, newEndDate, order.id, token]);

    const handleSubmit = async () => {
        setError('');
        setIsSubmitting(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const { data } = await axios.put(`http://localhost:3001/api/reservations/${order.id}/reschedule`, { newStartDate, newEndDate }, config);

            alert(data.message);
            onSuccess();
        } catch(err: any) {
            setError(err.response?.data?.error || "Não foi possível processar a remarcação.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleContentClick = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div style={modalOverlayStyle} onClick={onClose}>
            <div style={modalContentStyle} onClick={handleContentClick}>
                <h2>Remarcar Pedido #{order.id}</h2>
                 <p>Datas atuais: {parseDateStringAsLocal(order.data_inicio).toLocaleDateString()} a {parseDateStringAsLocal(order.data_fim).toLocaleDateString()}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label>Nova Data de Início: <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} /></label>
                    <label>Nova Data de Fim: <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} /></label>
                </div>

                <div style={{ margin: '1rem 0', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
                    {taxaRemarcacao > 0 ? (
                        <p style={{ color: 'orange', fontWeight: 'bold', margin: 0 }}>
                            Atenção: Será adicionada uma taxa de R$ {taxaRemarcacao.toFixed(2)} ao pagamento final.
                        </p>
                    ) : (
                        <p style={{ color: 'green', fontWeight: 'bold', margin: 0 }}>
                            Remarcação sem custo adicional.
                        </p>
                    )}
                </div>

                <div style={{ margin: '1rem 0', minHeight: '24px' }}>
                    {availability.checking && <p>A verificar disponibilidade...</p>}
                    {availability.available === true && <p style={{ color: 'green' }}>Datas disponíveis!</p>}
                    {availability.available === false && <p style={{ color: 'red' }}>Datas indisponíveis.</p>}
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                </div>

                <button onClick={handleSubmit} disabled={!availability.available || availability.checking || isSubmitting}>
                    {isSubmitting ? 'A processar...' : 'Confirmar Remarcação'}
                </button>
                <button onClick={onClose} style={{ marginLeft: '1rem' }}>Cancelar</button>
            </div>
        </div>
    );
};

const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed', zIndex: 1000, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
    justifyContent: 'center', alignItems: 'center'
};
const modalContentStyle: React.CSSProperties = {
    backgroundColor: 'white', color: '#333', padding: '2rem',
    borderRadius: '8px', width: '90%', maxWidth: '500px'
};

export default RescheduleModal;