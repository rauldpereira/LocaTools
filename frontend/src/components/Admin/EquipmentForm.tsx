import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface Categoria {
  id: number;
  nome: string;
}

interface Avaria { descricao: string; preco: string; }

const EquipmentForm: React.FC = () => {
  const { user, isLoggedIn, token } = useAuth();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [precoDiaria, setPrecoDiaria] = useState('');
  const [idCategoria, setIdCategoria] = useState('');
  const [urlImagem, setUrlImagem] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [quantidadeInicial, setQuantidadeInicial] = useState('1');
  const [avarias, setAvarias] = useState<Avaria[]>([{ descricao: '', preco: '' }]);


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


  const handleAvariaChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const values = [...avarias];
    values[index][event.target.name as keyof Avaria] = event.target.value;
    setAvarias(values);
  };

  const handleAddAvaria = () => {
    setAvarias([...avarias, { descricao: '', preco: '' }]);
  };

  const handleRemoveAvaria = (index: number) => {
    const values = [...avarias];
    values.splice(index, 1);
    setAvarias(values);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn || user?.tipo_usuario !== 'admin') {
      setMensagem('Erro: Você não tem permissão de administrador.');
      return;
    }

    const payload = {
      nome,
      descricao,
      preco_diaria: parseFloat(precoDiaria),
      id_categoria: parseInt(idCategoria),
      url_imagem: urlImagem,
      quantidade_inicial: parseInt(quantidadeInicial),
      avarias: avarias.filter(a => a.descricao && a.preco).map(a => ({ ...a, preco: parseFloat(a.preco) }))
    };

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post('http://localhost:3001/api/equipment', payload, config);

      setMensagem('Equipamento e avarias criados com sucesso!');
      setNome(''); setDescricao(''); setPrecoDiaria(''); setIdCategoria('');
      setUrlImagem(''); setQuantidadeInicial('1'); setAvarias([{ descricao: '', preco: '' }]);
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
        <select value={idCategoria} onChange={(e) => setIdCategoria(e.target.value)} required>
          <option value="">Selecione a Categoria</option>
          {categorias.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.nome}</option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Quantidade Inicial em Estoque"
          value={quantidadeInicial}
          onChange={(e) => setQuantidadeInicial(e.target.value)}
          min="0"
          required
        />

        <input type="text" placeholder="URL da Imagem" value={urlImagem} onChange={(e) => setUrlImagem(e.target.value)} required />

        <h3>Cadastrar Tipos de Avaria Do Equipamento</h3>
        {avarias.map((avaria, index) => (
          <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              name="descricao"
              placeholder="Descrição da Avaria (ex: Risco)"
              value={avaria.descricao}
              onChange={e => handleAvariaChange(index, e)}
            />
            <input
              type="number"
              name="preco"
              placeholder="Preço"
              value={avaria.preco}
              onChange={e => handleAvariaChange(index, e)}
            />
            <button type="button" onClick={() => handleRemoveAvaria(index)} style={{ backgroundColor: '#dc3545' }}>&times;</button>
          </div>
        ))}
        <button type="button" onClick={handleAddAvaria}>+ Adicionar Avaria</button>

        <hr/>

        <button type="submit">Adicionar Equipamento</button>
      </form>
      {mensagem && <p style={{ marginTop: '1rem', color: mensagem.startsWith('Erro') ? 'red' : 'green' }}>{mensagem}</p>}
    </div>
  );
};

export default EquipmentForm;