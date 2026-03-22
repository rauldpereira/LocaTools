const { Notificacao, Usuario } = require('../models');
const { Op } = require('sequelize');

const notificacaoHelper = {
  // Dispara aviso para um cliente específico
  notificarUsuario: async (usuario_id, titulo, mensagem, link_redirecionamento = null) => {
    try {
      await Notificacao.create({ usuario_id, titulo, mensagem, link_redirecionamento });
    } catch (error) {
      console.error('🚨 Erro ao notificar usuário:', error);
    }
  },


  // Dispara aviso APENAS para admins e funcionários da logística/balcão
  notificarOperacao: async (titulo, mensagem, link_redirecionamento = null) => {
    try {
      // Busca toda a tropa (Admins e Funcionários)
      const equipe = await Usuario.findAll({ 
        where: { 
          tipo_usuario: { [Op.in]: ['admin', 'funcionario'] } 
        } 
      });
      
      // Filtra quem realmente pode receber a fofoca
      const promessas = equipe.map(membro => {
        let temAcesso = false;

        if (membro.tipo_usuario === 'admin') {
          temAcesso = true;
        } else if (membro.permissoes) {
          // Transforma as permissões em texto pra buscar de forma segura
          const permsStr = typeof membro.permissoes === 'string' ? membro.permissoes : JSON.stringify(membro.permissoes);
          
          if (permsStr.includes('gerenciar_reservas') || permsStr.includes('fazer_vistoria')) {
            temAcesso = true;
          }
        }

        // Se o cara passou no teste, cria a notificação pra ele
        if (temAcesso) {
          return Notificacao.create({ usuario_id: membro.id, titulo, mensagem, link_redirecionamento });
        }
        
        return null;
      }).filter(p => p !== null);
      
      // Dispara tudo de uma vez
      await Promise.all(promessas);
    } catch (error) {
      console.error('🚨 Erro ao notificar operação:', error);
    }
  },
  // Dispara aviso APENAS para quem tem a permissão exata (e para o Admin)
  notificarPorPermissao: async (permissaoNecessaria, titulo, mensagem, link_redirecionamento = null) => {
    try {
      const equipe = await Usuario.findAll({ 
        where: { tipo_usuario: { [Op.in]: ['admin', 'funcionario'] } } 
      });
      
      const promessas = equipe.map(membro => {
        let temAcesso = false;

        if (membro.tipo_usuario === 'admin') {
          temAcesso = true; // Admin recebe tudo
        } else if (membro.permissoes) {
          const permsStr = typeof membro.permissoes === 'string' ? membro.permissoes : JSON.stringify(membro.permissoes);
          
          // Verifica se o funcionário tem a permissão específica que o aviso exige
          if (permsStr.includes(permissaoNecessaria)) {
            temAcesso = true; 
          }
        }

        if (temAcesso) {
          return Notificacao.create({ usuario_id: membro.id, titulo, mensagem, link_redirecionamento });
        }
        
        return null;
      }).filter(p => p !== null);
      
      await Promise.all(promessas);
    } catch (error) {
      console.error(`🚨 Erro ao notificar a permissão [${permissaoNecessaria}]:`, error);
    }
  }
};

module.exports = notificacaoHelper;