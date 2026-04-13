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

        // Seleção do usuário (Azul)
        if (selectedRange && selectedRange.length === 2) {
            const [start, end] = selectedRange;
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
        <div style={modalOverlayStyle} onClick={onClose}>
            <div style={modalContentStyle} onClick={handleContentClick}>
                <button onClick={onClose} style={{ position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--cor-texto-principal)', cursor: 'pointer' }}>&times;</button>
                <h2>Disponibilidade para {equipment.nome}</h2>
                <p>Selecione o período desejado no calendário.</p>
                <p style={{ textAlign: 'center', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Disponibilidade
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
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
                        <div className="day-closed" style={{ width: 15, height: 15, marginRight: 5 }}></div> Loja Fechada
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="day-blue" style={{ width: 15, height: 15, marginRight: 5 }}></div> Selecionado
                    </div>
                </div>

                {storeConfig?.horario_limite_hoje && isTodayPastLimit() && (
                    <div style={{
                        backgroundColor: '#fff3cd',
                        color: '#856404',
                        padding: '10px',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        fontSize: '0.9rem',
                        border: '1px solid #ffeeba',
                        textAlign: 'center'
                    }}>
                        ⚠️ <strong>Atenção:</strong> O horário limite para locações para hoje ({storeConfig.horario_limite_hoje}) já passou. O dia de hoje está indisponível para novas reservas.
                    </div>
                )}

                <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontWeight: 'bold' }}>Tipo de Locação:</label>
                    <select 
                        value={rentalPeriod} 
                        onChange={(e) => setRentalPeriod(e.target.value as any)}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc', background: '#fff', color: '#333' }}
                    >
                        <option value="diaria">Diária (Livre)</option>
                        {equipment.preco_semanal && <option value="semanal">Semanal (7 dias)</option>}
                        {equipment.preco_quinzenal && <option value="quinzenal">Quinzena (15 dias)</option>}
                        {equipment.preco_mensal && <option value="mensal">Mensal (30 dias)</option>}
                    </select>
                </div>

                {loading ? <p>Carregando calendário...</p> :
                    errorMessage ? <p style={{ color: 'red' }}>{errorMessage}</p> : (
                        <Calendar
                            onChange={(value) => {
                                if (rentalPeriod === 'diaria') {
                                    // No modo diária, value é um array de [start, end] se selectRange={true}
                                    setSelectedRange(value as Date[]);
                                } else {
                                    // No modo fixo (semanal/mensal/etc), value costuma vir como uma única Date
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
                            selectRange={rentalPeriod === 'diaria'}
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