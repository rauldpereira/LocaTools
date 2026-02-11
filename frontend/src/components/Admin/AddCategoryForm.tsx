import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface Category {
  id: number;
  nome: string; 
}

const AddCategoryForm: React.FC = () => {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Erro ao buscar categorias', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post('http://localhost:3001/api/categories', {
        nome: name 
      }, config);
      alert('Categoria criada!');
      setName('');
      fetchCategories();
    } catch (error) {
      alert('Erro ao criar categoria.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir esta categoria?')) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`http://localhost:3001/api/categories/${id}`, config);
      fetchCategories();
    } catch (error) {
      alert('Erro ao excluir. Verifique se há equipamentos vinculados.');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* FORMULÁRIO DE CRIAÇÃO */}
      <div style={{ backgroundColor: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #e9ecef' }}>
        <h4 style={{ marginTop: 0, color: '#555', marginBottom: '1rem' }}>Nova Categoria</h4>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Nome da Categoria</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Ex: Ferramentas Elétricas"
              style={inputStyle}
              required
            />
          </div>
          <button type="submit" disabled={loading} style={submitBtnStyle}>
            {loading ? 'Salvando...' : '+ Adicionar'}
          </button>
        </form>
      </div>

      {/* LISTA DE CATEGORIAS */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f1f1', color: '#333', textAlign: 'left' }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Nome</th>
              <th style={{...thStyle, textAlign: 'right'}}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, index) => (
              <tr key={cat.id} style={{ borderBottom: '1px solid #eee', backgroundColor: index % 2 === 0 ? '#fff' : '#fcfcfc' }}>
                <td style={tdStyle}>#{cat.id}</td>
                <td style={{...tdStyle, fontWeight: 'bold'}}>{cat.nome}</td>
                <td style={{...tdStyle, textAlign: 'right'}}>
                  <button onClick={() => handleDelete(cat.id)} style={deleteBtnStyle}>Excluir</button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>Nenhuma categoria encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};



const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#444', fontSize: '0.9rem' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' };
const submitBtnStyle: React.CSSProperties = { padding: '10px 20px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', height: '42px' };
const thStyle: React.CSSProperties = { padding: '15px', fontWeight: '600', fontSize: '0.9rem' };
const tdStyle: React.CSSProperties = { padding: '12px', color: '#333' };
const deleteBtnStyle: React.CSSProperties = { padding: '6px 12px', border: '1px solid #dc3545', backgroundColor: 'white', color: '#dc3545', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' };

export default AddCategoryForm;