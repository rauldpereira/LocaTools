import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

interface KpiData {
    faturamentoTotal: number;
    lucroLiquido: number;
    totalPedidos: number;
    ticketMedio: number;
    totalPrejuizoAberto: number;
    totalPrejuizoRecuperado: number;
}
interface InventoryDataSummary {
    total: number;
    alugadas: number;
    disponiveis: number;
    manutencao: number;
}
interface TopEquipamento { nome: string; receita: number; alugueis: number; }
interface ExtratoItem {
    id: string | number;
    data: string;
    descricao: string;
    valor: number;
    tipo: 'RECEITA' | 'DESPESA';
}
interface ReportDataFinancial {
    kpis: KpiData;
    inventory: InventoryDataSummary;
    topEquipamentos: TopEquipamento[];
    history: { receitas: any[]; prejuizos: any[]; };
    extrato: ExtratoItem[];
}

interface OcorrenciaBO {
    id: number;
    data: string;
    tipo: string;
    equipamento: string;
    unidadeId: number;
    cliente: string;
    contato: string;
    valor: string;
    resolvido: boolean;
    obs: string;
}
interface InventarioItem {
    id: number;
    equipamento: string;
    status: string;
    observacao: string;
}
interface ReportDataOperational {
    ocorrencias: OcorrenciaBO[];
    inventario: InventarioItem[];
}

const COLORS_PIE = ['#28a745', '#007bff', '#dc3545'];
const toISODateString = (date: Date) => date.toISOString().split('T')[0];

const AdminReportsPage: React.FC = () => {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<'financeiro' | 'ocorrencias' | 'inventario'>('financeiro');
    const [loading, setLoading] = useState(false);
    
    const [financialData, setFinancialData] = useState<ReportDataFinancial | null>(null);
    const [operationalData, setOperationalData] = useState<ReportDataOperational | null>(null);

    const [startDate, setStartDate] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 30); return toISODateString(d);
    });
    const [endDate, setEndDate] = useState(() => toISODateString(new Date()));

    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const fetchFinancial = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` }, params: { startDate, endDate } };
            const { data } = await axios.get('http://localhost:3001/api/reports/financial', config);
            setFinancialData(data);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const fetchOperational = async () => {
        if (!token || operationalData) return; 
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const { data } = await axios.get('http://localhost:3001/api/reports/operational', config);
            setOperationalData(data);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    useEffect(() => {
        if (activeTab === 'financeiro') fetchFinancial();
        if (activeTab === 'ocorrencias' || activeTab === 'inventario') fetchOperational();
        setSearchTerm('');
        setSortConfig(null);
    }, [activeTab, token]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const processTableData = (data: any[], searchKeys: string[]) => {
        let processed = [...data];

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            processed = processed.filter(item => 
                searchKeys.some(key => String(item[key] || '').toLowerCase().includes(lowerTerm))
            );
        }

        if (sortConfig) {
            processed.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];
                
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return processed;
    };

    const getEvolutionData = () => {
        if (!financialData) return [];
        const map = new Map();
        financialData.history.receitas.forEach((r: any) => map.set(r.mes, { name: r.mes, receita: Number(r.total), prejuizo: 0 }));
        financialData.history.prejuizos.forEach((p: any) => {
            const current = map.get(p.mes) || { name: p.mes, receita: 0, prejuizo: 0 };
            current.prejuizo = Number(p.total);
            map.set(p.mes, current);
        });
        return Array.from(map.values()).sort((a: any, b: any) => a.name.localeCompare(b.name));
    };

    const getInventoryPieData = () => {
        if (!financialData) return [];
        return [
            { name: 'Disponíveis', value: financialData.inventory.disponiveis },
            { name: 'Alugadas', value: financialData.inventory.alugadas },
            { name: 'Manutenção/B.O.', value: financialData.inventory.manutencao },
        ];
    };

    const SortableTh = ({ label, sortKey }: { label: string, sortKey: string }) => (
        <th style={thStyle} onClick={() => handleSort(sortKey)}>
            <div style={{display:'flex', alignItems:'center', cursor:'pointer', userSelect:'none'}}>
                {label}
                {sortConfig?.key === sortKey && (
                    <span style={{marginLeft: '5px'}}>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                )}
            </div>
        </th>
    );

    return (
        <div style={{ padding: '2rem', marginTop: '60px', backgroundColor: '#f4f6f8', minHeight: '100vh', color: '#333' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ margin: 0, fontSize: '2rem', color: '#2c3e50' }}>Relatórios</h1>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem', borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>
                <button onClick={() => setActiveTab('financeiro')} style={activeTab === 'financeiro' ? activeTabStyle : tabStyle}>Financeiro</button>
                <button onClick={() => setActiveTab('ocorrencias')} style={activeTab === 'ocorrencias' ? activeTabStyle : tabStyle}> Prejuizos e Roubos</button>
                <button onClick={() => setActiveTab('inventario')} style={activeTab === 'inventario' ? activeTabStyle : tabStyle}>Inventário</button>
            </div>

            {activeTab === 'financeiro' && financialData && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: 'white', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle}/>
                            <span>até</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle}/>
                            <button onClick={fetchFinancial} disabled={loading} style={btnStyle}>Filtrar</button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        <KpiCard title="Faturamento Bruto" value={`R$ ${financialData.kpis.faturamentoTotal.toFixed(2)}`} icon="" color="#28a745" />
                        <KpiCard title="Prejuízo (Perdas)" value={`R$ ${financialData.kpis.totalPrejuizoAberto.toFixed(2)}`} icon="" color="#dc3545" />
                        <KpiCard title="Lucro Líquido Real" value={`R$ ${financialData.kpis.lucroLiquido.toFixed(2)}`} icon="" color={financialData.kpis.lucroLiquido >= 0 ? "#28a745" : "#dc3545"} highlight />
                        <KpiCard title="Recuperado" value={`R$ ${financialData.kpis.totalPrejuizoRecuperado.toFixed(2)}`} icon="" color="#17a2b8" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div style={cardContainerStyle}>
                            <h3 style={cardTitleStyle}>Evolução Financeira</h3>
                            <div style={{ height: 350, width: '100%' }}>
                                <ResponsiveContainer>
                                    <AreaChart data={getEvolutionData()}>
                                        <defs>
                                            <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#28a745" stopOpacity={0.8}/><stop offset="95%" stopColor="#28a745" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorPrejuizo" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#dc3545" stopOpacity={0.8}/><stop offset="95%" stopColor="#dc3545" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" stroke="#666" />
                                        <YAxis stroke="#666" />
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                        <ChartTooltip contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: 'none', color:'#333'}}/>
                                        <Legend verticalAlign="top" height={36}/>
                                        <Area type="monotone" dataKey="receita" stroke="#28a745" fillOpacity={1} fill="url(#colorReceita)" name="Receita" />
                                        <Area type="monotone" dataKey="prejuizo" stroke="#dc3545" fillOpacity={1} fill="url(#colorPrejuizo)" name="Prejuízo" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div style={cardContainerStyle}>
                            <h3 style={cardTitleStyle}>Status Equipamentos</h3>
                            <div style={{ height: 350, width: '100%', position: 'relative' }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={getInventoryPieData()} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({payload}:any) => payload.name}>
                                            {getInventoryPieData().map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                                            ))}
                                        </Pie>
                                        <ChartTooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{position: 'absolute', top: '45%', left: 0, right: 0, textAlign: 'center'}}>
                                    <span style={{fontSize: '2rem', fontWeight: 'bold', color: '#333'}}>{financialData.inventory.total}</span><br/><span style={{fontSize: '0.8rem', color: '#888'}}>TOTAL</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={cardContainerStyle}>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            <h3 style={cardTitleStyle}>Extrato Detalhado</h3>
                            <input type="text" placeholder="Buscar no extrato..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={inputStyle} />
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{backgroundColor: '#f1f1f1'}}>
                                <tr>
                                    <SortableTh label="Data" sortKey="data" />
                                    <SortableTh label="Descrição" sortKey="descricao" />
                                    <SortableTh label="Tipo" sortKey="tipo" />
                                    <SortableTh label="Valor" sortKey="valor" />
                                </tr>
                            </thead>
                            <tbody>
                                {processTableData(financialData.extrato, ['descricao', 'tipo']).map((item: any, idx) => (
                                    <tr key={`${item.id}-${idx}`} style={{borderBottom: '1px solid #eee'}}>
                                        <td style={tdStyle}>{new Date(item.data).toLocaleDateString()}</td>
                                        <td style={tdStyle}>{item.descricao}</td>
                                        <td style={{...tdStyle, fontWeight:'bold', color: item.tipo === 'RECEITA' ? 'green' : 'red'}}>{item.tipo}</td>
                                        <td style={{...tdStyle, fontWeight:'bold', color: item.tipo === 'RECEITA' ? 'green' : 'red'}}>
                                            {item.tipo === 'DESPESA' ? '-' : '+'} R$ {Math.abs(item.valor).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'ocorrencias' && operationalData && (
                <div style={cardContainerStyle}>
                    <div style={{display:'flex', justifyContent: 'space-between', alignItems:'center', marginBottom: '20px'}}>
                        <h3 style={{...cardTitleStyle, borderBottom: 'none', margin: 0}}>Relatório de Ocorrências</h3>
                        <input type="text" placeholder="Buscar por cliente, equipamento..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{...inputStyle, width: '300px'}} />
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{backgroundColor: '#333', color: 'white'}}>
                            <tr>
                                <SortableTh label="Data" sortKey="data" />
                                <SortableTh label="Tipo" sortKey="tipo" />
                                <SortableTh label="Equipamento" sortKey="equipamento" />
                                <SortableTh label="Cliente" sortKey="cliente" />
                                <SortableTh label="Valor" sortKey="valor" />
                                <SortableTh label="Status" sortKey="resolvido" />
                                <th>Obs</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processTableData(operationalData.ocorrencias, ['equipamento', 'cliente', 'tipo']).map((bo: any) => (
                                <tr key={bo.id} style={{borderBottom: '1px solid #eee', backgroundColor: bo.resolvido ? '#f9fff9' : '#fff5f5'}}>
                                    <td style={tdStyle}>{new Date(bo.data).toLocaleDateString()}</td>
                                    <td style={{...tdStyle, fontWeight: 'bold', color: bo.tipo === 'ROUBO' ? 'red' : 'orange'}}>{bo.tipo}</td>
                                    <td style={tdStyle}>{bo.equipamento} <span style={{fontSize: '0.8rem', color: '#666'}}>(#{bo.unidadeId})</span></td>
                                    <td style={tdStyle}>{bo.cliente}<br/><span style={{fontSize: '0.8rem', color: '#666'}}>{bo.contato}</span></td>
                                    <td style={{...tdStyle, fontWeight: 'bold'}}>R$ {Number(bo.valor).toFixed(2)}</td>
                                    <td style={tdStyle}>{bo.resolvido ? <span style={{color: 'green'}}>RESOLVIDO</span> : <span style={{color: 'red'}}>PENDENTE</span>}</td>
                                    <td style={{...tdStyle, maxWidth: '200px', fontSize: '0.9rem', color: '#666'}}>{bo.obs}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'inventario' && operationalData && (
                <div style={cardContainerStyle}>
                    <div style={{display:'flex', justifyContent: 'space-between', alignItems:'center', marginBottom: '20px'}}>
                        <h3 style={{...cardTitleStyle, borderBottom: 'none', margin: 0}}>Inventário Completo</h3>
                        <input type="text" placeholder="Buscar equipamento, ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{...inputStyle, width: '300px'}} />
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{backgroundColor: '#e9ecef', color: '#333'}}>
                            <tr>
                                <SortableTh label="ID" sortKey="id" />
                                <SortableTh label="Equipamento" sortKey="equipamento" />
                                <SortableTh label="Status" sortKey="status" />
                                <th>Observações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processTableData(operationalData.inventario, ['equipamento', 'status', 'id']).map((item: any) => (
                                <tr key={item.id} style={{borderBottom: '1px solid #eee'}}>
                                    <td style={tdStyle}>#{item.id}</td>
                                    <td style={{...tdStyle, fontWeight: 'bold'}}>{item.equipamento}</td>
                                    <td style={tdStyle}>
                                        <span style={{
                                            padding: '5px 10px', borderRadius: '15px', fontSize: '0.85rem', fontWeight: 'bold',
                                            backgroundColor: item.status === 'disponivel' ? '#d4edda' : (item.status === 'alugado' ? '#cce5ff' : '#f8d7da'),
                                            color: item.status === 'disponivel' ? '#155724' : (item.status === 'alugado' ? '#004085' : '#721c24')
                                        }}>
                                            {item.status ? item.status.toUpperCase() : 'DESCONHECIDO'}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>{item.observacao || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const tabStyle: React.CSSProperties = { padding: '10px 20px', fontSize: '1rem', cursor: 'pointer', background: 'none', border: 'none', color: '#666', borderBottom: '3px solid transparent' };
const activeTabStyle: React.CSSProperties = { ...tabStyle, color: '#2c3e50', fontWeight: 'bold', borderBottom: '3px solid #2c3e50' };
const cardContainerStyle: React.CSSProperties = { backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '2rem' };
const cardTitleStyle: React.CSSProperties = { margin: '0 0 20px 0', color: '#2c3e50', fontSize: '1.2rem', borderBottom: '2px solid #f4f6f8', paddingBottom: '10px' };
const inputStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', color: '#333', outline: 'none' };
const btnStyle: React.CSSProperties = { padding: '8px 20px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };
const thStyle: React.CSSProperties = { padding: '15px', fontWeight: '600', fontSize: '0.9rem', textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '12px', fontSize: '0.95rem' };

const KpiCard: React.FC<{ title: string; value: string; icon: string; color: string; highlight?: boolean }> = ({ title, value, icon, color, highlight }) => (
    <div style={{
        backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem',
        boxShadow: highlight ? '0 4px 20px rgba(0,0,0,0.1)' : '0 2px 5px rgba(0,0,0,0.05)',
        borderLeft: `5px solid ${color}`, border: highlight ? `2px solid ${color}` : 'none',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
    }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
            <span style={{ color: '#888', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>{title}</span>
            <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        </div>
        <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2c3e50' }}>{value}</span>
    </div>
);

export default AdminReportsPage;