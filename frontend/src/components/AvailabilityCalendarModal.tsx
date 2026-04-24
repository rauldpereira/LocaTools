import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Calendar from 'react-calendar';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import HorarioFuncionamento from './HorarioFuncionamentoDisplay';
import '../styles/CalendarCommon.css';
import '../styles/AvailabilityCalendarModal.css';

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
    const [rentalPeriod, setRentalPeriod] = useState<'diaria' | 'semanal' | 'quinzenal' | 'mensal'>('diaria');
    const [availableForRange, setAvailableForRange] = useState<number | null>(null);
    const [quantity, setQuantity] = useState(1);

    const [statusDias, setStatusDias] = useState<Map<string, IDiaStatus>>(new Map());
    const [storeConfig, setStoreConfig] = useState<any>(null);
    const [currentMonthView, setCurrentMonthView] = useState(new Date());
    const [minDate, setMinDate] = useState<Date | undefined>(undefined);
    const [maxDate, setMaxDate] = useState<Date | undefined>(undefined);

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showHours, setShowHours] = useState(false);

    // Ajusta o range automaticamente se o período mudar
    useEffect(() => {
        if (selectedRange && selectedRange[0]) {
            const start = selectedRange[0];
            let end = selectedRange[1] || start;

            if (rentalPeriod === 'semanal') {
                end = new Date(start);
                end.setDate(start.getDate() + 6); // 7 dias incluindo o primeiro
            } else if (rentalPeriod === 'quinzenal') {
                end = new Date(start);
                end.setDate(start.getDate() + 14); // 15 dias
            } else if (rentalPeriod === 'mensal') {
                end = new Date(start);
                end.setDate(start.getDate() + 29); // 30 dias
            }
            setSelectedRange([start, end]);
        }
    }, [rentalPeriod]);

    // CARREGA OS MESES
    useEffect(() => {
        const fetchStoreConfig = async () => {
            try {
                const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/config`);
                setStoreConfig(data);
            } catch (err) {
                console.warn("Não foi possível carregar as configurações da loja para trava de horário.");
            }
        };
        fetchStoreConfig();

        const fetchMesesPublicados = async () => {
            try {
                setLoading(true);
                setErrorMessage(null);

                const { data: meses } = await axios.get<IMesPublicado[]>(
                    `${import.meta.env.VITE_API_URL}/api/calendario/meses-publicados`
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
                    `${import.meta.env.VITE_API_URL}/api/calendario/status-mensal`,
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
                const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/equipment/${equipment.id}/daily-availability`, {
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
        if (selectedRange && selectedRange.length === 2 && selectedRange[0] && selectedRange[1]) {
            let minAvailability = Infinity;
            
            const startDay = new Date(selectedRange[0].getFullYear(), selectedRange[0].getMonth(), selectedRange[0].getDate(), 12, 0, 0);
            const endDay = new Date(selectedRange[1].getFullYear(), selectedRange[1].getMonth(), selectedRange[1].getDate(), 12, 0, 0);

            for (let day = new Date(startDay); day <= endDay; day.setDate(day.getDate() + 1)) {
                const dayString = toISODate(day);
                // Se o dia não existe no availabilityData, significa que não tem reservas, então usa o total_quantidade
                const availability = availabilityData[dayString] !== undefined 
                    ? availabilityData[dayString] 
                    : equipment.total_quantidade;

                if (availability < minAvailability) { 
                    minAvailability = availability; 
                }
            }

            setAvailableForRange(minAvailability === Infinity ? 0 : minAvailability);
            setQuantity(1);
        } else {
            setAvailableForRange(null);
        }
    }, [selectedRange, availabilityData, equipment.total_quantidade]);


    const isTodayPastLimit = () => {
        if (!storeConfig || !storeConfig.horario_limite_hoje) return false;
        
        const now = new Date();
        const [hourLimit, minLimit] = storeConfig.horario_limite_hoje.split(':').map(Number);
        const limit = new Date();
        limit.setHours(hourLimit, minLimit, 0, 0);

        return now > limit;
    };

    const getTileClassName = ({ date, view }: { date: Date, view: string }) => {
        if (view !== 'month') return null;
        const dayString = toISODate(date);

        // Dias de outros meses
        if (date.getMonth() !== currentMonthView.getMonth()) {
            return 'day-neighboring-month';
        }

        // Seleção do usuário
        if (selectedRange && selectedRange.length >= 1) {
            const start = selectedRange[0];
            const end = selectedRange[1] || start;
            if (date >= start && date <= end) {
                return 'day-blue';
            }
        }

        const diaStatusAdmin = statusDias.get(dayString);
        const availabilityEstoque = availabilityData[dayString];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Dias no passado -> Vermelho
        if (date < today) {
            return 'day-red';
        }

        // TRAVA DE HORÁRIO PARA HOJE
        if (date.getTime() === today.getTime() && isTodayPastLimit()) {
            return 'day-red';
        }

        // Sem estoque -> Vermelho (Indisponível de fato)
        if (availabilityEstoque === 0) {
            return 'day-red';
        }

        // Dia FECHADO pela loja (Feriado/Folga) -> Cinza ou indicador, mas NÃO bloqueado se tiver estoque
        if (!diaStatusAdmin || diaStatusAdmin.status === 'FECHADO') {
            return 'day-closed';
        }

        if (availabilityEstoque === undefined) return null;

        // Disponibilidade parcial -> Amarelo
        const percentage = (availabilityEstoque / equipment.total_quantidade) * 100;
        if (percentage <= 50) return 'day-yellow';

        // Disponível -> Verde
        return 'day-green';
    };


    const tileDisabled = ({ date, view }: { date: Date, view: string }): boolean => {
        if (view !== 'month') return false;

        if (date.getMonth() !== currentMonthView.getMonth()) {
            return true;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // TRAVA DE HORÁRIO PARA HOJE
        if (date.getTime() === today.getTime() && isTodayPastLimit()) {
            return true;
        }

        const dayString = toISODate(date);
        const availabilityEstoque = availabilityData[dayString];

        // Só desabilita se NÃO houver estoque ou for passado.
        if (availabilityEstoque === 0) {
            return true;
        }

        return false;
    };

    // ADICIONAR AO CARRINHO
    const handleAddToCart = () => {
        if (!selectedRange) return;

        const startDate = selectedRange[0];
        const endDate = selectedRange[1] || startDate;

        const startDateString = toISODate(startDate);
        const endDateString = toISODate(endDate);

        // Não pode começar nem terminar em dia FECHADO
        const statusInicio = statusDias.get(startDateString);
        const statusFim = statusDias.get(endDateString);

        if (statusInicio?.status === 'FECHADO') {
            alert(`A loja estará fechada no dia ${startDate.toLocaleDateString()}. Por favor, escolha outra data de início.`);
            return;
        }
        if (statusFim?.status === 'FECHADO') {
            alert(`A loja estará fechada no dia ${endDate.toLocaleDateString()}. Por favor, escolha outra data de término.`);
            return;
        }

        let precoFinal = equipment.preco_diaria;
        if (rentalPeriod === 'semanal') precoFinal = equipment.preco_semanal;
        else if (rentalPeriod === 'quinzenal') precoFinal = equipment.preco_quinzenal;
        else if (rentalPeriod === 'mensal') precoFinal = equipment.preco_mensal;

        const item = {
            id_equipamento: equipment.id,
            nome: equipment.nome,
            quantidade: quantity,
            data_inicio: startDateString,
            data_fim: endDateString,
            preco: Number(precoFinal),
            tipo_locacao: rentalPeriod
        };
        
        // Manda pro localStorage e vai pro carrinho
        // @ts-ignore
        addToCart(item);
        onClose();
        navigate('/cart');
    };

    const handleContentClick = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div className="availability-modal-overlay" onClick={onClose}>
            <div className="availability-modal-content availability-calendar-container" onClick={handleContentClick}>
                <button onClick={onClose} className="availability-modal-close">&times;</button>
                
                <p className="availability-modal-subtitle" style={{ marginTop: '10px' }}>
                    {equipment.nome}
                </p>

                <div className="availability-modal-legend">
                    <div className="availability-modal-legend-item">
                        <div className="day-green availability-modal-legend-circle"></div> <span>Alta</span>
                    </div>
                    <div className="availability-modal-legend-item">
                        <div className="day-yellow availability-modal-legend-circle"></div> <span>Baixa</span>
                    </div>
                    <div className="availability-modal-legend-item">
                        <div className="day-red availability-modal-legend-circle"></div> <span>Indisponível</span>
                    </div>
                    <div className="availability-modal-legend-item">
                        <div className="day-closed availability-modal-legend-circle"></div> <span>Loja Fechada</span>
                    </div>
                    <div className="availability-modal-legend-item">
                        <div className="day-blue availability-modal-legend-circle"></div> <span>Selecionado</span>
                    </div>
                    
                    <div className="hours-toggle-container" style={{ margin: 0 }}>
                        <button 
                            className="btn-hours-toggle"
                            onClick={() => setShowHours(!showHours)}
                            style={{ padding: '4px 10px', borderRadius: '8px' }}
                        >
                            Horário de Funcionamento {showHours ? '▲' : '▼'}
                        </button>
                        {showHours && (
                            <div className="hours-bubble">
                                <HorarioFuncionamento />
                            </div>
                        )}
                    </div>
                </div>

                {storeConfig?.horario_limite_hoje && isTodayPastLimit() && (
                    <div className="availability-modal-warning">
                        ⚠️ <strong>Atenção:</strong> O horário limite para locações para hoje ({storeConfig.horario_limite_hoje}) já passou. O dia de hoje está indisponível para novas reservas.
                    </div>
                )}

                <div className="availability-modal-select-container">
                    <label className="availability-modal-label">
                        Plano de Locação:
                    </label>
                    <select 
                        value={rentalPeriod} 
                        onChange={(e) => setRentalPeriod(e.target.value as any)}
                        className="availability-modal-select"
                    >
                        <option value="diaria">Diária (Livre) - {Number(equipment.preco_diaria).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/dia</option>
                        {equipment.preco_semanal && <option value="semanal">Semanal (7 dias) - {Number(equipment.preco_semanal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</option>}
                        {equipment.preco_quinzenal && <option value="quinzenal">Quinzena (15 dias) - {Number(equipment.preco_quinzenal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</option>}
                        {equipment.preco_mensal && <option value="mensal">Mensal (30 dias) - {Number(equipment.preco_mensal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</option>}
                    </select>
                </div>

                <div className="availability-modal-calendar-wrapper">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>Carregando calendário...</div>
                    ) : errorMessage ? (
                        <p style={{ color: '#dc3545', textAlign: 'center', padding: '20px' }}>{errorMessage}</p>
                    ) : (
                            <Calendar
                                onChange={(value) => {
                                    if (rentalPeriod === 'diaria') {
                                        // Armazena como array no nosso estado para consistência
                                        const range = Array.isArray(value) ? value : [value as Date];
                                        setSelectedRange(range);
                                    } else {
                                        const selectedDate = Array.isArray(value) ? value[0] : (value as Date);
                                        if (!selectedDate) return;

                                        const start = selectedDate;
                                        let end = new Date(start);
                                        if (rentalPeriod === 'semanal') end.setDate(start.getDate() + 6);
                                        else if (rentalPeriod === 'quinzenal') end.setDate(start.getDate() + 14);
                                        else if (rentalPeriod === 'mensal') end.setDate(start.getDate() + 29);
                                        setSelectedRange([start, end]);
                                    }
                                }}
                                
                                value={
                                    rentalPeriod === 'diaria' 
                                        ? (selectedRange && selectedRange.length === 1 ? selectedRange[0] : selectedRange)
                                        : (selectedRange ? selectedRange[0] : null)
                                }
                                selectRange={rentalPeriod === 'diaria'}
                                minDate={minDate}
                                maxDate={maxDate}
                                activeStartDate={currentMonthView}
                                onActiveStartDateChange={({ activeStartDate }) =>
                                    setCurrentMonthView(activeStartDate || new Date())
                                }
                                tileClassName={getTileClassName}
                                tileDisabled={tileDisabled}
                                minDetail="year"
                                maxDetail="month"
                                prev2Label={null}
                                next2Label={null}
                            />

                    )}
                </div>

                {availableForRange !== null && selectedRange && selectedRange.length >= 1 && (
                    <div className="availability-modal-selection-details">
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 className="availability-modal-section-title">Período Selecionado</h4>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333' }}>
                                {selectedRange[0].toLocaleDateString()} {selectedRange[1] ? ` a ${selectedRange[1].toLocaleDateString()}` : ''}
                            </div>
                            <p style={{ margin: '5px 0 0', color: availableForRange > 0 ? '#28a745' : '#dc3545', fontWeight: '600' }}>
                                {availableForRange > 0 
                                    ? `✓ Temos ${availableForRange} unidades disponíveis para este período` 
                                    : '✗ Nenhuma unidade disponível para este período'}
                            </p>
                        </div>

                        {availableForRange > 0 && (
                            <div className="availability-modal-quantity-container">
                                <div style={{ flex: '1 1 120px' }}>
                                    <label className="availability-modal-section-title" style={{ display: 'block', marginBottom: '8px' }}>Quantidade:</label>
                                    <input 
                                        type="number" 
                                        value={quantity} 
                                        onChange={e => {
                                            const val = parseInt(e.target.value);
                                            if (isNaN(val)) setQuantity(1);
                                            else if (val > availableForRange) setQuantity(availableForRange);
                                            else if (val < 1) setQuantity(1);
                                            else setQuantity(val);
                                        }} 
                                        min="1" 
                                        max={availableForRange}
                                        className="availability-modal-quantity-input"
                                    />
                                </div>
                                <button onClick={handleAddToCart} className="availability-modal-btn-cart">
                                    Adicionar ao Carrinho
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AvailabilityCalendarModal;