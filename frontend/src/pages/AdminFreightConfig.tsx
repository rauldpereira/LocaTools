import React, { useState, useEffect } from 'react';
import { freightService, type FreightConfig } from '../../services/freightService';
import axios from 'axios';

// O endereço fake que criado na model para evitar erro de campo obrigatório. Se o admin quiser usar esse endereço, ele pode deixar os campos em branco que o sistema vai entender que é esse endereço padrão.
const ENDERECO_PADRAO = 'Av. Nossa Senhora do Bom Sucesso, 1000, Pindamonhangaba - SP';

const AdminFreightConfig: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [isCustomAddress, setIsCustomAddress] = useState(false);

    const [config, setConfig] = useState<FreightConfig>({
        preco_km: 0,
        taxa_fixa: 0,
        endereco_origem: '',
        raio_maximo_km: 50
    });

    const [address, setAddress] = useState({
        cep: '',
        rua: '',
        numero: '',
        bairro: '',
        cidade: '',
        uf: ''
    });

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const data = await freightService.getConfig();

            setConfig({
                ...data,
                preco_km: Number(data.preco_km),
                taxa_fixa: Number(data.taxa_fixa),
                raio_maximo_km: Number(data.raio_maximo_km)
            });

            // Verifica se o endereço é diferente do padrão
            if (data.endereco_origem && data.endereco_origem !== ENDERECO_PADRAO) {
                setIsCustomAddress(true);
                tentaPreencherCampos(data.endereco_origem);
            } else {
                // Se for o padrão, deixa tudo em branco pro cara preencher
                setIsCustomAddress(false);
            }

        } catch (error) {
            console.error('Erro ao carregar config:', error);
            setMessage({ type: 'error', text: 'Erro ao carregar configurações.' });
        } finally {
            setLoading(false);
        }
    };

    const tentaPreencherCampos = (enderecoCompleto: string) => {
        try {
            if (!enderecoCompleto) return;

            const partes = enderecoCompleto.split(',').map(p => p.trim());

            const rua = partes[0] || '';
            const numero = partes[1] || '';
            const bairro = partes[2] || '';

            // Acha CIDADE e UF procurando pelo traço " - "
            let cidade = '';
            let uf = '';

            // Procura na lista qual parte tem um traço no meio (Ex: "Pindamonhangaba - SP")
            const parteCidadeUf = partes.find(p => p.includes(' - '));

            if (parteCidadeUf) {
                const divisao = parteCidadeUf.split(' - ');
                cidade = divisao[0].trim();
                uf = divisao[1].trim(); // O trim() garante que não pega espaço em branco
            }

            //Acha o CEP
            let cep = '';
            const ultimaParte = partes[partes.length - 1];
            // ve se tem 8 números
            const numerosCep = ultimaParte.replace(/\D/g, '');

            if (numerosCep.length === 8) {
                // Formata
                cep = numerosCep.replace(/^(\d{5})(\d{3})/, "$1-$2");
            }

            // Atualiza o estado
            setAddress({
                rua,
                numero,
                bairro,
                cidade,
                uf,
                cep
            });

        } catch (error) {
            console.error('Erro ao preencher campos do endereço:', error);
         }
    };

    const buscarCepNoApi = async (cepParaBuscar: string) => {
        setMessage({ type: 'success', text: '🔍 Buscando CEP...' });

        try {
            const response = await axios.get(`https://viacep.com.br/ws/${cepParaBuscar}/json/`);

            if (response.data.erro) {
                setMessage({ type: 'error', text: 'CEP não encontrado!' });
                return;
            }

            setAddress(prev => ({
                ...prev,
                rua: response.data.logradouro,
                bairro: response.data.bairro,
                cidade: response.data.localidade,
                uf: response.data.uf,
                cep: cepParaBuscar
            }));

            document.getElementById('campo-numero')?.focus();
            setMessage(null);
        } catch (error) {
            console.error('Erro ViaCEP:', error);
            setMessage({ type: 'error', text: 'Erro ao buscar CEP.' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        if (config.preco_km <= 0) {
            alert('O preço por KM deve ser maior que zero!');
            setSaving(false);
            return;
        }

        // Monta o endereço completo
        let enderecoFinal = config.endereco_origem;

        if (address.rua && address.numero) {
            // Rua, Numero, Bairro, Cidade - UF, CEP
            enderecoFinal = `${address.rua}, ${address.numero}, ${address.bairro}, ${address.cidade} - ${address.uf}`;
            if (address.cep) enderecoFinal += `, ${address.cep}`;
        }

        if (!enderecoFinal) {
            alert('Por favor, preencha o endereço da loja!');
            setSaving(false);
            return;
        }

        try {
            await freightService.updateConfig({
                ...config,
                endereco_origem: enderecoFinal
            });

            setMessage({ type: 'success', text: '✅ Configurações salvas com sucesso!' });
            setTimeout(() => setMessage(null), 3000);

            setConfig(prev => ({ ...prev, endereco_origem: enderecoFinal }));
            setIsCustomAddress(true);
        } catch (error) {
            console.error('Erro ao salvar:', error);
            setMessage({ type: 'error', text: 'Erro ao salvar configurações.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: '20px' }}>Carregando...</div>;

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '20px', color: '#2c3e50', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                Configuração de Frete e Logística
            </h2>

            {message && (
                <div style={{
                    padding: '15px',
                    marginBottom: '20px',
                    borderRadius: '8px',
                    backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
                    color: message.type === 'success' ? '#155724' : '#721c24',
                    border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
                }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

                {/* SEÇÃO 1: ENDEREÇO DA LOJA */}
                <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#007bff', fontSize: '1.1rem' }}>Endereço de Saída</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '15px', marginBottom: '15px' }}>
                        <div style={formGroupStyle}>
                            <label style={labelStyle}>CEP</label>
                            <input
                                type="text"
                                maxLength={9}
                                value={address.cep}
                                onChange={(e) => setAddress({ ...address, cep: e.target.value })}
                                onBlur={(e) => {
                                    const limpo = e.target.value.replace(/\D/g, '');
                                    if (limpo.length === 8) buscarCepNoApi(limpo);
                                }}
                                style={inputStyle}
                                placeholder="00000-000"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '15px', marginBottom: '15px' }}>
                        <div style={formGroupStyle}>
                            <label style={labelStyle}>Rua / Logradouro</label>
                            <input
                                type="text"
                                value={address.rua}
                                onChange={(e) => setAddress({ ...address, rua: e.target.value })}
                                style={{ ...inputStyle, backgroundColor: address.rua ? '#e9ecef' : '#fff' }}
                            />
                        </div>
                        <div style={formGroupStyle}>
                            <label style={labelStyle}>Número</label>
                            <input
                                id="campo-numero"
                                type="text"
                                required={!!address.rua}
                                value={address.numero}
                                onChange={(e) => setAddress({ ...address, numero: e.target.value })}
                                style={inputStyle}
                                placeholder="Ex: 1000"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '15px' }}>
                        <div style={formGroupStyle}>
                            <label style={labelStyle}>Bairro</label>
                            <input
                                type="text"
                                value={address.bairro}
                                onChange={(e) => setAddress({ ...address, bairro: e.target.value })}
                                style={{ ...inputStyle, backgroundColor: address.bairro ? '#e9ecef' : '#fff' }}
                            />
                        </div>
                        <div style={formGroupStyle}>
                            <label style={labelStyle}>Cidade</label>
                            <input
                                type="text"
                                value={address.cidade}
                                onChange={(e) => setAddress({ ...address, cidade: e.target.value })}
                                style={{ ...inputStyle, backgroundColor: address.cidade ? '#e9ecef' : '#fff' }}
                            />
                        </div>
                        <div style={formGroupStyle}>
                            <label style={labelStyle}>UF</label>
                            <input
                                type="text"
                                maxLength={2}
                                value={address.uf}
                                onChange={(e) => setAddress({ ...address, uf: e.target.value })}
                                style={{ ...inputStyle, backgroundColor: address.uf ? '#e9ecef' : '#fff' }}
                            />
                        </div>
                    </div>

                    {/* SÓ MOSTRA O AVISO SE FOR ENDEREÇO CUSTOMIZADO */}
                    {isCustomAddress && (
                        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px', fontSize: '0.85rem', color: '#856404' }}>
                            <strong>Endereço Atual Salvo:</strong> {config.endereco_origem}
                        </div>
                    )}

                </div>

                {/* SEÇÃO 2: PREÇOS E REGRAS */}
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#28a745', fontSize: '1.1rem' }}>💲 Tabela de Preços</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                        <div style={formGroupStyle}>
                            <label style={labelStyle}>Preço por KM (R$)</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '10px', top: '10px', color: '#888' }}>R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.10"
                                    required
                                    value={config.preco_km}
                                    onChange={(e) => setConfig({ ...config, preco_km: parseFloat(e.target.value) })}
                                    style={{ ...inputStyle, paddingLeft: '35px', fontWeight: 'bold', color: '#333' }}
                                />
                            </div>
                        </div>

                        <div style={formGroupStyle}>
                            <label style={labelStyle}>Taxa Fixa (Saída)</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '10px', top: '10px', color: '#888' }}>R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={config.taxa_fixa}
                                    onChange={(e) => setConfig({ ...config, taxa_fixa: parseFloat(e.target.value) })}
                                    style={{ ...inputStyle, paddingLeft: '35px' }}
                                />
                            </div>
                        </div>

                        <div style={formGroupStyle}>
                            <label style={labelStyle}>Raio Máximo (KM)</label>
                            <input
                                type="number"
                                min="1"
                                value={config.raio_maximo_km}
                                onChange={(e) => setConfig({ ...config, raio_maximo_km: parseInt(e.target.value) })}
                                style={inputStyle}
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    style={{
                        padding: '15px 30px',
                        backgroundColor: saving ? '#ccc' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        alignSelf: 'flex-end',
                        marginTop: '10px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                >
                    {saving ? 'Salvando...' : 'Salvar'}
                </button>
            </form>
        </div>
    );
};

const formGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const labelStyle: React.CSSProperties = { marginBottom: '8px', fontWeight: '600', color: '#555', fontSize: '0.9rem' };
const inputStyle: React.CSSProperties = { padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem', width: '100%', boxSizing: 'border-box' };

export default AdminFreightConfig;