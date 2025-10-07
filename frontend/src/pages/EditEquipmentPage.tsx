import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const EditEquipmentPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [equipmentData, setEquipmentData] = useState({
        nome: '',
        descricao: '',
        preco_diaria: '',
    });

    useEffect(() => {
        const fetchEquipment = async () => {
            try {
                const { data } = await axios.get(`http://localhost:3001/api/equipment/${id}`);
                setEquipmentData({
                    nome: data.nome,
                    descricao: data.descricao,
                    preco_diaria: data.preco_diaria,
                });
            } catch (error) {
                console.error("Erro ao buscar equipamento:", error);
            }
        };
        fetchEquipment();
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setEquipmentData({
            ...equipmentData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.put(`http://localhost:3001/api/equipment/${id}`, equipmentData, config);
            alert('Equipamento atualizado com sucesso!');
            navigate('/admin');
        } catch (error) {
            console.error('Erro ao atualizar equipamento:', error);
            alert('Falha ao atualizar.');
        }
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
        </div>
    );
};

export default EditEquipmentPage;