import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const AddCategoryForm: React.FC = () => {
    const { user, isLoggedIn } = useAuth();
    const [novaCategoria, setNovaCategoria] = useState('');
    const [mensagem, setMensagem] = useState('');

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoggedIn || user?.tipo_usuario !== 'admin') {
            setMensagem('Erro: Você não tem permissão de administrador.');
            return;
        }
        if (!novaCategoria) {
            setMensagem('Por favor, insira o nome da nova categoria.');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('http://localhost:3001/api/categories', {
                nome: novaCategoria,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMensagem(`Categoria "${response.data.nome}" adicionada com sucesso!`);
            setNovaCategoria('');
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                setMensagem('Erro: ' + (error.response.data.error || 'Erro no servidor'));
            } else {
                setMensagem('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
            }
        }
    };

    return (
        <div style={{ padding: '2rem' }}>
            <h2>Adicionar Nova Categoria</h2>
            <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
                <input
                    type="text"
                    placeholder="Nome da Categoria"
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value)}
                    required
                />
                <button type="submit">Adicionar Categoria</button>
            </form>
            {mensagem && <p style={{ marginTop: '1rem', color: mensagem.startsWith('Erro') ? 'red' : 'green' }}>{mensagem}</p>}
        </div>
    );
};

export default AddCategoryForm;