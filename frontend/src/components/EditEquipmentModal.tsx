import { useToast } from '../context/ToastContext';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; 
import { 
  X, 
  Save, 
  Loader2, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  AlertTriangle, 
  FileText, 
  ChevronUp, 
  CheckCircle,
  Package,
  CircleDollarSign,
  Tag,
  Star,
  Info
} from 'lucide-react';

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
  const toast = useToast();
    const { token } = useAuth();
    
    const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, actionId: number | null, msg: string}>({isOpen: false, actionId: null, msg: ""});
    const [activeTab, setActiveTab] = useState<'dados' | 'avarias'>('dados');
    const [categories, setCategories] = useState<Category[]>([]);
    const [formData, setFormData] = useState({
        nome: '',
        descricao: '',
        preco_diaria: '',
        preco_semanal: '',
        preco_quinzenal: '',
        preco_mensal: '',
        id_categoria: '',
    });

    const [imageList, setImageList] = useState<ImageItem[]>([]);
    const [tiposAvaria, setTiposAvaria] = useState<TipoAvaria[]>([]);
    const [newAvaria, setNewAvaria] = useState({ descricao: '', preco: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const fetchData = useCallback(async () => {
        if (!equipmentId || !isOpen) return;

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // Busca Categorias para o Select
            const resCat = await axios.get(`${import.meta.env.VITE_API_URL}/api/categories`, config);
            setCategories(resCat.data);

            // Busca Dados do Equipamento
            const resEquip = await axios.get(`${import.meta.env.VITE_API_URL}/api/equipment/${equipmentId}`);
            const data = resEquip.data;

            setFormData({
                nome: data.nome,
                descricao: data.descricao,
                preco_diaria: String(data.preco_diaria),
                preco_semanal: data.preco_semanal ? String(data.preco_semanal) : '',
                preco_quinzenal: data.preco_quinzenal ? String(data.preco_quinzenal) : '',
                preco_mensal: data.preco_mensal ? String(data.preco_mensal) : '',
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
                        preview: `${import.meta.env.VITE_API_URL}${url}`
                    }));
                } catch {
                    const url = data.url_imagem;
                    loadedImages = [{
                        id: 'old-0',
                        type: 'url',
                        content: url,
                        preview: url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url}`
                    }];
                }
            }
            setImageList(loadedImages);

            // Busca Avarias
            const resAvaria = await axios.get(`${import.meta.env.VITE_API_URL}/api/tipos-avaria/${equipmentId}`, config);
            setTiposAvaria(resAvaria.data.map((a: any) => ({ ...a, preco: String(a.preco) })));

        } catch (error) {
            console.error("Erro ao carregar modal:", error);
        }
    }, [equipmentId, isOpen, token]);

    useEffect(() => {
        if (isOpen) {
            fetchData();
            setActiveTab('dados');
            setSuccessMsg('');
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

    const parseBrValue = (val: string) => {
        if (!val) return "";
        let clean = val.replace(/\s/g, ''); 
        if (clean.includes(',')) {
            return clean.replace(/\./g, '').replace(',', '.');
        }
        if (clean.includes('.')) {
            const parts = clean.split('.');
            const lastPart = parts[parts.length - 1];
            if (parts.length > 2) return clean.replace(/\./g, ''); 
            if (lastPart.length === 3) return clean.replace(/\./g, ''); 
            return clean; 
        }
        return clean;
    };

    const handleMakePrincipal = (index: number) => {
        if (index === 0) return;
        const newList = [...imageList];
        const item = newList.splice(index, 1)[0]; 
        newList.unshift(item); 
        setImageList(newList);
    };


    // --- SUBMIT EQUIPAMENTO ---
    const handleSubmit = async () => {
        setIsSubmitting(true);
        setSuccessMsg('');
        try {
            const config = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } };
            const formDataEnvio = new FormData();

            formDataEnvio.append('nome', formData.nome);
            formDataEnvio.append('descricao', formData.descricao);
            formDataEnvio.append('preco_diaria', parseBrValue(formData.preco_diaria));
            formDataEnvio.append('preco_semanal', parseBrValue(formData.preco_semanal));
            formDataEnvio.append('preco_quinzenal', parseBrValue(formData.preco_quinzenal));
            formDataEnvio.append('preco_mensal', parseBrValue(formData.preco_mensal));
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

            await axios.put(`${import.meta.env.VITE_API_URL}/api/equipment/${equipmentId}`, formDataEnvio, config);
            
            setSuccessMsg('Equipamento atualizado com sucesso!');
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2000);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar equipamento.');
        } finally {
            setIsSubmitting(false);
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
            await axios.put(`${import.meta.env.VITE_API_URL}/api/tipos-avaria/${avariaToUpdate.id}`, payload, config);
            setSuccessMsg('Avaria atualizada!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (error) { toast.error('Erro ao atualizar avaria.'); }
    };

    const handleAddAvaria = async () => {
        if (!newAvaria.descricao || !newAvaria.preco) return;
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const payload = { ...newAvaria, preco: parseFloat(newAvaria.preco), id_equipamento: equipmentId };
            await axios.post(`${import.meta.env.VITE_API_URL}/api/tipos-avaria`, payload, config);
            setNewAvaria({ descricao: '', preco: '' });
            setSuccessMsg('Nova avaria adicionada!');
            setTimeout(() => setSuccessMsg(''), 3000);
            fetchData();
        } catch (error) { toast.error('Erro ao adicionar avaria.'); }
    };

    const handleDeleteAvaria = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            actionId: id,
            msg: "Apagar esta avaria?"
        });
    };

    const confirmDeleteAvaria = async () => {
        const { actionId } = confirmModal;
        setConfirmModal({ isOpen: false, actionId: null, msg: "" });
        if (!actionId) return;

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/tipos-avaria/${actionId}`, config);
            fetchData();
        } catch (error) { toast.error('Erro ao apagar avaria.'); }
    };


    if (!isOpen) return null;

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div style={headerStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ backgroundColor: "#eff6ff", padding: "10px", borderRadius: "10px" }}>
                            <Package size={24} color="#2563eb" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.25rem", fontWeight: 800 }}>Editar Equipamento</h2>
                            <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600" }}>Referência: #{equipmentId}</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={closeBtnStyle}><X size={24} /></button>
                </div>

                {/* Abas */}
                <div style={{ display: 'flex', gap: "10px", padding: "0 25px", marginBottom: "20px" }}>
                    <button 
                        onClick={() => setActiveTab('dados')} 
                        style={{ ...tabStyle, borderBottom: activeTab === 'dados' ? "3px solid #2563eb" : "3px solid transparent", color: activeTab === 'dados' ? "#2563eb" : "#64748b", fontWeight: activeTab === 'dados' ? "800" : "600" }}
                    >
                        <FileText size={18} /> Dados & Fotos
                    </button>
                    <button 
                        onClick={() => setActiveTab('avarias')} 
                        style={{ ...tabStyle, borderBottom: activeTab === 'avarias' ? "3px solid #2563eb" : "3px solid transparent", color: activeTab === 'avarias' ? "#2563eb" : "#64748b", fontWeight: activeTab === 'avarias' ? "800" : "600" }}
                    >
                        <AlertTriangle size={18} /> Avarias & Preços
                    </button>
                </div>

                {/* Mensagem de Sucesso */}
                {successMsg && (
                    <div style={{ margin: "0 25px 20px 25px", padding: "12px 16px", backgroundColor: "#ecfdf5", border: "1px solid #10b981", borderRadius: "10px", color: "#047857", fontWeight: "700", display: "flex", alignItems: "center", gap: "10px", animation: "fadeIn 0.3s ease" }}>
                        <CheckCircle size={18} /> {successMsg}
                    </div>
                )}

                {confirmModal.isOpen && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3100, animation: 'fadeIn 0.2s ease' }} onClick={() => setConfirmModal({isOpen: false, actionId: null, msg: ""})}>
                        <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '80%', maxWidth: '350px', padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b' }}>
                                <AlertTriangle size={24} color="#ef4444" />
                                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Confirmação</h3>
                            </div>
                            <p style={{ margin: 0, color: '#475569', fontSize: '1rem', lineHeight: '1.5' }}>
                                {confirmModal.msg}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <button onClick={() => setConfirmModal({isOpen: false, actionId: null, msg: ""})} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                                    Cancelar
                                </button>
                                <button onClick={confirmDeleteAvaria} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#ef4444', color: '#fff', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Conteúdo */}
                <div style={{ overflowY: 'auto', flex: 1, padding: "0 25px 25px 25px" }}>
                    
                    {activeTab === 'dados' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            <div style={fieldGroupStyle}>
                                <label style={labelStyle}><Tag size={14} /> Nome do Produto</label>
                                <input value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} style={inputStyle} placeholder="Ex: Betoneira 400L" />
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div style={fieldGroupStyle}>
                                    <label style={labelStyle}><CircleDollarSign size={14} /> Diária (R$)</label>
                                    <input type="text" value={formData.preco_diaria} onChange={e => setFormData({ ...formData, preco_diaria: e.target.value })} style={inputStyle} />
                                </div>
                                <div style={fieldGroupStyle}>
                                    <label style={labelStyle}><CircleDollarSign size={14} /> Semanal (R$)</label>
                                    <input type="text" value={formData.preco_semanal} onChange={e => setFormData({ ...formData, preco_semanal: e.target.value })} style={inputStyle} />
                                </div>
                                <div style={fieldGroupStyle}>
                                    <label style={labelStyle}><CircleDollarSign size={14} /> Quinzenal (R$)</label>
                                    <input type="text" value={formData.preco_quinzenal} onChange={e => setFormData({ ...formData, preco_quinzenal: e.target.value })} style={inputStyle} />
                                </div>
                                <div style={fieldGroupStyle}>
                                    <label style={labelStyle}><CircleDollarSign size={14} /> Mensal (R$)</label>
                                    <input type="text" value={formData.preco_mensal} onChange={e => setFormData({ ...formData, preco_mensal: e.target.value })} style={inputStyle} />
                                </div>
                            </div>

                            <div style={fieldGroupStyle}>
                                <label style={labelStyle}>Categoria</label>
                                <select 
                                    value={formData.id_categoria} 
                                    onChange={e => setFormData({ ...formData, id_categoria: e.target.value })} 
                                    style={inputStyle}
                                >
                                    <option value="">Selecione uma categoria...</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.nome}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div style={fieldGroupStyle}>
                                <label style={labelStyle}>Descrição Detalhada</label>
                                <textarea value={formData.descricao} rows={6} onChange={e => setFormData({ ...formData, descricao: e.target.value })} style={{ ...inputStyle, resize: "none" }} placeholder="Detalhes técnicos, marca, voltagem..." />
                            </div>

                            {/* Gerenciador de Fotos */}
                            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <label style={{ ...labelStyle, marginBottom: "15px" }}><ImageIcon size={14} /> Galeria de Fotos</label>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {imageList.map((img, index) => (
                                        <div key={img.id} style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '8px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                                            <div style={{ width: '40px', display: "flex", justifyContent: "center" }}>
                                                {index === 0 ? <Star size={18} color="#f59e0b" fill="#f59e0b" /> : <span style={{ color: "#cbd5e1", fontWeight: "bold" }}>{index + 1}</span>}
                                            </div>
                                            
                                            <img src={img.preview} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', marginRight: '15px', border: '1px solid #f1f5f9' }} alt="Preview" />
                                            
                                            <div style={{ flex: 1, fontSize: '0.8rem', fontWeight: "600", color: "#475569" }}>
                                                {img.type === 'url' ? 'Imagem do Servidor' : 'Novo Upload'}
                                            </div>

                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {index > 0 && (
                                                    <button onClick={() => handleMakePrincipal(index)} title="Tornar Principal" style={actionIconBtnStyle}><ChevronUp size={16} /></button>
                                                )}
                                                <button onClick={() => handleRemoveImage(img.id)} title="Remover" style={{ ...actionIconBtnStyle, color: '#ef4444', borderColor: '#fee2e2' }}><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    <label htmlFor="file-upload" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "15px", border: "2px dashed #cbd5e1", borderRadius: "10px", color: "#2563eb", fontWeight: "bold", cursor: "pointer", transition: "0.2s", backgroundColor: "#fff" }} onMouseOver={e => e.currentTarget.style.backgroundColor = "#eff6ff" } onMouseOut={e => e.currentTarget.style.backgroundColor = "#fff"}>
                                        <Plus size={20} /> Adicionar Fotos
                                        <input id="file-upload" type="file" multiple onChange={handleFileAdd} style={{ display: 'none' }} />
                                    </label>
                                </div>
                            </div>

                            <button onClick={handleSubmit} disabled={isSubmitting} style={saveBtnStyle}>
                                {isSubmitting ? <Loader2 size={20} className="spin-animation" /> : <Save size={20} />}
                                {isSubmitting ? 'Salvando Alterações...' : 'Atualizar Equipamento'}
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ padding: "15px", backgroundColor: "#fffbeb", border: "1px solid #fef3c7", borderRadius: "10px", color: "#92400e", fontSize: "0.85rem", display: "flex", gap: "10px" }}>
                                <Info size={20} />
                                <span>Defina os valores que serão cobrados caso o equipamento retorne com danos específicos.</span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {tiposAvaria.map((avaria, idx) => (
                                    <div key={avaria.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: "#fff", padding: "10px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                                        <div style={{ flex: 2 }}>
                                            <input name="descricao" value={avaria.descricao} onChange={e => handleAvariaChange(idx, e)} disabled={avaria.is_default} style={{ ...inputStyle, backgroundColor: avaria.is_default ? "#f8fafc" : "#fff" }} />
                                        </div>
                                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "5px" }}>
                                            <span style={{ color: "#94a3b8", fontWeight: "bold" }}>R$</span>
                                            <input name="preco" type="number" value={avaria.preco} onChange={e => handleAvariaChange(idx, e)} style={inputStyle} />
                                        </div>
                                        <button onClick={() => handleUpdateAvaria(idx)} style={actionIconBtnStyle} title="Salvar"><Save size={16} /></button>
                                        {!avaria.is_default && (
                                            <button onClick={() => handleDeleteAvaria(avaria.id)} style={{ ...actionIconBtnStyle, color: "#ef4444" }} title="Excluir"><Trash2 size={16} /></button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: '10px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <strong style={{ color: "#1e293b", display: "block", marginBottom: "15px", fontSize: "0.9rem" }}>Nova Avaria Personalizada</strong>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input placeholder="Ex: Quebra de Manivela" value={newAvaria.descricao} onChange={e => setNewAvaria({ ...newAvaria, descricao: e.target.value })} style={{ ...inputStyle, flex: 2 }} />
                                    <input placeholder="Preço" type="number" value={newAvaria.preco} onChange={e => setNewAvaria({ ...newAvaria, preco: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                                    <button onClick={handleAddAvaria} style={{ ...saveBtnStyle, width: 'auto', marginTop: 0, padding: "0 20px" }}><Plus size={20} /></button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .spin-animation { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

// --- ESTILOS ---
const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, animation: "fadeIn 0.2s ease" };
const modalStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: '16px', width: '600px', maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: "hidden" };
const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: "25px", borderBottom: "1px solid #f1f5f9" };
const closeBtnStyle: React.CSSProperties = { background: '#f1f5f9', color: "#64748b", border: 'none', borderRadius: "50%", padding: "8px", cursor: 'pointer', display: "flex", alignItems: "center", transition: "0.2s" };
const tabStyle: React.CSSProperties = { flex: 1, padding: '12px', cursor: 'pointer', background: 'none', border: 'none', fontSize: '0.95rem', display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "0.2s" };
const fieldGroupStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "8px" };
const labelStyle: React.CSSProperties = { fontSize: "0.75rem", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px" };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: "none", fontSize: "0.95rem", color: "#334155", transition: "0.2s" };
const saveBtnStyle: React.CSSProperties = { width: '100%', padding: '14px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', marginTop: '10px', cursor: 'pointer', fontWeight: '800', fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)", transition: "0.2s" };
const actionIconBtnStyle: React.CSSProperties = { padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', background: 'white', color: "#64748b", display: "flex", alignItems: "center", transition: "0.2s" };

export default EditEquipmentModal;