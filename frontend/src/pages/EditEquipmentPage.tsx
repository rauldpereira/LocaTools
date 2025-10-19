import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface TipoAvaria {
    id: number;
    descricao: string;
    preco: string;
    is_default: boolean;
}

const EditEquipmentPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [equipmentData, setEquipmentData] = useState({
        nome: '',
        descricao: '',
        preco_diaria: '',
    });
    const [tiposAvaria, setTiposAvaria] = useState<TipoAvaria[]>([]);
    const [newAvaria, setNewAvaria] = useState({ descricao: '', preco: '' });

    
    const fetchTiposAvaria = useCallback(async () => {
        if (!token || !id) return;
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const { data } = await axios.get(`http://localhost:3001/api/tipos-avaria/${id}`, config);
            setTiposAvaria(data.map((a: any) => ({ ...a, preco: String(a.preco) })));
        } catch (error) { console.error("Erro ao buscar tipos de avaria", error); }
    }, [id, token]);

    const fetchEquipment = useCallback(async () => {
        if (!id) return;
        try {
            const { data } = await axios.get(`http://localhost:3001/api/equipment/${id}`);
            setEquipmentData({
                nome: data.nome,
                descricao: data.descricao,
                preco_diaria: String(data.preco_diaria),
            });
        } catch (error) {
            console.error("Erro ao buscar equipamento:", error);
        }
    }, [id]);
    
    useEffect(() => {
        fetchEquipment();
        fetchTiposAvaria();
    }, [fetchEquipment, fetchTiposAvaria]); 

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setEquipmentData({ ...equipmentData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.put(`http://localhost:3001/api/equipment/${id}`, {
                ...equipmentData,
                preco_diaria: parseFloat(equipmentData.preco_diaria) 
            }, config);
            alert('Equipamento atualizado com sucesso!');
            navigate('/admin');
        } catch (error) {
            console.error('Erro ao atualizar equipamento:', error);
            alert('Falha ao atualizar.');
        }
    };

        const handleAvariaChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
            const values = [...tiposAvaria];
            values[index][event.target.name as 'descricao' | 'preco'] = event.target.value;
            setTiposAvaria(values);
        };

        const handleUpdateAvaria = async (index: number) => {
            const avariaToUpdate = tiposAvaria[index];
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const payload = { ...avariaToUpdate, preco: parseFloat(avariaToUpdate.preco) };
                await axios.put(`http://localhost:3001/api/tipos-avaria/${avariaToUpdate.id}`, payload, config);
                alert('Avaria atualizada com sucesso!');
            } catch (error) { alert('Erro ao atualizar avaria.'); }
        };

        const handleAddAvaria = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const payload = { ...newAvaria, preco: parseFloat(newAvaria.preco), id_equipamento: id };
                await axios.post('http://localhost:3001/api/tipos-avaria', payload, config);
                setNewAvaria({ descricao: '', preco: '' });
                fetchTiposAvaria();
            } catch (error) { alert('Erro ao adicionar avaria.'); }
        };

        const handleDeleteAvaria = async (avariaId: number) => {
            if (!window.confirm("Tem certeza que deseja excluir este tipo de avaria?")) return;
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                await axios.delete(`http://localhost:3001/api/tipos-avaria/${avariaId}`, config);
                fetchTiposAvaria();
            } catch (error) { alert('Erro ao excluir avaria.'); }
        };

        return (
            <div style={{ padding: '2rem', marginTop: '60px' }}>
                <h1>Editar Equipamento #{id}</h1>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
                        <label>Nome:</label>
                        <input type="text" name="nome" value={equipmentData.nome} onChange={handleChange} />
                        <label>Descrição:</label>
                        <textarea name="descricao" value={equipmentData.descricao} onChange={handleChange} />
                        <label>Preço Diária:</label>
                        <input type="number" name="preco_diaria" value={equipmentData.preco_diaria} onChange={handleChange} />
                        <button type="submit">Salvar Alterações</button>
                    </div>
                </form>

                <hr style={{ margin: '2rem 0' }} />

                <h2>Tipos de Avaria Cadastrados</h2>
                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                {tiposAvaria.map((avaria, index) => (
                    <div key={avaria.id} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                            type="text"
                            name="descricao"
                            value={avaria.descricao}
                            onChange={e => handleAvariaChange(index, e)}
                            disabled={avaria.is_default} 
                            style={{ flex: 2 }}
                        />
                        <input
                            type="number"
                            name="preco"
                            value={avaria.preco}
                            onChange={e => handleAvariaChange(index, e)}
                            style={{ flex: 1 }}
                        />
                        <button type="button" onClick={() => handleUpdateAvaria(index)}>Salvar</button>
                        {!avaria.is_default && (
                            <button type="button" onClick={() => handleDeleteAvaria(avaria.id)} style={{backgroundColor: '#dc3545', color: 'white'}}>&times;</button>
                        )}
                    </div>
                ))}
            </div>

                <h3>Adicionar Nova Avaria</h3>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Descrição (ex: Risco na pintura)"
                        value={newAvaria.descricao}
                        onChange={e => setNewAvaria({ ...newAvaria, descricao: e.target.value })}
                    />
                    <input
                        type="number"
                        placeholder="Preço"
                        value={newAvaria.preco}
                        onChange={e => setNewAvaria({ ...newAvaria, preco: e.target.value })}
                    />
                    <button onClick={handleAddAvaria}>Adicionar</button>
                </div>
            </div>

        );
    };

    export default EditEquipmentPage;