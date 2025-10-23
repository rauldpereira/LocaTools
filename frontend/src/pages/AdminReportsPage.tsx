import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';



interface KpiData {
    faturamentoTotal: number;
    totalPedidos: number;
    ticketMedio: number;
    totalTaxaAvaria: number;
    totalTaxaRemarcacao: number;
}
interface TopEquipamento {
    nome: string;
    receita: number;
    alugueis: number;
}
interface ReportData {
    kpis: KpiData;
    topEquipamentos: TopEquipamento[];
}


const toISODateString = (date: Date) => {
    return date.toISOString().split('T')[0];
};

const AdminReportsPage: React.FC = () => {
    const { token } = useAuth();
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [startDate, setStartDate] = useState(() => {
        const today = new Date();
        return toISODateString(new Date(today.getFullYear(), today.getMonth(), 1));
    });
    const [endDate, setEndDate] = useState(() => toISODateString(new Date()));

    const handleGenerateReport = async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        setReportData(null);
        try {
            const config = {
                headers: { Authorization: `Bearer ${token}` },
                params: { startDate, endDate }
            };
            const { data } = await axios.get('http://localhost:3001/api/reports/financial', config);
            setReportData(data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao gerar relatório.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        handleGenerateReport();
    }, [token]); 
    return (
        <div style={{ padding: '2rem', marginTop: '60px' }}>
            <h1>Relatório Financeiro</h1>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
                <label>De:</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <label>Até:</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                <button onClick={handleGenerateReport} disabled={loading}>
                    {loading ? 'Gerando...' : 'Gerar Relatório'}
                </button>
            </div>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            {reportData && (
                <>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                        <KpiCard title="Faturamento Total" value={`R$ ${reportData.kpis.faturamentoTotal.toFixed(2)}`} />
                        <KpiCard title="Total de Pedidos" value={reportData.kpis.totalPedidos.toString()} />
                        <KpiCard title="Ticket Médio" value={`R$ ${reportData.kpis.ticketMedio.toFixed(2)}`} />
                        <KpiCard title="Receita (Avarias)" value={`R$ ${reportData.kpis.totalTaxaAvaria.toFixed(2)}`} />
                        <KpiCard title="Receita (Remarcação)" value={`R$ ${reportData.kpis.totalTaxaRemarcacao.toFixed(2)}`} />
                    </div>
                    
                    <h2>Equipamentos Mais Rentáveis</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Equipamento</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Nº de Aluguéis</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Receita Gerada</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.topEquipamentos.map((equip) => (
                                <tr key={equip.nome}>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{equip.nome}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{equip.alugueis}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>R$ {equip.receita.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </div>
    );
};

const KpiCard: React.FC<{ title: string; value: string }> = ({ title, value }) => (
    <div style={{
        border: '1px solid var(--cor-borda)',
        borderRadius: '8px',
        padding: '1rem',
        flex: 1,
        minWidth: '200px',
        backgroundColor: 'var(--cor-fundo-item)'
    }}>
        <h4 style={{ margin: 0, color: '#888' }}>{title}</h4>
        <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0.5rem 0 0 0' }}>{value}</p>
    </div>
);

export default AdminReportsPage;