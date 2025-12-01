import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface ItemReserva {
    id: number;
    Unidade: {
        id: number;
        Equipamento: {
            nome: string;
        }
    }
}

interface PrejuizoModalProps {
    item: ItemReserva;
    onClose: () => void;
    onSuccess: () => void;
}

const PrejuizoModal: React.FC<PrejuizoModalProps> = ({ item, onClose, onSuccess }) => {
    const { token } = useAuth();
    
    const [tipo, setTipo] = useState('ROUBO');
    const [valor, setValor] = useState('');
    const [observacao, setObservacao] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!valor) return alert("Digite o valor do prejuízo.");
        if (!confirm("Tem certeza? Isso pode baixar o estoque e finalizar o item.")) return;

        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            await axios.post('http://localhost:3001/api/prejuizos', {
                item_reserva_id: item.id,
                tipo,
                valor_prejuizo: parseFloat(valor),
                observacao
            }, config);

            alert("Prejuízo registrado com sucesso.");
            onSuccess();
        } catch (error: any) {
            console.error("Erro ao registrar:", error);
            alert("Erro: " + (error.response?.data?.error || "Falha desconhecida."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ color: '#dc3545', margin: 0 }}>🚨 Registrar Prejuízo / B.O.</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                <p style={{marginBottom: '1rem'}}>
                    Item: <strong>{item.Unidade.Equipamento.nome} (ID: {item.Unidade.id})</strong>
                </p>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Tipo da Ocorrência:</label>
                        <select 
                            value={tipo} 
                            onChange={(e) => setTipo(e.target.value)}
                            style={inputStyle}
                        >
                            <option value="ROUBO">Roubo (Baixa de Estoque)</option>
                            <option value="EXTRAVIO">Extravio (Baixa de Estoque)</option>
                            <option value="AVARIA">Avaria Total (Baixa de Estoque)</option>
                            <option value="CALOTE">Calote / Inadimplência (Item Devolvido)</option>
                            <option value="OUTRO">Outro</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Valor do Prejuízo (R$):</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            value={valor}
                            onChange={(e) => setValor(e.target.value)}
                            placeholder="Ex: 2500.00"
                            style={inputStyle}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Observação / Justificativa:</label>
                        <textarea 
                            value={observacao}
                            onChange={(e) => setObservacao(e.target.value)}
                            placeholder="Descreva o que aconteceu..."
                            style={{ ...inputStyle, minHeight: '80px' }}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} style={{ padding: '10px', background: '#ccc', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Cancelar</button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            style={{ padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            {loading ? 'Salvando...' : 'Confirmar Prejuízo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 1100
};

const modalContentStyle: React.CSSProperties = {
    backgroundColor: 'white', padding: '2rem', borderRadius: '8px',
    width: '90%', maxWidth: '500px', borderTop: '5px solid #dc3545'
};

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px', borderRadius: '5px',
    border: '1px solid #ccc', fontSize: '1rem'
};

export default PrejuizoModal;