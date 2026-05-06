import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  X, 
  Download, 
  Wrench, 
  History, 
  Calendar, 
  Loader2,
  CheckCircle,
  Clock
} from 'lucide-react';

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
            headStyles: { fillColor: [37, 99, 235] }
        });

        doc.save(`Historico_Manutencao_Unidade_${unitId}.pdf`);
    };

    if (!isOpen) return null;

    return (
        <div style={modalOverlayStyle} onClick={onClose}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                
                {/* CABEÇALHO */}
                <div style={modalHeaderStyle}>
                    <div>
                        <h2 style={{ margin: "0 0 5px 0", color: '#1e293b', display: "flex", alignItems: "center", gap: "10px", fontSize: "1.4rem" }}>
                            <Wrench size={24} color="#2563eb" /> Histórico da Máquina #{unitId}
                        </h2>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#64748b", fontSize: "0.95rem", fontWeight: "600" }}>
                            <span>{equipmentName}</span>
                            <span style={{ color: "#cbd5e1" }}>|</span>
                            <span style={{ backgroundColor: "#f1f5f9", padding: "2px 8px", borderRadius: "6px", color: "#475569", fontWeight: "700" }}>
                                S/N: {unitSerial || 'N/A'}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} style={closeBtnStyle}><X size={24} /></button>
                </div>

                {/* CORPO */}
                <div style={{ padding: '25px', overflowY: 'auto', flex: 1, backgroundColor: "#f8fafc" }}>
                    
                    {/* CONTROLES */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px', backgroundColor: "#fff", padding: "15px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={16} color="#64748b" />
                                <input 
                                    type="date" 
                                    value={filterStartDate} 
                                    onChange={e => setFilterStartDate(e.target.value)} 
                                    style={miniInputStyle} 
                                    title="Data Inicial"
                                />
                            </div>
                            <span style={{ color: "#cbd5e1" }}>-</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input 
                                    type="date" 
                                    value={filterEndDate} 
                                    onChange={e => setFilterEndDate(e.target.value)} 
                                    style={miniInputStyle} 
                                    title="Data Final"
                                />
                            </div>
                            {(filterStartDate || filterEndDate) && (
                                <button 
                                    onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }} 
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', marginLeft: "10px" }}
                                >
                                    Limpar Filtros
                                </button>
                            )}
                        </div>

                        <button 
                            onClick={handleDownloadPDF} 
                            disabled={filteredHistory.length === 0}
                            style={{ 
                                padding: '10px 18px', 
                                backgroundColor: filteredHistory.length === 0 ? '#cbd5e1' : '#1e293b', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '8px', 
                                cursor: filteredHistory.length === 0 ? 'not-allowed' : 'pointer', 
                                fontWeight: 'bold', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                fontSize: "0.9rem"
                            }}
                        >
                            <Download size={16} /> Exportar PDF
                        </button>
                    </div>

                    {/* CONTEÚDO */}
                    <div style={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                        {loading ? (
                            <div style={{ textAlign: "center", padding: "50px", color: "#64748b" }}>
                                <Loader2 size={32} className="spin-animation" style={{ margin: "0 auto 15px auto", color: "#2563eb" }} />
                                <p style={{ margin: 0, fontWeight: "600" }}>Buscando histórico...</p>
                            </div>
                        ) : history.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#ecfdf5', color: '#047857' }}>
                                <CheckCircle size={40} color="#10b981" style={{ margin: "0 auto 15px auto" }} />
                                <h3 style={{ margin: "0 0 5px 0" }}>Unidade Saudável!</h3>
                                <p style={{ margin: 0 }}>Essa máquina nunca registrou paradas para manutenção.</p>
                            </div>
                        ) : filteredHistory.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#fffbeb', color: '#92400e' }}>
                                <History size={40} color="#f59e0b" style={{ margin: "0 auto 15px auto" }} />
                                <h3 style={{ margin: "0 0 5px 0" }}>Nenhuma manutenção</h3>
                                <p style={{ margin: 0 }}>Não encontramos registros para o período filtrado.</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: "#64748b", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.05em" }}>
                                            <th style={{ padding: '15px' }}>Entrada</th>
                                            <th style={{ padding: '15px' }}>Saída</th>
                                            <th style={{ padding: '15px' }}>Status</th>
                                            <th style={{ padding: '15px' }}>Motivo / Obs</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredHistory.map((record) => {
                                            const hoje = new Date().toISOString().substring(0, 10);
                                            let statusExibicao = 'Concluída';
                                            let badgeProps = { bg: "#f1f5f9", color: "#475569", icon: <CheckCircle size={14}/> };
                                            
                                            if (record.data_fim >= hoje && record.data_inicio <= hoje) {
                                                statusExibicao = 'Em Andamento';
                                                badgeProps = { bg: "#fef2f2", color: "#ef4444", icon: <Wrench size={14}/> };
                                            } else if (record.data_inicio > hoje) {
                                                statusExibicao = 'Agendada';
                                                badgeProps = { bg: "#fffbeb", color: "#f59e0b", icon: <Clock size={14}/> };
                                            }

                                            return (
                                                <tr key={record.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                                                    <td style={{ padding: '15px', fontWeight: 'bold', color: "#1e293b" }}>{parseDateLocal(record.data_inicio)}</td>
                                                    <td style={{ padding: '15px', color: "#475569" }}>{parseDateLocal(record.data_fim)}</td>
                                                    <td style={{ padding: '15px' }}>
                                                        <span style={{ 
                                                            display: "inline-flex", alignItems: "center", gap: "6px",
                                                            backgroundColor: badgeProps.bg, color: badgeProps.color, 
                                                            padding: "4px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "800", textTransform: "uppercase" 
                                                        }}>
                                                            {badgeProps.icon} {statusExibicao}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '15px', color: '#64748b', fontSize: '0.9rem' }}>
                                                        {record.observacao || '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <style>{`
                .table-row-hover:hover { background-color: #f8fafc !important; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .spin-animation { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
};

// --- ESTILOS ---
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, animation: "fadeIn 0.2s ease" };
const modalContentStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', width: '90%', maxWidth: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' };
const modalHeaderStyle: React.CSSProperties = { padding: '20px 25px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: "#fff" };
const closeBtnStyle: React.CSSProperties = { background: "#f1f5f9", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", transition: "0.2s" };
const miniInputStyle: React.CSSProperties = { padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none", color: "#334155", fontFamily: "inherit" };

export default MaintenanceHistoryModal;