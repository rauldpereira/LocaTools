import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Calendar from 'react-calendar';
//import 'react-calendar/dist/Calendar.css';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import HorarioFuncionamento from './HorarioFuncionamento';

const AvailabilityCalendarModal: React.FC<{ equipment: any, onClose: () => void }> = ({ equipment, onClose }) => {
    const { addToCart } = useCart();
    const { isLoggedIn } = useAuth();
    const navigate = useNavigate();
    const [availabilityData, setAvailabilityData] = useState<{ [key: string]: number }>({});
    const [selectedRange, setSelectedRange] = useState<Date[] | null>(null);
    const [availableForRange, setAvailableForRange] = useState<number | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const today = new Date();
        const endDate = new Date();
        endDate.setDate(today.getDate() + 60);

        const fetchDailyAvailability = async () => {
            try {
                const { data } = await axios.get(`http://localhost:3001/api/equipment/${equipment.id}/daily-availability`, {
                    params: {
                        startDate: today.toISOString().split('T')[0],
                        endDate: endDate.toISOString().split('T')[0]
                    }
                });
                setAvailabilityData(data.availabilityByDay);
            } catch (error) {
                console.error("Erro ao buscar disponibilidade diária", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDailyAvailability();
    }, [equipment.id]);

    useEffect(() => {
        if (selectedRange && selectedRange.length === 2) {
            let minAvailability = Infinity;
            for (let day = new Date(selectedRange[0]); day <= selectedRange[1]; day.setDate(day.getDate() + 1)) {
                const dayString = day.toISOString().split('T')[0];
                const availability = availabilityData[dayString];
                if (availability < minAvailability) { minAvailability = availability; }
            }
            setAvailableForRange(minAvailability);
            setQuantity(1);
        } else {
            setAvailableForRange(null);
        }
    }, [selectedRange, availabilityData]);

    const getTileClassName = ({ date, view }: { date: Date, view: string }) => {
        if (view !== 'month') return null;
        const dayString = date.toISOString().split('T')[0];
        const availability = availabilityData[dayString];
        if (availability === undefined) return null;
        const percentage = (availability / equipment.total_quantidade) * 100;

        if (availability === 0) return 'day-red';
        if (percentage <= 50) return 'day-yellow';
        return 'day-green';
    };

    const handleAddToCart = () => {
        if (!isLoggedIn || !selectedRange) return;

        const startDate = selectedRange[0];
        const endDate = selectedRange[1];

        const startDateString = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
        const endDateString = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

        const item = {
            id_equipamento: equipment.id,
            nome: equipment.nome,
            quantidade: quantity,
            data_inicio: startDateString,
            data_fim: endDateString,
            preco: equipment.preco_diaria,
        };
        addToCart(item);
        onClose();
        navigate('/cart');
    };

    const handleContentClick = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div style={modalOverlayStyle} onClick={onClose}>
            <div style={modalContentStyle} onClick={handleContentClick}>
                <button onClick={onClose} style={{ position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--cor-texto-principal)', cursor: 'pointer' }}>&times;</button>
                <h2>Disponibilidade para {equipment.nome}</h2>
                <p>Selecione o período desejado no calendário.</p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="day-green" style={{ width: 15, height: 15, marginRight: 5 }}></div> Alta
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="day-yellow" style={{ width: 15, height: 15, marginRight: 5 }}></div> Baixa
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="day-red" style={{ width: 15, height: 15, marginRight: 5 }}></div> Indisponível
                    </div>
                </div>

                {loading ? <p>Carregando calendário...</p> : (
                    <Calendar
                        onChange={(value) => setSelectedRange(value as Date[])}
                        selectRange={true}
                        tileClassName={getTileClassName}
                        minDate={new Date()}
                    />
                )}

                {availableForRange !== null && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--cor-borda)', paddingTop: '1rem' }}>
                        <h3>Período Selecionado</h3>
                        <p>De: {selectedRange![0].toLocaleDateString()} a {selectedRange![1].toLocaleDateString()}</p>
                        <p style={{ fontWeight: 'bold' }}>Unidades disponíveis para todo o período: {availableForRange}</p>
                        {availableForRange > 0 && (
                            <div>
                                <label>Quantidade: </label>
                                <input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} min="1" max={availableForRange} />
                                <button onClick={handleAddToCart} style={{ marginLeft: '1rem' }}>Adicionar ao Carrinho</button>
                            </div>
                        )}
                    </div>
                )}

                <HorarioFuncionamento />
            </div>
        </div>
    );
};

const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = {
    backgroundColor: 'var(--cor-fundo-modal)',
    color: 'var(--cor-texto-principal)',
    padding: '2rem',
    borderRadius: '8px',
    width: 'auto',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative'
};

export default AvailabilityCalendarModal;