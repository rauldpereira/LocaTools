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

  const order = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
  const sortedHorarios = [...horarios].sort((a, b) => order.indexOf(a.dia_semana) - order.indexOf(b.dia_semana));

  const grouped = [];
  let currentGroup = { startDay: '', endDay: '', hours: '' };

  const formatHours = (h: Horario) => h.fechado ? 'Fechado' : `${h.horario_abertura?.slice(0, 5)} às ${h.horario_fechamento?.slice(0, 5)}`;
  
  // Função auxiliar para deixar o nome do dia bonito
  const formatDayName = (key: string) => {
    const map: Record<string, string> = {
      'segunda': 'Seg', 'terca': 'Ter', 'quarta': 'Qua', 'quinta': 'Qui', 
      'sexta': 'Sex', 'sabado': 'Sáb', 'domingo': 'Dom'
    };
    return map[key] || key;
  };

  for (const horario of sortedHorarios) {
    const hours = formatHours(horario);
    const dayLabel = formatDayName(horario.dia_semana);
    
    // Se for o primeiro loop
    if (!currentGroup.startDay) {
        currentGroup = { startDay: dayLabel, endDay: '', hours: hours };
        continue;
    }

    // Se o horário for igual ao do dia anterior, agrupa
    if (hours === currentGroup.hours) {
      currentGroup.endDay = dayLabel; 
    } else {
      // Se mudou o horário, salva o grupo anterior e começa um novo
      grouped.push(currentGroup);
      currentGroup = { startDay: dayLabel, endDay: '', hours: hours };
    }
  }
  grouped.push(currentGroup); // Empurra o último

  // Formata a string final (Ex: "Seg - Sex: 08:00 às 18:00")
  return grouped.map(g => {
    const dias = g.endDay ? `${g.startDay} a ${g.endDay}` : g.startDay;
    return { dias, horas: g.hours };
  });
};

const HorarioFuncionamentoDisplay: React.FC = () => {
  const [linhas, setLinhas] = useState<{dias: string, horas: string}[]>([]);

  useEffect(() => {
    axios.get('http://localhost:3001/api/horarios')
      .then(res => {
        if (res.data.length > 0) {
          setLinhas(groupHorarios(res.data));
        }
      })
      .catch(err => console.error("Erro ao buscar horários", err));
  }, []);

  if (linhas.length === 0) return null;

  return (
    <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #eee', marginTop: '20px' }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '1rem' }}>Horários de Retirada e Devolução</h4>
      <div style={{ fontSize: '0.9rem', color: '#555' }}>
        {linhas.map((linha, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', borderBottom: '1px dotted #ccc', paddingBottom: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>{linha.dias}:</span>
            <span>{linha.horas}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HorarioFuncionamentoDisplay;