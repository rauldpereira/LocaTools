import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './GerenciamentoCalendario.css';
import ModalEditarDia from './ModalEditarDia';
import { useAuth } from '../../context/AuthContext'; 

interface IDiaStatus {
  data: string;
  status: 'ABERTO' | 'FECHADO';
  fonte: 'padrao' | 'excecao';
  descricao: string | null;
  tipo?: 'feriado' | 'parada' | 'extra' | 'outro';
}

interface IMesPublicado {
  ano: number;
  mes: number;
}

const toISODate = (date: Date): string => date.toISOString().split('T')[0];

const GerenciamentoCalendario: React.FC = () => {
  const { isLoadingAuth, isLoggedIn } = useAuth();
  
  const [activeStartDate, setActiveStartDate] = useState(new Date());
  const [statusDias, setStatusDias] = useState<Map<string, IDiaStatus>>(new Map());

  const [isMonthPublished, setIsMonthPublished] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState<IDiaStatus | null>(null);

  const forcarRecarga = () => {
    setActiveStartDate(new Date(activeStartDate.getTime()));
  };

  useEffect(() => {
    if (isLoadingAuth) {
      return; 
    }
    if (!isLoggedIn) {
      console.warn("GerenciamentoCalendario: Usuário não logado. Abortando fetch.");
      return;
    }

    const fetchDadosMensais = async () => {
      setIsLoading(true);
      setError(null);

      const mes = activeStartDate.getMonth() + 1;
      const ano = activeStartDate.getFullYear();

      try {
        const { data: dataDias } = await axios.get<IDiaStatus[]>('http://localhost:3001/api/calendario/status-mensal', {
          params: { ano, mes }
        });
        const diasMap = new Map(dataDias.map(dia => [dia.data, dia]));
        setStatusDias(diasMap);

        const { data: mesesPublicados } = await axios.get<IMesPublicado[]>(
          'http://localhost:3001/api/calendario/meses-publicados'
        );
        
        const publicado = mesesPublicados.some(
          m => m.ano === ano && m.mes === mes
        );
        setIsMonthPublished(publicado);

      } catch (err) {
        console.error("Erro ao buscar dados mensais:", err);
        setError("Não foi possível carregar os dados do calendário.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDadosMensais();
  }, [activeStartDate, isLoadingAuth, isLoggedIn]); 

  const handleTogglePublishMonth = async () => {
    const ano = activeStartDate.getFullYear();
    const mes = activeStartDate.getMonth() + 1;
    const novoStatus = !isMonthPublished; 

    setIsLoading(true); 
    try {
      await axios.post('http://localhost:3001/api/calendario/publicar-mes', {
        ano: ano,
        mes: mes,
        publicado: novoStatus
      });

      setIsMonthPublished(novoStatus);
      
      alert(`Mês ${mes}/${ano} foi ${novoStatus ? 'Publicado' : 'Despublicado'} com sucesso.`);

    } catch (err) {
      console.error("Erro ao publicar mês:", err);
      alert("Falha ao atualizar o status do mês.");
    } finally {
      setIsLoading(false); 
    }
  };


  const getTileClassName = ({ date, view }: { date: Date, view: string }): string | null => {
    if (view !== 'month') return null;

    const dataString = toISODate(date);
    const diaStatus = statusDias.get(dataString);

    if (!diaStatus) return 'dia-normal';

    if (diaStatus.fonte === 'excecao') {
      return diaStatus.status === 'FECHADO'
        ? 'dia-excecao-fechado'
        : 'dia-excecao-aberto';
    }
    
    return diaStatus.status === 'FECHADO'
      ? 'dia-padrao-fechado'
      : 'dia-excecao-aberto'; 
  };

  const handleImportarFeriados = async () => {
    const ano = activeStartDate.getFullYear();
    if (!window.confirm(`Deseja importar/atualizar os feriados nacionais de ${ano}?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await axios.post('http://localhost:3001/api/calendario/importar-feriados', { ano });
      alert(data.message || "Feriados importados!");
      
      forcarRecarga();

    } catch (err) {
      console.error("Erro ao importar feriados:", err);
      alert("Falha ao importar feriados.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiaClick = (date: Date) => {
    const dataString = toISODate(date);
    const diaStatus = statusDias.get(dataString);

    if (diaStatus) {
      setDiaSelecionado(diaStatus);
      setModalAberto(true);
    } else {
      console.warn("Dados do dia não encontrados no mapa.", dataString);
      alert("Erro: Não foi possível carregar os dados deste dia. Tente recarregar.");
    }
  };

  const dataSelecionada = diaSelecionado ? new Date(diaSelecionado.data) : undefined;

  return (
    <div className="admin-calendario-container">
      <h2>Gerenciamento de Funcionamento</h2>
      <p>Configure os dias de funcionamento, feriados e paradas.</p>

      <div className="calendario-legenda">
        <span className="legenda-item"><div className="cor dia-excecao-aberto"></div> Aberto</span>
        <span className="legenda-item"><div className="cor dia-padrao-fechado"></div> Fechado (Padrão)</span>
        <span className="legenda-item"><div className="cor dia-excecao-fechado"></div> Fechado (Feriado/Parada)</span>
      </div>

      {isLoading && <p>Carregando calendário...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <Calendar
        locale="pt-BR"
        value={dataSelecionada}
        activeStartDate={activeStartDate}
        onActiveStartDateChange={({ activeStartDate }) => setActiveStartDate(activeStartDate || new Date())}
        tileClassName={getTileClassName}
        onClickDay={handleDiaClick}
      />
      
      <div className="calendario-acoes">
        <button
          onClick={handleImportarFeriados}
          disabled={isLoading}
          className="btn-importar-feriados"
        >
          {isLoading ? 'Aguarde...' : `Importar Feriados de ${activeStartDate.getFullYear()}`}
        </button>


        <button
          onClick={handleTogglePublishMonth}
          disabled={isLoading}
          className={`btn-publicar-mes ${isMonthPublished ? 'publicado' : 'nao-publicado'}`}
        >
          {isLoading ? 'Aguarde...' : (
            isMonthPublished 
              ? 'Despublicar Mês' 
              : 'Publicar Mês para Agendamento'
          )}
        </button>
      </div>


      {modalAberto && diaSelecionado && (
        <ModalEditarDia
          diaInfo={diaSelecionado}
          onClose={() => setModalAberto(false)}
          onSave={() => {
            forcarRecarga();
            setModalAberto(false);
          }}
        />
      )}
    </div>
  );
};

export default GerenciamentoCalendario;