import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface Categoria {
  id: number;
  nome: string;
}

const EquipmentForm: React.FC = () => {
  const { user, isLoggedIn } = useAuth();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [precoDiaria, setPrecoDiaria] = useState('');
  const [idCategoria, setIdCategoria] = useState('');
  const [urlImagem, setUrlImagem] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
<<<<<<< HEAD
=======
  const [quantidadeInicial, setQuantidadeInicial] = useState('1');
>>>>>>> 2d9d9a8 (feat: add calendario, modal e consertado o bug de uma unidade fantasma)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get<Categoria[]>('http://localhost:3001/api/categories', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCategorias(response.data);
      } catch (error) {
        console.error('Erro ao buscar categorias:', error);
      }
    };
    if (isLoggedIn && user?.tipo_usuario === 'admin') {
      fetchCategories();
    }
  }, [isLoggedIn, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn || user?.tipo_usuario !== 'admin') {
      setMensagem('Erro: Você não tem permissão de administrador.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:3001/api/equipment', {
        nome,
        descricao,
        preco_diaria: parseFloat(precoDiaria),
        id_categoria: parseInt(idCategoria),
        url_imagem: urlImagem,
<<<<<<< HEAD
=======
        quantidade_inicial: parseInt(quantidadeInicial)
>>>>>>> 2d9d9a8 (feat: add calendario, modal e consertado o bug de uma unidade fantasma)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMensagem(response.data.message || 'Equipamento criado com sucesso!');
      console.log('Equipamento criado:', response.data);
      setNome('');
      setDescricao('');
      setPrecoDiaria('');
      setIdCategoria('');
      setUrlImagem('');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        setMensagem('Erro: ' + (error.response.data.error || 'Erro no servidor'));
        console.error('Erro ao criar equipamento:', error.response.data);
      } else {
        setMensagem('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
        console.error(error);
      }
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Adicionar Novo Equipamento</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
        <input type="text" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <textarea placeholder="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
        <input type="number" placeholder="Preço Diária" value={precoDiaria} onChange={(e) => setPrecoDiaria(e.target.value)} required />
<<<<<<< HEAD
        
=======

>>>>>>> 2d9d9a8 (feat: add calendario, modal e consertado o bug de uma unidade fantasma)
        <select value={idCategoria} onChange={(e) => setIdCategoria(e.target.value)} required>
          <option value="">Selecione a Categoria</option>
          {categorias.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.nome}</option>
          ))}
        </select>
<<<<<<< HEAD
=======
          
        <input
          type="number"
          placeholder="Quantidade Inicial em Estoque"
          value={quantidadeInicial}
          onChange={(e) => setQuantidadeInicial(e.target.value)}
          min="0"
          required
        />
>>>>>>> 2d9d9a8 (feat: add calendario, modal e consertado o bug de uma unidade fantasma)

        <input type="text" placeholder="URL da Imagem" value={urlImagem} onChange={(e) => setUrlImagem(e.target.value)} required />
        <button type="submit">Adicionar Equipamento</button>
      </form>
      {mensagem && <p style={{ marginTop: '1rem', color: mensagem.startsWith('Erro') ? 'red' : 'green' }}>{mensagem}</p>}
    </div>
  );
};

export default EquipmentForm;