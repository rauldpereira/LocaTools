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

  // Dispara aviso para TODOS os admins
  notificarEquipe: async (titulo, mensagem, link_redirecionamento = null) => {
    try {
      // Busca todo mundo que tem crachá da empresa
      const equipe = await Usuario.findAll({ 
        where: { 
          tipo_usuario: { [Op.in]: ['admin', 'funcionario'] } 
        } 
      });
      
      const promessas = equipe.map(membro => 
        Notificacao.create({ usuario_id: membro.id, titulo, mensagem, link_redirecionamento })
      );
      
      await Promise.all(promessas);
    } catch (error) {
      console.error('🚨 Erro ao notificar equipe:', error);
    }
  }
};

module.exports = notificacaoHelper;