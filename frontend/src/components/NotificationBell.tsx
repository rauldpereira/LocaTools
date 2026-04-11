import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';

interface Notificacao {
  id: number;
  titulo: string;
  mensagem: string;
  lida: boolean;
  link_redirecionamento?: string;
  createdAt: string;
}

const NotificationBell: React.FC = () => {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'nao_lidas' | 'lidas'>('nao_lidas');

  const { user, token } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Busca do banco e conecta no Socket
  useEffect(() => {
    if (!user || !token) return;

    const carregarNotificacoes = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/notificacoes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotificacoes(data);
      } catch (error) {
        console.error("Erro ao buscar notificações", error);
      }
    };

    carregarNotificacoes();

    socketRef.current = io(import.meta.env.VITE_API_URL, {
      query: { userId: user.id }
    });

    socketRef.current.on('chegou_notificacao', (novaNotificacao: Notificacao) => {
      setNotificacoes((prev) => [novaNotificacao, ...prev]);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user, token]);

  // Filtros das Abas
  const naoLidas = notificacoes.filter((n) => !n.lida);
  const lidas = notificacoes.filter((n) => n.lida);
  const notificacoesExibidas = abaAtiva === 'nao_lidas' ? naoLidas : lidas;
  const unreadCount = naoLidas.length;

  const marcarComoLida = async (id: number, link?: string) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/notificacoes/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
      );
      
      if (link) {
        setIsOpen(false);
        navigate(link);
      }
    } catch (error) {
      console.error("Erro ao marcar como lida", error);
    }
  };

  const marcarTodasComoLidas = async () => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/notificacoes/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    } catch (error) {
      console.error("Erro ao limpar notificações", error);
    }
  };

  // Função para apagar a notificação
  const deletarNotificacao = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/notificacoes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotificacoes((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Erro ao deletar notificação", error);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* ÍCONE DO SINO */}
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ cursor: 'pointer', position: 'relative', padding: '5px' }}
      >
        <span style={{ fontSize: '1.5rem' }}>🔔</span>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            backgroundColor: '#dc3545', color: 'white',
            borderRadius: '50%', padding: '2px 6px',
            fontSize: '0.75rem', fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}>
            {unreadCount}
          </span>
        )}
      </div>

      {/* DROPDOWN DAS MENSAGENS */}
      {isOpen && (
        <div style={{
          position: 'absolute', top: '40px', right: '-10px',
          width: '350px', backgroundColor: '#fff', borderRadius: '8px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.15)', zIndex: 1000,
          border: '1px solid #eee', maxHeight: '500px',
          display: 'flex', flexDirection: 'column'
        }}>
          
          <div style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, color: '#333' }}>Notificações</h4>
            {unreadCount > 0 && abaAtiva === 'nao_lidas' && (
              <button 
                onClick={marcarTodasComoLidas}
                style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* MENUS DAS ABAS */}
          <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
            <button
              onClick={() => setAbaAtiva('nao_lidas')}
              style={{
                flex: 1, padding: '10px', border: 'none', background: 'none',
                fontWeight: abaAtiva === 'nao_lidas' ? 'bold' : 'normal',
                color: abaAtiva === 'nao_lidas' ? '#007bff' : '#666',
                borderBottom: abaAtiva === 'nao_lidas' ? '2px solid #007bff' : '2px solid transparent',
                cursor: 'pointer'
              }}
            >
              Não Lidas ({unreadCount})
            </button>
            <button
              onClick={() => setAbaAtiva('lidas')}
              style={{
                flex: 1, padding: '10px', border: 'none', background: 'none',
                fontWeight: abaAtiva === 'lidas' ? 'bold' : 'normal',
                color: abaAtiva === 'lidas' ? '#007bff' : '#666',
                borderBottom: abaAtiva === 'lidas' ? '2px solid #007bff' : '2px solid transparent',
                cursor: 'pointer'
              }}
            >
              Lidas ({lidas.length})
            </button>
          </div>

          {/* LISTA DE NOTIFICAÇÕES */}
          <div style={{ overflowY: 'auto', flex: 1, backgroundColor: '#fdfdfd' }}>
            {notificacoesExibidas.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: '#888' }}>
                {abaAtiva === 'nao_lidas' ? 'Nenhuma notificação nova! 🎉' : 'Sua lixeira está limpa.'}
              </div>
            ) : (
              notificacoesExibidas.map((notif) => (
                <div 
                  key={notif.id} 
                  onClick={() => !notif.lida && marcarComoLida(notif.id, notif.link_redirecionamento)}
                  style={{
                    padding: '12px 15px',
                    borderBottom: '1px solid #eee',
                    backgroundColor: notif.lida ? '#fff' : '#e6f7ff',
                    cursor: notif.lida ? 'default' : 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s'
                  }}
                >
                  {/* BOTÃO DE FECHAR (X) */}
                  <button
                    onClick={(e) => deletarNotificacao(e, notif.id)}
                    title="Excluir notificação"
                    style={{
                      position: 'absolute', top: '10px', right: '10px',
                      background: 'none', border: 'none', color: '#aaa',
                      cursor: 'pointer', fontSize: '1.2rem', lineHeight: '1'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.color = '#dc3545')}
                    onMouseOut={(e) => (e.currentTarget.style.color = '#aaa')}
                  >
                    &times;
                  </button>

                  <strong style={{ display: 'block', color: '#333', fontSize: '0.9rem', marginBottom: '3px', paddingRight: '20px' }}>
                    {notif.titulo}
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#666', paddingRight: '20px' }}>
                    {notif.mensagem}
                  </p>
                  <small style={{ color: '#aaa', fontSize: '0.7rem', marginTop: '5px', display: 'block' }}>
                    {new Date(notif.createdAt).toLocaleDateString()} às {new Date(notif.createdAt).toLocaleTimeString()}
                  </small>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;