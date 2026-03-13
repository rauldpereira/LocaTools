import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Notificacao {
  id: number;
  titulo: string;
  mensagem: string;
  lida: boolean;
  link_redirecionamento: string | null;
  createdAt: string;
}

const NotificationBell: React.FC = () => {
  const { token, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  // Mostra só as novas por padrão
  const [viewMode, setViewMode] = useState<'unread' | 'all'>('unread'); 
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notificacoes.filter(n => !n.lida).length;
  
  // Filtra o que vai aparecer na tela baseado na aba selecionada
  const displayedNotificacoes = viewMode === 'unread' 
    ? notificacoes.filter(n => !n.lida) 
    : notificacoes;

  useEffect(() => {
    if (isLoggedIn && token) {
      fetchNotificacoes();
      const interval = setInterval(fetchNotificacoes, 15000); 
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, token]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotificacoes = async () => {
    try {
      const { data } = await axios.get('http://localhost:3001/api/notificacoes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotificacoes(data);
    } catch (error) {
      console.error("Erro ao buscar notificações", error);
    }
  };

  const markAsReadAndNavigate = async (notificacao: Notificacao) => {
    setIsOpen(false);
    
    if (!notificacao.lida) {
      try {
        await axios.put(`http://localhost:3001/api/notificacoes/${notificacao.id}/read`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Atualiza o estado na hora (o que faz ela sumir da aba "Não Lidas" instantaneamente)
        setNotificacoes(prev => prev.map(n => n.id === notificacao.id ? { ...n, lida: true } : n));
      } catch (e) {
        console.error("Erro ao marcar lida", e);
      }
    }

    if (notificacao.link_redirecionamento) {
      navigate(notificacao.link_redirecionamento);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`http://localhost:3001/api/notificacoes/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    } catch (e) {
      console.error("Erro ao ler todas", e);
    }
  };

  const deleteNotification = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); 
    try {
      await axios.delete(`http://localhost:3001/api/notificacoes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotificacoes(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error("Erro ao deletar notificação", error);
    }
  };

  if (!isLoggedIn) return null;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative', fontSize: '1.5rem', padding: '5px' }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0, backgroundColor: '#dc3545', color: 'white',
            borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 'bold', border: '2px solid white'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '45px', right: '-10px', width: '340px', backgroundColor: 'white',
          borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 9999, overflow: 'hidden', border: '1px solid #eee'
        }}>
          {/* CABEÇALHO */}
          <div style={{ padding: '12px 15px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#333' }}>Notificações</strong>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
                Marcar todas lidas
              </button>
            )}
          </div>

          {/* AS ABAS */}
          <div style={{ display: 'flex', borderBottom: '1px solid #eee', backgroundColor: '#fff' }}>
            <button 
              onClick={() => setViewMode('unread')}
              style={{ 
                flex: 1, padding: '8px 0', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem',
                fontWeight: viewMode === 'unread' ? 'bold' : 'normal',
                color: viewMode === 'unread' ? '#007bff' : '#666',
                borderBottom: viewMode === 'unread' ? '2px solid #007bff' : '2px solid transparent'
              }}
            >
              Novas ({unreadCount})
            </button>
            <button 
              onClick={() => setViewMode('all')}
              style={{ 
                flex: 1, padding: '8px 0', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem',
                fontWeight: viewMode === 'all' ? 'bold' : 'normal',
                color: viewMode === 'all' ? '#007bff' : '#666',
                borderBottom: viewMode === 'all' ? '2px solid #007bff' : '2px solid transparent'
              }}
            >
              Todas
            </button>
          </div>

          {/* LISTA DE NOTIFICAÇÕES */}
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {displayedNotificacoes.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '0.9rem' }}>
                {viewMode === 'unread' ? 'Você não tem novas notificações.' : 'Nenhuma notificação encontrada.'}
              </div>
            ) : (
              displayedNotificacoes.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => markAsReadAndNavigate(n)}
                  style={{
                    padding: '12px 15px', borderBottom: '1px solid #f1f1f1', cursor: 'pointer', transition: 'background 0.2s',
                    backgroundColor: n.lida ? 'white' : '#f0f8ff',
                    display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = n.lida ? 'white' : '#f0f8ff'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <strong style={{ color: '#333', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px', paddingRight: '20px' }}>
                      {!n.lida && <span style={{ width: '8px', height: '8px', backgroundColor: '#007bff', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }}></span>}
                      {n.titulo}
                    </strong>
                    
                    <button 
                      onClick={(e) => deleteNotification(e, n.id)}
                      style={{ 
                        background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', 
                        fontSize: '1.2rem', padding: '0 5px', lineHeight: '1', marginTop: '-2px' 
                      }}
                      title="Apagar notificação"
                      onMouseEnter={(e) => e.currentTarget.style.color = '#dc3545'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#aaa'}
                    >
                      &times;
                    </button>
                  </div>

                  <span style={{ color: '#666', fontSize: '0.85rem', lineHeight: '1.3' }}>{n.mensagem}</span>
                  <span style={{ color: '#aaa', fontSize: '0.75rem', marginTop: '4px' }}>
                    {new Date(n.createdAt).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
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