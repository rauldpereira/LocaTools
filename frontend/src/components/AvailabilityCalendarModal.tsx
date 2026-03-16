import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Calendar from 'react-calendar';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import HorarioFuncionamento from './HorarioFuncionamentoDisplay';

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

const toISODate = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const AvailabilityCalendarModal: React.FC<{ equipment: any, onClose: () => void }> = ({ equipment, onClose }) => {
    const { addToCart } = useCart();
    const navigate = useNavigate();

    const [availabilityData, setAvailabilityData] = useState<{ [key: string]: number }>({});
    const [selectedRange, setSelectedRange] = useState<Date[] | null>(null);
    const [availableForRange, setAvailableForRange] = useState<number | null>(null);
    const [quantity, setQuantity] = useState(1);

    const [statusDias, setStatusDias] = useState<Map<string, IDiaStatus>>(new Map());
    const [currentMonthView, setCurrentMonthView] = useState(new Date());
    const [minDate, setMinDate] = useState<Date | undefined>(undefined);
    const [maxDate, setMaxDate] = useState<Date | undefined>(undefined);

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // CARREGA OS MESES
    useEffect(() => {
        const fetchMesesPublicados = async () => {
            try {
                setLoading(true);
                setErrorMessage(null);

                const { data: meses } = await axios.get<IMesPublicado[]>(
                    'http://localhost:3001/api/calendario/meses-publicados'
                );

                if (meses.length === 0) {
                    setErrorMessage("Nenhum mês disponível para agendamento no momento.");
                    setLoading(false);
                    return;
                }

                const primeiroMes = meses[0];
                const ultimoMes = meses[meses.length - 1];

                const adminMinDate = new Date(primeiroMes.ano, primeiroMes.mes - 1, 1);

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const effectiveMinDate = adminMinDate < today ? today : adminMinDate;

                const dataMax = new Date(ultimoMes.ano, ultimoMes.mes, 0);

                setMinDate(effectiveMinDate);
                setMaxDate(dataMax);
                setCurrentMonthView(effectiveMinDate);

            } catch (err) {
                console.error("Erro ao buscar meses publicados:", err);
                setErrorMessage("Erro ao carregar meses disponíveis.");
                setLoading(false);
            }
        };

        fetchMesesPublicados();
    }, []);


    // CARREGA OS FERIADOS E DIAS FECHADOS
    useEffect(() => {
        if (!minDate) return;

        const fetchStatusMensal = async () => {
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
            }
        };

        fetchStatusMensal();
    }, [currentMonthView, minDate]);

    // CARREGA A DISPONIBILIDADE DO EQUIPAMENTO
    useEffect(() => {
        if (!minDate || !maxDate || !equipment.id) return;

        const fetchDailyAvailability = async () => {
            try {
                const { data } = await axios.get(`http://localhost:3001/api/equipment/${equipment.id}/daily-availability`, {
                    params: {
                        startDate: toISODate(minDate),
                        endDate: toISODate(maxDate)
                    }
                });
                setAvailabilityData(data.availabilityByDay);
            } catch (error) {
                console.error("Erro ao buscar disponibilidade diária do equipamento", error);
                setErrorMessage("Não foi possível carregar a disponibilidade deste item.");
            } finally {
                setLoading(false);
            }
        };
        fetchDailyAvailability();
    }, [minDate, maxDate, equipment.id]);


    // LÓGICA DE CÁLCULO DE UNIDADES QUANDO CLICA NO CALENDÁRIO

   useEffect(() => {
        if (selectedRange && selectedRange.length === 2) {
            let minAvailability = Infinity;
            
            const startDay = new Date(selectedRange[0].getFullYear(), selectedRange[0].getMonth(), selectedRange[0].getDate(), 12, 0, 0);
            const endDay = new Date(selectedRange[1].getFullYear(), selectedRange[1].getMonth(), selectedRange[1].getDate(), 12, 0, 0);

            for (let day = new Date(startDay); day <= endDay; day.setDate(day.getDate() + 1)) {
                const dayString = toISODate(day);
                const availability = availabilityData[dayString];
                
                if (availability !== undefined && availability < minAvailability) { 
                    minAvailability = availability; 
                }
            }
            setAvailableForRange(minAvailability === Infinity ? 0 : minAvailability);
            setQuantity(1);
        } else {
            setAvailableForRange(null);
        }
    }, [selectedRange, availabilityData]);


    const getTileClassName = ({ date, view }: { date: Date, view: string }) => {
        if (view !== 'month') return null;
        const dayString = toISODate(date);

        if (date.getMonth() !== currentMonthView.getMonth()) {
            return 'day-neighboring-month';
        }

        if (selectedRange && selectedRange.length === 2) {
            const [start, end] = selectedRange;
            if (date >= start && date <= end) {
                return 'day-blue';
            }
        }

        const diaStatusAdmin = statusDias.get(dayString);
        const availabilityEstoque = availabilityData[dayString];

        if (!diaStatusAdmin) {
            return null;
        }

        if (diaStatusAdmin.status === 'FECHADO') {
            if (diaStatusAdmin.fonte === 'padrao') {
                return 'day-fechado-padrao';
            }

            if (diaStatusAdmin.fonte === 'excecao') {
                return 'day-red';
            }
        }

        if (availabilityEstoque === undefined) return null;
        if (availabilityEstoque === 0) return 'day-red';

        const percentage = (availabilityEstoque / equipment.total_quantidade) * 100;
        if (percentage <= 50) return 'day-yellow';

        return 'day-green';
    };


    const tileDisabled = ({ date, view }: { date: Date, view: string }): boolean => {
        if (view !== 'month') return false;

        if (date.getMonth() !== currentMonthView.getMonth()) {
            return true;
        }

        const dayString = toISODate(date);
        const diaStatusAdmin = statusDias.get(dayString);
        const availabilityEstoque = availabilityData[dayString];

        if (!diaStatusAdmin || diaStatusAdmin.status === 'FECHADO') {
            return true;
        }

        if (availabilityEstoque === 0) {
            return true;
        }

        return false;
    };

    // ADICIONAR AO CARRINHO
    const handleAddToCart = () => {
        if (!selectedRange) return;

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
        
        // Manda pro localStorage e vai pro carrinho
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
                <p style={{ textAlign: 'center', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Disponibilidade
                </p>
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
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="day-blue" style={{ width: 15, height: 15, marginRight: 5 }}></div> Selecionado
                    </div>
                </div>

                {loading ? <p>Carregando calendário...</p> :
                    errorMessage ? <p style={{ color: 'red' }}>{errorMessage}</p> : (
                        <Calendar
                            onChange={(value) => setSelectedRange(value as Date[])}
                            selectRange={true}
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
    backgroundColor: 'var(--cor-fundo-modal, #2a2a2a)',
    color: 'var(--cor-texto-principal, #fff)',
    padding: '1.5rem',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '80vh',
    overflowY: 'auto',
    position: 'relative',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
};

export default AvailabilityCalendarModal;