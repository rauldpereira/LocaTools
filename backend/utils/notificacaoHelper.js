const { Notificacao, Usuario } = require('../models');
const { Op } = require('sequelize');

const notificacaoHelper = {
  // Dispara aviso para um cliente específico
  notificarUsuario: async (usuario_id, titulo, mensagem, link_redirecionamento = null) => {
    try {
      const novaNotif = await Notificacao.create({ usuario_id, titulo, mensagem, link_redirecionamento });
      
      // Dispara pro Socket se o usuário estiver online
      const socketId = global.usuariosOnline.get(String(usuario_id));
      if (socketId && global.io) {
        global.io.to(socketId).emit('chegou_notificacao', novaNotif);
      }

    } catch (error) {
      console.error('🚨 Erro ao notificar usuário:', error);
    }
  },

  // Dispara aviso APENAS para admins e funcionários com permissão
  notificarOperacao: async (titulo, mensagem, link_redirecionamento = null) => {
    try {
      const equipe = await Usuario.findAll({ 
        where: { 
          tipo_usuario: { [Op.in]: ['admin', 'funcionario'] } 
        } 
      });
      
      const promessas = equipe.map(membro => {
        let temAcesso = false;

        if (membro.tipo_usuario === 'admin') {
          temAcesso = true;
        } else if (membro.permissoes) {
          const permsStr = typeof membro.permissoes === 'string' ? membro.permissoes : JSON.stringify(membro.permissoes);
          if (permsStr.includes('gerenciar_reservas') || permsStr.includes('fazer_vistoria')) {
            temAcesso = true;
          }
        }

        if (temAcesso) {
          return Notificacao.create({ usuario_id: membro.id, titulo, mensagem, link_redirecionamento })
            .then(novaNotif => {
              // Dispara pro Socket do funcionário online
              const socketId = global.usuariosOnline.get(String(membro.id));
              if (socketId && global.io) {
                global.io.to(socketId).emit('chegou_notificacao', novaNotif);
              }
              return novaNotif;
            });
        }
        
        return null;
      }).filter(p => p !== null);
      
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
          temAcesso = true; 
        } else if (membro.permissoes) {
          const permsStr = typeof membro.permissoes === 'string' ? membro.permissoes : JSON.stringify(membro.permissoes);
          if (permsStr.includes(permissaoNecessaria)) {
            temAcesso = true; 
          }
        }

        if (temAcesso) {
          return Notificacao.create({ usuario_id: membro.id, titulo, mensagem, link_redirecionamento })
            .then(novaNotif => {
              // Dispara pro Socket do funcionário online
              const socketId = global.usuariosOnline.get(String(membro.id));
              if (socketId && global.io) {
                global.io.to(socketId).emit('chegou_notificacao', novaNotif);
              }
              return novaNotif;
            });
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