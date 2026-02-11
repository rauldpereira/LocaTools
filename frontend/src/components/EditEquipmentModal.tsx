import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; 

interface TipoAvaria {
    id: number;
    descricao: string;
    preco: string;
    is_default: boolean;
}

interface Category {
    id: number;
    nome: string;
}

interface ImageItem {
    id: string; 
    type: 'url' | 'file';
    content: string | File; 
    preview: string; 
}

interface EditModalProps {
    equipmentId: number | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const EditEquipmentModal: React.FC<EditModalProps> = ({ equipmentId, isOpen, onClose, onSuccess }) => {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<'dados' | 'avarias'>('dados');
    const [categories, setCategories] = useState<Category[]>([]);
    const [formData, setFormData] = useState({
        nome: '',
        descricao: '',
        preco_diaria: '',
        id_categoria: '',
    });

    const [imageList, setImageList] = useState<ImageItem[]>([]);
    const [tiposAvaria, setTiposAvaria] = useState<TipoAvaria[]>([]);
    const [newAvaria, setNewAvaria] = useState({ descricao: '', preco: '' });

    const fetchData = useCallback(async () => {
        if (!equipmentId || !isOpen) return;

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // Busca Categorias para o Select
            const resCat = await axios.get('http://localhost:3001/api/categories', config);
            setCategories(resCat.data);

            // Busca Dados do Equipamento
            const resEquip = await axios.get(`http://localhost:3001/api/equipment/${equipmentId}`);
            const data = resEquip.data;

            setFormData({
                nome: data.nome,
                descricao: data.descricao,
                preco_diaria: String(data.preco_diaria),
                id_categoria: data.id_categoria ? String(data.id_categoria) : '',
            });

            // Processa Imagens
            let loadedImages: ImageItem[] = [];
            if (data.url_imagem) {
                try {
                    const parsed = JSON.parse(data.url_imagem);
                    const arr = Array.isArray(parsed) ? parsed : [data.url_imagem];
                    
                    loadedImages = arr.map((url: string, index: number) => ({
                        id: `old-${index}`,
                        type: 'url',
                        content: url,
                        preview: `http://localhost:3001${url}`
                    }));
                } catch {
                    const url = data.url_imagem;
                    loadedImages = [{
                        id: 'old-0',
                        type: 'url',
                        content: url,
                        preview: url.startsWith('http') ? url : `http://localhost:3001${url}`
                    }];
                }
            }
            setImageList(loadedImages);

            // Busca Avarias
            const resAvaria = await axios.get(`http://localhost:3001/api/tipos-avaria/${equipmentId}`, config);
            setTiposAvaria(resAvaria.data.map((a: any) => ({ ...a, preco: String(a.preco) })));

        } catch (error) {
            console.error("Erro ao carregar modal:", error);
        }
    }, [equipmentId, isOpen, token]);

    useEffect(() => {
        if (isOpen) {
            fetchData();
            setActiveTab('dados');
        }
    }, [isOpen, fetchData]);


    // --- LÓGICA DE IMAGENS ---
    const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newItems: ImageItem[] = Array.from(e.target.files).map((file, idx) => ({
                id: `new-${Date.now()}-${idx}`,
                type: 'file',
                content: file,
                preview: URL.createObjectURL(file)
            }));
            setImageList([...imageList, ...newItems]);
        }
    };

    const handleRemoveImage = (idToRemove: string) => {
        setImageList(imageList.filter(img => img.id !== idToRemove));
    };

    const handleMakePrincipal = (index: number) => {
        if (index === 0) return;
        const newList = [...imageList];
        const item = newList.splice(index, 1)[0]; // Remove da posição atual
        newList.unshift(item); // Coloca no topo
        setImageList(newList);
    };


    // --- SUBMIT EQUIPAMENTO ---
    const handleSubmit = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } };
            const formDataEnvio = new FormData();

            formDataEnvio.append('nome', formData.nome);
            formDataEnvio.append('descricao', formData.descricao);
            formDataEnvio.append('preco_diaria', formData.preco_diaria);
            if (formData.id_categoria) formDataEnvio.append('id_categoria', formData.id_categoria);

            const existingUrls: string[] = [];
            
            imageList.forEach(img => {
                if (img.type === 'url') {
                    existingUrls.push(img.content as string);
                } else {
                    formDataEnvio.append('images', img.content as File);
                }
            });

            formDataEnvio.append('existing_images', JSON.stringify(existingUrls));

            await axios.put(`http://localhost:3001/api/equipment/${equipmentId}`, formDataEnvio, config);
            
            alert('Equipamento salvo com sucesso!');
            onSuccess();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar equipamento.');
        }
    };


    // --- LÓGICA DE AVARIAS ---
    const handleAvariaChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const values = [...tiposAvaria];
        // @ts-ignore
        values[index][e.target.name] = e.target.value;
        setTiposAvaria(values);
    };

    const handleUpdateAvaria = async (index: number) => {
        const avariaToUpdate = tiposAvaria[index];
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const payload = { ...avariaToUpdate, preco: parseFloat(avariaToUpdate.preco) };
            await axios.put(`http://localhost:3001/api/tipos-avaria/${avariaToUpdate.id}`, payload, config);
            alert('Avaria atualizada!');
        } catch (error) { alert('Erro ao atualizar avaria.'); }
    };

    const handleAddAvaria = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const payload = { ...newAvaria, preco: parseFloat(newAvaria.preco), id_equipamento: equipmentId };
            await axios.post('http://localhost:3001/api/tipos-avaria', payload, config);
            setNewAvaria({ descricao: '', preco: '' });
            fetchData();
        } catch (error) { alert('Erro ao adicionar avaria.'); }
    };

    const handleDeleteAvaria = async (id: number) => {
        if (!confirm('Apagar esta avaria?')) return;
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.delete(`http://localhost:3001/api/tipos-avaria/${id}`, config);
            fetchData();
        } catch (error) { alert('Erro ao apagar avaria.'); }
    };


    if (!isOpen) return null;

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                
                {/* Header */}
                <div style={headerStyle}>
                    <h2 style={{margin:0, color: "#000"}}>Editar Equipamento #{equipmentId}</h2>
                    <button onClick={onClose} style={closeBtnStyle}>&times;</button>
                </div>

                {/* Abas */}
                <div style={{display:'flex', borderBottom:'1px solid #ddd', marginBottom:'15px'}}>
                    <button onClick={()=>setActiveTab('dados')} style={{...tabStyle, fontWeight: activeTab==='dados'?'bold':'normal', borderBottom: activeTab==='dados'?'3px solid #007bff':'none', color: "#000"}}>📝 Dados & Fotos</button>
                    <button onClick={()=>setActiveTab('avarias')} style={{...tabStyle, fontWeight: activeTab==='avarias'?'bold':'normal', borderBottom: activeTab==='avarias'?'3px solid #007bff':'none', color: "#000"}}>⚠️ Avarias</button>
                </div>

                {/* Conteúdo */}
                <div style={{overflowY:'auto', flex:1, paddingRight:'5px'}}>
                    
                    {/* --- ABA DADOS --- */}
                    {activeTab === 'dados' ? (
                        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                            
                            <label style={{color: "#000"}}>Nome:</label>
                            <input value={formData.nome} onChange={e=>setFormData({...formData, nome:e.target.value})} style={inputStyle} />
                            
                            <div style={{display:'flex', gap:'10px'}}>
                                <div style={{flex:1}}>
                                    <label style={{color: "#000"}}>Preço Diária:</label>
                                    <input type="number" value={formData.preco_diaria} onChange={e=>setFormData({...formData, preco_diaria:e.target.value})} style={inputStyle} />
                                </div>
                                <div style={{flex:1}}>
                                    <label style={{color: "#000"}}>Categoria:</label>
                                    <select 
                                        value={formData.id_categoria} 
                                        onChange={e=>setFormData({...formData, id_categoria:e.target.value})} 
                                        style={inputStyle}
                                    >
                                        <option value="">Selecione...</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            <label style={{color: "#000"}}>Descrição:</label>
                            <textarea value={formData.descricao} rows={3} onChange={e=>setFormData({...formData, descricao:e.target.value})} style={inputStyle} />

                            {/* Gerenciador de Fotos */}
                            <div style={{background:'#f8f9fa', padding:'10px', borderRadius:'6px', border:'1px solid #eee', marginTop:'10px'}}>
                                <label style={{fontWeight:'bold', color: "#000"}}>Galeria de Fotos:</label>
                                
                                <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                                    {imageList.map((img, index) => (
                                        <div key={img.id} style={{display:'flex', alignItems:'center', background:'white', padding:'5px', borderRadius:'4px', border:'1px solid #ddd'}}>
                                            <span style={{marginRight:'10px', fontWeight:'bold', color: index===0 ? '#28a745' : '#ccc', minWidth:'50px'}}>
                                                {index === 0 ? '★ Capa' : `#${index+1}`}
                                            </span>
                                            
                                            <img src={img.preview} style={{width:'50px', height:'50px', objectFit:'cover', borderRadius:'4px', marginRight:'10px', border:'1px solid #eee'}} />
                                            
                                            <div style={{flex:1, fontSize:'0.85rem', overflow:'hidden', color: "#000", textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                                {img.type === 'url' ? 'Imagem Salva' : 'Novo Arquivo'}
                                            </div>

                                            <div style={{display:'flex', gap:'5px'}}>
                                                {index > 0 && (
                                                    <button onClick={() => handleMakePrincipal(index)} title="Tornar Principal" style={smallBtnStyle}>⬆️</button>
                                                )}
                                                <button onClick={() => handleRemoveImage(img.id)} title="Remover" style={{...smallBtnStyle, color:'#dc3545', borderColor:'#dc3545'}}>✕</button>
                                            </div>
                                        </div>
                                    ))}
                                    {imageList.length === 0 && <p style={{textAlign:'center', color:'#999', fontSize:'0.9rem'}}>Nenhuma foto.</p>}
                                </div>

                                <div style={{marginTop:'10px'}}>
                                    <label htmlFor="file-upload" style={{cursor:'pointer', color:'#007bff', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:'5px', fontWeight:'bold'}}>
                                        <span style={{fontSize:'1.2rem'}}>+</span> Adicionar fotos
                                    </label>
                                    <input id="file-upload" type="file" multiple onChange={handleFileAdd} style={{display:'none'}} />
                                </div>
                            </div>

                            <button onClick={handleSubmit} style={saveBtnStyle}>Salvar Equipamento</button>
                        </div>
                    ) : (
                        /* --- ABA AVARIAS --- */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {tiposAvaria.map((avaria, idx) => (
                                <div key={avaria.id} style={{ display: 'flex', gap: '5px', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                                    <input name="descricao" value={avaria.descricao} onChange={e => handleAvariaChange(idx, e)} disabled={avaria.is_default} style={{ ...inputStyle, flex: 2 }} />
                                    <input name="preco" type="number" value={avaria.preco} onChange={e => handleAvariaChange(idx, e)} style={{ ...inputStyle, flex: 1 }} />
                                    <button onClick={() => handleUpdateAvaria(idx)} style={actionBtnStyle} title="Salvar alteração">💾</button>
                                    {!avaria.is_default && <button onClick={() => handleDeleteAvaria(avaria.id)} style={{ ...actionBtnStyle, background: '#dc3545', color: 'white' }} title="Excluir">🗑️</button>}
                                </div>
                            ))}

                            <div style={{ marginTop: '15px', background: '#f0f2f5', padding: '10px', borderRadius: '5px' }}>
                                <strong style={{color: "#000"}}>Adicionar Nova Avaria:</strong>
                                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                    <input placeholder="Descrição (ex: Risco)" value={newAvaria.descricao} onChange={e => setNewAvaria({ ...newAvaria, descricao: e.target.value })} style={{ ...inputStyle, flex: 2 }} />
                                    <input placeholder="Preço (R$)" type="number" value={newAvaria.preco} onChange={e => setNewAvaria({ ...newAvaria, preco: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                                    <button onClick={handleAddAvaria} style={{ ...saveBtnStyle, width: 'auto', marginTop: 0 }}>Add</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalStyle: React.CSSProperties = { backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '500px', maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' };
const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' };
const closeBtnStyle: React.CSSProperties = { background: 'none', color: "#000", border: 'none', fontSize: '1.5rem', cursor: 'pointer' };
const tabStyle: React.CSSProperties = { flex: 1, padding: '10px', cursor: 'pointer', background: 'none', border: 'none', fontSize: '1rem' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' };
const saveBtnStyle: React.CSSProperties = { width: '100%', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', marginTop: '10px', cursor: 'pointer', fontWeight: 'bold' };
const actionBtnStyle: React.CSSProperties = { padding: '8px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer', background: 'white' };
const smallBtnStyle: React.CSSProperties = { background: 'white', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px', fontSize: '0.8rem' };

export default EditEquipmentModal;