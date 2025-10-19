import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface HorarioData {
    horario_abertura: string;
    horario_fechamento: string;
    fechado: boolean;
}

const diasDaSemana = [
    { key: 'segunda', label: 'Segunda' },
    { key: 'terca', label: 'Terça' },
    { key: 'quarta', label: 'Quarta' },
    { key: 'quinta', label: 'Quinta' },
    { key: 'sexta', label: 'Sexta' },
    { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' },
];

const HorariosForm: React.FC = () => {
    const [horarios, setHorarios] = useState<{ [key: string]: HorarioData }>({});
    const { token } = useAuth();

    useEffect(() => {
        axios.get('http://localhost:3001/api/horarios').then(res => {
            if (res.data.length > 0) {
                const fetchedHorarios = res.data.reduce((acc: any, h: any) => {
                    acc[h.dia_semana] = h;
                    return acc;
                }, {});
                setHorarios(fetchedHorarios);
            }
        });
    }, []);

    const handleChange = (dia: string, campo: keyof HorarioData, valor: any) => {
        setHorarios(prev => ({
            ...prev,
            [dia]: { ...prev[dia], [campo]: valor }
        }));
    };

    const handleSubmit = async () => {
        const payload = diasDaSemana.map(dia => ({
            dia_semana: dia.key,
            horario_abertura: horarios[dia.key]?.fechado ? null : horarios[dia.key]?.horario_abertura || '00:00:00',
            horario_fechamento: horarios[dia.key]?.fechado ? null : horarios[dia.key]?.horario_fechamento || '00:00:00',
            fechado: horarios[dia.key]?.fechado || false,
        }));

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.put('http://localhost:3001/api/horarios', payload, config);
            alert('Horários atualizados com sucesso!');
        } catch (error) {
            alert('Falha ao atualizar horários.');
        }
    };

    return (
        <div style={{flex: 1, minWidth: '400px'}}>
            <h3>Horário de Funcionamento</h3>
            {diasDaSemana.map(({ key, label }) => {
                const data = horarios[key] || { horario_abertura: '00:00:00', horario_fechamento: '00:00:00', fechado: true };
                return (
                    <div key={key} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <strong style={{ width: '80px' }}>{label}:</strong>
                        <input type="time" value={data.horario_abertura?.slice(0,5) || ''} disabled={data.fechado} onChange={e => handleChange(key, 'horario_abertura', e.target.value)} />
                        <span>às</span>
                        <input type="time" value={data.horario_fechamento?.slice(0,5) || ''} disabled={data.fechado} onChange={e => handleChange(key, 'horario_fechamento', e.target.value)} />
                        <label><input type="checkbox" checked={data.fechado} onChange={e => handleChange(key, 'fechado', e.target.checked)} /> Fechado</label>
                    </div>
                )
            })}
            <button onClick={handleSubmit} style={{marginTop: '1rem'}}>Salvar Horários</button>
        </div>
    );
};

export default HorariosForm;