import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Horario {
    dia_semana: string;
    horario_abertura: string | null;
    horario_fechamento: string | null;
    fechado: boolean;
}

const groupHorarios = (horarios: Horario[]) => {
    if (horarios.length === 0) return [];

    const grouped = [];
    let currentGroup = { startDay: '', endDay: '', hours: '' };

    const formatHours = (h: Horario) => h.fechado ? 'Fechado' : `${h.horario_abertura?.slice(0, 5)} - ${h.horario_fechamento?.slice(0, 5)}`;
    
    const order = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
    const sortedHorarios = [...horarios].sort((a, b) => order.indexOf(a.dia_semana) - order.indexOf(b.dia_semana));

    for (const horario of sortedHorarios) {
        const hours = formatHours(horario);
        const dayLabel = horario.dia_semana.substring(0, 3).toUpperCase();
        
        if (hours === currentGroup.hours) {
            currentGroup.endDay = dayLabel; 
        } else {
            if (currentGroup.startDay) { 
                grouped.push(currentGroup);
            }

            currentGroup = { startDay: dayLabel, endDay: '', hours: hours };
        }
    }
    grouped.push(currentGroup); 

    return grouped.map(g => 
        g.endDay ? `${g.startDay}-${g.endDay}: ${g.hours}` : `${g.startDay}: ${g.hours}`
    );
};


const HorarioFuncionamento: React.FC = () => {
    const [groupedHorarios, setGroupedHorarios] = useState<string[]>([]);

    useEffect(() => {
        axios.get('http://localhost:3001/api/horarios')
            .then(res => {
                if (res.data.length > 0) {
                    setGroupedHorarios(groupHorarios(res.data));
                }
            })
            .catch(err => console.error("Erro ao buscar horários", err));
    }, []);

    if (groupedHorarios.length === 0) return null;

    return (
        <div style={{ marginTop: '1rem', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
            <h4>Horário para Retirada/Devolução</h4>
            <div style={{ fontSize: '0.9em' }}>
                {groupedHorarios.map((line, index) => (
                    <p key={index} style={{ margin: '2px 0' }}>{line}</p>
                ))}
            </div>
        </div>
    );
};

export default HorarioFuncionamento;