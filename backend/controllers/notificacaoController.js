const { Notificacao } = require('../models');

const notificacaoController = {
  // Lista as notificações do usuário logado
  listarMinhasNotificacoes: async (req, res) => {
    try {
      const notificacoes = await Notificacao.findAll({
        where: { usuario_id: req.user.id },
        order: [['createdAt', 'DESC']],
        limit: 50 // Traz as últimas 50 pra não travar o celular do cliente
      });
      res.status(200).json(notificacoes);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      res.status(500).json({ error: 'Erro interno ao buscar notificações.' });
    }
  },

  // Marca uma notificação específica como lida
  marcarComoLida: async (req, res) => {
    try {
      const { id } = req.params;
      await Notificacao.update(
        { lida: true },
        { where: { id, usuario_id: req.user.id } }
      );
      res.status(200).json({ message: 'Notificação lida.' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar notificação.' });
    }
  },

  // Marca TODAS as notificações do usuário como lidas
  marcarTodasComoLidas: async (req, res) => {
    try {
      await Notificacao.update(
        { lida: true },
        { where: { usuario_id: req.user.id, lida: false } }
      );
      res.status(200).json({ message: 'Todas as notificações foram lidas.' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao limpar notificações.' });
    }
  },
  
  deletarNotificacao: async (req, res) => {
    try {
      const { id } = req.params;
      await Notificacao.destroy({ 
        where: { id, usuario_id: req.user.id } 
      });
      res.status(200).json({ message: 'Notificação apagada.' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao apagar notificação.' });
    }
  }
};



module.exports = notificacaoController;