import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MaintenanceRecord {
    id: number;
    data_inicio: string;
    data_fim: string;
    status: string;
    observacao?: string;
}

interface MaintenanceHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    unitId: number | null;
    unitSerial?: string | null;
    equipmentName?: string;
}

const parseDateLocal = (dateString: string) => {
    if (!dateString) return 'N/A';
    const [year, month, day] = dateString.substring(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
};

const MaintenanceHistoryModal: React.FC<MaintenanceHistoryModalProps> = ({ isOpen, onClose, unitId, unitSerial, equipmentName }) => {
    const { token } = useAuth();
    const [history, setHistory] = useState<MaintenanceRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    useEffect(() => {
        if (!isOpen || !unitId) return;

        const fetchHistory = async () => {
            setLoading(true);
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/units/${unitId}/history`, config);
                setHistory(data);
            } catch (error) {
                console.error("Erro ao buscar histórico:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [isOpen, unitId, token]);

    // filtra o histórico
    const filteredHistory = history.filter(record => {
        const rStart = record.data_inicio.substring(0, 10);
        const rEnd = record.data_fim.substring(0, 10);

        if (filterStartDate && rEnd < filterStartDate) return false;
        if (filterEndDate && rStart > filterEndDate) return false;
        
        return true;
    });

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Histórico de MANUTENÇÃO', 14, 22);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Equipamento: ${equipmentName || 'Não informado'}`, 14, 32);
        doc.text(`Patrimônio (ID): #${unitId}`, 14, 38);
        doc.text(`Número de Série: ${unitSerial || 'Sem S/N'}`, 14, 44);
        doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, 50);

        // Ajusta o texto do período no PDF dependendo do filtro selecionado
        let periodoTexto = 'Todo o histórico';
        if (filterStartDate && filterEndDate) {
            periodoTexto = `${parseDateLocal(filterStartDate)} a ${parseDateLocal(filterEndDate)}`;
        } else if (filterStartDate) {
            periodoTexto = `A partir de ${parseDateLocal(filterStartDate)}`;
        } else if (filterEndDate) {
            periodoTexto = `Até ${parseDateLocal(filterEndDate)}`;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.text(`Período do Relatório: ${periodoTexto}`, 14, 56);

        const tableData = filteredHistory.map(record => {
            const inicio = parseDateLocal(record.data_inicio);
            const fim = parseDateLocal(record.data_fim);
            
            const hoje = new Date().toISOString().substring(0, 10);
            let statusExibicao = 'Concluída';
            if (record.data_fim >= hoje && record.data_inicio <= hoje) statusExibicao = 'Em Andamento';
            if (record.data_inicio > hoje) statusExibicao = 'Agendada';

            const motivo = record.observacao || 'Manutenção Preventiva / Não informado';

            return [inicio, fim, statusExibicao, motivo];
        });

        autoTable(doc, {
            startY: 64,
            head: [['Data de Entrada', 'Data de Saída', 'Status', 'Motivo da Manutenção']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [44, 62, 80] }
        });

        doc.save(`Historico_Manutencao_Unidade_${unitId}.pdf`);
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
            <div style={{ background: 'white', width: '700px', maxWidth: '95%', maxHeight: '85vh', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                
                {/* CABEÇALHO */}
                <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, color: '#2c3e50' }}>Histórico da Unidade #{unitId}</h2>
                        <span style={{ fontSize: '0.9rem', color: '#6c757d' }}>{equipmentName} {unitSerial ? `(S/N: ${unitSerial})` : ''}</span>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#333' }}>&times;</button>
                </div>

                {/* CORPO */}
                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', flexWrap: 'wrap', gap: '15px' }}>
                        <div>
                            <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Registro de Ocorrências</h3>
                            
                            {/*FILTRO DE DATAS */}
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <label style={{ fontSize: '0.85rem', color: '#555', fontWeight: 'bold' }}>De:</label>
                                    <input 
                                        type="date" 
                                        value={filterStartDate} 
                                        onChange={e => setFilterStartDate(e.target.value)} 
                                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', outline: 'none' }} 
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <label style={{ fontSize: '0.85rem', color: '#555', fontWeight: 'bold' }}>Até:</label>
                                    <input 
                                        type="date" 
                                        value={filterEndDate} 
                                        onChange={e => setFilterEndDate(e.target.value)} 
                                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', outline: 'none' }} 
                                    />
                                </div>
                                {(filterStartDate || filterEndDate) && (
                                    <button 
                                        onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }} 
                                        style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                                    >
                                        Limpar Filtros
                                    </button>
                                )}
                            </div>
                        </div>

                        <button 
                            onClick={handleDownloadPDF} 
                            disabled={filteredHistory.length === 0}
                            style={{ padding: '8px 15px', backgroundColor: filteredHistory.length === 0 ? '#ccc' : '#e65100', color: 'white', border: 'none', borderRadius: '4px', cursor: filteredHistory.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                            Gerar PDF
                        </button>
                    </div>

                    {loading ? (
                        <p style={{ textAlign: 'center', color: '#666' }}>Buscando histórico...</p>
                    ) : history.length === 0 ? (
                        <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#e8f5e9', borderRadius: '8px', color: '#2e7d32', border: '1px dashed #a5d6a7' }}>
                            <strong>Essa unidade nunca foi para manutenção!</strong>
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#fff3cd', borderRadius: '8px', color: '#856404', border: '1px dashed #ffeeba' }}>
                            <strong>Nenhuma manutenção encontrada para este período.</strong>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f3f5', borderBottom: '2px solid #dee2e6' }}>
                                    <th style={{ padding: '12px' }}>Entrada</th>
                                    <th style={{ padding: '12px' }}>Saída</th>
                                    <th style={{ padding: '12px' }}>Status</th>
                                    <th style={{ padding: '12px' }}>Motivo / Obs</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* LISTA FILTRADA */}
                                {filteredHistory.map((record) => {
                                    const hoje = new Date().toISOString().substring(0, 10);
                                    let statusExibicao = 'Concluída';
                                    let color = '#6c757d';
                                    
                                    if (record.data_fim >= hoje && record.data_inicio <= hoje) {
                                        statusExibicao = 'Em Andamento';
                                        color = '#d32f2f';
                                    } else if (record.data_inicio > hoje) {
                                        statusExibicao = 'Agendada';
                                        color = '#f57c00';
                                    }

                                    return (
                                        <tr key={record.id} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '12px', fontWeight: 'bold' }}>{parseDateLocal(record.data_inicio)}</td>
                                            <td style={{ padding: '12px' }}>{parseDateLocal(record.data_fim)}</td>
                                            <td style={{ padding: '12px', color: color, fontWeight: 'bold' }}>{statusExibicao}</td>
                                            <td style={{ padding: '12px', color: '#555', fontSize: '0.9rem' }}>
                                                {record.observacao || '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MaintenanceHistoryModal;