import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface HorarioConfig {
  dia_semana: string;
  horario_abertura: string;
  horario_fechamento: string;
  fechado: boolean;
}

const DIAS_ORDENADOS = [
  { key: 'segunda', label: 'Segunda-feira' },
  { key: 'terca', label: 'Terça-feira' },
  { key: 'quarta', label: 'Quarta-feira' },
  { key: 'quinta', label: 'Quinta-feira' },
  { key: 'sexta', label: 'Sexta-feira' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' }
];

const AdminHorariosPage: React.FC = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [horarios, setHorarios] = useState<HorarioConfig[]>([]);

  useEffect(() => {
    fetchHorarios();
  }, []);

  const fetchHorarios = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/horarios');
      const dataBanco = response.data;

      const estruturaCompleta = DIAS_ORDENADOS.map(dia => {
        const existente = dataBanco.find((h: any) => h.dia_semana === dia.key);
        return {
          dia_semana: dia.key,
          horario_abertura: existente?.horario_abertura || '08:00',
          horario_fechamento: existente?.horario_fechamento || '18:00',
          fechado: existente ? existente.fechado : false
        };
      });

      setHorarios(estruturaCompleta);
    } catch (error) {
      console.error('Erro ao buscar horários', error);
    }
  };

  const handleChange = (index: number, field: keyof HorarioConfig, value: any) => {
    const novosHorarios = [...horarios];
    novosHorarios[index] = { ...novosHorarios[index], [field]: value };
    setHorarios(novosHorarios);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      await axios.post('http://localhost:3001/api/horarios', { horarios }, config);
      
      alert('Horários atualizados com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar horários.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
      <h3 style={{ marginBottom: '20px', color: '#333' }}>Configurar Horários de Funcionamento</h3>
      
      <div style={{ padding: '15px', backgroundColor: '#eef2f7', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9rem', color: '#555' }}>
        ℹ️ Defina os horários padrão. Dias marcados como "Fechado" não permitirão retirada ou devolução no calendário.
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left' }}>
            <th style={thStyle}>Dia da Semana</th>
            <th style={thStyle}>Abertura</th>
            <th style={thStyle}>Fechamento</th>
            <th style={thStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
          {horarios.map((item, index) => {
            const labelDia = DIAS_ORDENADOS.find(d => d.key === item.dia_semana)?.label;
            
            return (
              <tr key={item.dia_semana} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ ...tdStyle, fontWeight: 'bold' }}>{labelDia}</td>
                
                <td style={tdStyle}>
                  <input 
                    type="time" 
                    value={item.horario_abertura} 
                    disabled={item.fechado}
                    onChange={(e) => handleChange(index, 'horario_abertura', e.target.value)}
                    style={inputStyle}
                  />
                </td>
                
                <td style={tdStyle}>
                  <input 
                    type="time" 
                    value={item.horario_fechamento} 
                    disabled={item.fechado}
                    onChange={(e) => handleChange(index, 'horario_fechamento', e.target.value)}
                    style={inputStyle}
                  />
                </td>
                
                <td style={tdStyle}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                    <input 
                      type="checkbox" 
                      checked={item.fechado} 
                      onChange={(e) => handleChange(index, 'fechado', e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ color: item.fechado ? '#dc3545' : '#28a745', fontWeight: 'bold' }}>
                      {item.fechado ? 'Fechado' : 'Aberto'}
                    </span>
                  </label>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: '20px', textAlign: 'right' }}>
        <button 
          onClick={handleSave} 
          disabled={loading}
          style={{
            backgroundColor: '#28a745',
            color: '#fff',
            padding: '12px 25px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
};

const thStyle: React.CSSProperties = { padding: '12px', color: '#555', borderBottom: '2px solid #eee' };
const tdStyle: React.CSSProperties = { padding: '12px', verticalAlign: 'middle' };
const inputStyle: React.CSSProperties = { padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '100px' };

export default AdminHorariosPage;