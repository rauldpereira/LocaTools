import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface Category {
  id: number;
  nome: string;
}

const EquipmentForm: React.FC = () => {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [precoDiaria, setPrecoDiaria] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [totalQuantidade, setTotalQuantidade] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/categories');
        setCategories(response.data);
      } catch (error) {
        console.error('Erro categorias:', error);
      }
    };
    fetchCategories();
  }, []);

  // Handler para o input de varios arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Converte FileList para Array
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('nome', nome);
      formData.append('descricao', descricao);
      formData.append('preco_diaria', precoDiaria);
      formData.append('id_categoria', categoriaId);
      formData.append('total_quantidade', totalQuantidade);
      formData.append('quantidade_inicial', totalQuantidade);

      if (selectedFiles.length > 0) {
        selectedFiles.forEach((file) => {
          formData.append('images', file); 
        });
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      };

      await axios.post('http://localhost:3001/api/equipment', formData, config);

      alert('Equipamento cadastrado com sucesso!');

      // Limpar form
      setNome(''); setDescricao(''); setPrecoDiaria(''); 
      setCategoriaId(''); setTotalQuantidade(''); 
      setSelectedFiles([]); // Limpa array


    } catch (error) {
      console.error(error);
      alert('Erro ao cadastrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '0' }}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>

          {/* Coluna 1 */}
          <div>
            <label style={labelStyle}>Nome do Equipamento</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Betoneira 400L"
              style={inputStyle}
              required
            />
          </div>

          {/* Coluna 2 */}
          <div>
            <label style={labelStyle}>Categoria</label>
            <select
              value={categoriaId}
              onChange={e => setCategoriaId(e.target.value)}
              style={inputStyle}
              required
            >
              <option value="">Selecione...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Descrição Técnica</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Detalhes do equipamento..."
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
            />
          </div>

          {/* Preço */}
          <div>
            <label style={labelStyle}>Preço da Diária (R$)</label>
            <input
              type="number"
              step="0.01"
              value={precoDiaria}
              onChange={e => setPrecoDiaria(e.target.value)}
              placeholder="0.00"
              style={inputStyle}
              required
            />
          </div>

          {/* Quantidade */}
          <div>
            <label style={labelStyle}>Quantidade em Estoque</label>
            <input
              type="number"
              value={totalQuantidade}
              onChange={e => setTotalQuantidade(e.target.value)}
              placeholder="0"
              style={inputStyle}
              required
            />
          </div>

          {/* Input de Arquivo */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Galeria de Fotos (Selecione várias)</label>
            <input 
              type="file" 
              accept="image/*"
              multiple
              onChange={handleFileChange}
              style={{...inputStyle, padding: '6px'}}
            />
            
            {selectedFiles.length > 0 && (
              <div style={{marginTop: '10px', fontSize: '0.9rem', color: '#666'}}>
                <strong>{selectedFiles.length} arquivos selecionados:</strong>
                <ul style={{marginTop: '5px', paddingLeft: '20px'}}>
                  {selectedFiles.map((f, i) => <li key={i}>{f.name}</li>)}
                </ul>
              </div>
            )}
          </div>

        </div>

        <button
          type="submit"
          disabled={loading}
          style={submitBtnStyle}
        >
          {loading ? 'Enviando...' : '+ Cadastrar Equipamento'}
        </button>
      </form>
    </div>
  );
};

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#444', fontSize: '0.9rem' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' };
const submitBtnStyle: React.CSSProperties = { width: '100%', padding: '12px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' };

export default EquipmentForm;