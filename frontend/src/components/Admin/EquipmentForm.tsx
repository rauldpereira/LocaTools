import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Image as ImageIcon, CheckCircle, Trash2, Star, ChevronUp } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface Category {
  id: number;
  nome: string;
}

const EquipmentForm: React.FC = () => {
  const toast = useToast();
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [precoDiaria, setPrecoDiaria] = useState('');
  const [precoSemanal, setPrecoSemanal] = useState('');
  const [precoQuinzenal, setPrecoQuinzenal] = useState('');
  const [precoMensal, setPrecoMensal] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [totalQuantidade, setTotalQuantidade] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [loading, setLoading] = useState(false);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, position: number) => {
    dragItem.current = position;
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLIElement>, position: number) => {
    dragOverItem.current = position;
  };

  const handleDrop = () => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      const newList = [...selectedFiles];
      const dragItemContent = newList[dragItem.current];
      newList.splice(dragItem.current, 1);
      newList.splice(dragOverItem.current, 0, dragItemContent);
      dragItem.current = null;
      dragOverItem.current = null;
      setSelectedFiles(newList);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setSelectedFiles(selectedFiles.filter((_, index) => index !== indexToRemove));
  };

  const handleMakePrincipal = (index: number) => {
    if (index === 0) return;
    const newList = [...selectedFiles];
    const item = newList.splice(index, 1)[0];
    newList.unshift(item);
    setSelectedFiles(newList);
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/categories`);
        setCategories(response.data);
      } catch (error) {
        console.error('Erro categorias:', error);
      }
    };
    fetchCategories();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
    }
  };

  const parseBrValue = (val: string) => {
    if (!val) return "";
    const clean = val.replace(/\s/g, ''); 

    if (clean.includes(',')) {
      return clean.replace(/\./g, '').replace(',', '.');
    }

    if (clean.includes('.')) {
      const parts = clean.split('.');
      const lastPart = parts[parts.length - 1];

      if (parts.length > 2) {
        return clean.replace(/\./g, '');
      }

      if (lastPart.length === 3) {
        return clean.replace(/\./g, '');
      }

      return clean;
    }

    return clean;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('nome', nome);
      formData.append('descricao', descricao);
      formData.append('preco_diaria', parseBrValue(precoDiaria));
      formData.append('preco_semanal', parseBrValue(precoSemanal));
      formData.append('preco_quinzenal', parseBrValue(precoQuinzenal));
      formData.append('preco_mensal', parseBrValue(precoMensal));
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

      await axios.post(`${import.meta.env.VITE_API_URL}/api/equipment`, formData, config);

      toast.success('Equipamento cadastrado com sucesso!');

      setNome(''); setDescricao(''); setPrecoDiaria(''); 
      setPrecoSemanal(''); setPrecoQuinzenal(''); setPrecoMensal('');
      setCategoriaId(''); setTotalQuantidade(''); 
      setSelectedFiles([]);

    } catch (error) {
      console.error(error);
      toast.error('Erro ao cadastrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '12px', animation: "fadeIn 0.3s ease" }}>
      
      <div style={{ marginBottom: "25px" }}>
        <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "5px 0 0 0" }}>Preencha as informações para adicionar um novo equipamento ao inventário.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>

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

          <div>
            <label style={labelStyle}>Categoria</label>
            <select
              value={categoriaId}
              onChange={e => setCategoriaId(e.target.value)}
              style={inputStyle}
              required
            >
              <option value="">Selecione uma categoria...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Descrição Técnica</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Detalhes, voltagem, marca e capacidade do equipamento..."
              style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={labelStyle}>Preço da Diária (R$)</label>
            <input
              type="text"
              value={precoDiaria}
              onChange={e => setPrecoDiaria(e.target.value)}
              placeholder="0,00"
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Preço Semanal (R$)</label>
            <input
              type="text"
              value={precoSemanal}
              onChange={e => setPrecoSemanal(e.target.value)}
              placeholder="0,00"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Preço Quinzenal (R$)</label>
            <input
              type="text"
              value={precoQuinzenal}
              onChange={e => setPrecoQuinzenal(e.target.value)}
              placeholder="0,00"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Preço Mensal (R$)</label>
            <input
              type="text"
              value={precoMensal}
              onChange={e => setPrecoMensal(e.target.value)}
              placeholder="0,00"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Quantidade Inicial em Estoque</label>
            <input
              type="number"
              value={totalQuantidade}
              onChange={e => setTotalQuantidade(e.target.value)}
              placeholder="1"
              min="1"
              style={inputStyle}
              required
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Galeria de Fotos do Equipamento</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <label 
                htmlFor="file-upload" 
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', 
                  backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '8px', 
                  border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              >
                <ImageIcon size={18} />
                Procurar Fotos
              </label>
              <input 
                id="file-upload"
                type="file" 
                accept="image/*"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                {selectedFiles.length === 0 ? "Nenhuma imagem selecionada" : `${selectedFiles.length} arquivo(s) selecionado(s)`}
              </span>
            </div>
            
            {selectedFiles.length > 0 && (
              <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedFiles.map((f, i) => (
                    <div 
                      key={i} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, i)}
                      onDragEnter={(e) => handleDragEnter(e, i)}
                      onDragEnd={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '8px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: "0 2px 4px rgba(0,0,0,0.02)", cursor: "grab" }}
                    >
                      <div style={{ width: '40px', display: "flex", justifyContent: "center" }}>
                          {i === 0 ? <Star size={18} color="#f59e0b" fill="#f59e0b" /> : <span style={{ color: "#cbd5e1", fontWeight: "bold" }}>{i + 1}</span>}
                      </div>

                      <img src={URL.createObjectURL(f)} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', marginRight: '15px', border: '1px solid #f1f5f9' }} alt="Preview" />

                      <div style={{ flex: 1, fontSize: '0.8rem', fontWeight: "600", color: "#475569" }}>
                          {f.name}
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                          {i > 0 && (
                              <button type="button" onClick={() => handleMakePrincipal(i)} title="Tornar Principal" style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer', background: 'white', color: "#64748b", display: "flex", alignItems: "center" }}><ChevronUp size={16} /></button>
                          )}
                          <button type="button" onClick={() => handleRemoveImage(i)} title="Remover" style={{ padding: '6px', borderRadius: '6px', border: '1px solid #fee2e2', cursor: 'pointer', background: 'white', color: '#ef4444', display: "flex", alignItems: "center" }}><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "20px", display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            disabled={loading}
            style={submitBtnStyle}
            onMouseOver={(e) => { if(!loading) e.currentTarget.style.backgroundColor = '#1d4ed8' }}
            onMouseOut={(e) => { if(!loading) e.currentTarget.style.backgroundColor = '#2563eb' }}
          >
            {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
          </button>
        </div>
      </form>
    </div>
  );
};

const labelStyle: React.CSSProperties = { 
  display: 'block', 
  marginBottom: '8px', 
  fontWeight: '700', 
  color: '#475569', 
  fontSize: '0.85rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const inputStyle: React.CSSProperties = { 
  width: '100%', 
  padding: '12px 15px', 
  borderRadius: '8px', 
  border: '1px solid #cbd5e1', 
  fontSize: '0.95rem', 
  color: '#334155',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s'
};

const submitBtnStyle: React.CSSProperties = { 
  padding: '14px 28px', 
  backgroundColor: '#2563eb', 
  color: 'white', 
  border: 'none', 
  borderRadius: '8px', 
  fontSize: '1rem', 
  fontWeight: 'bold', 
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
};

export default EquipmentForm;