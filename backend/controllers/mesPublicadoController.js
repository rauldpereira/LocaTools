const { MesPublicado } = require('../models');

const mesPublicadoController = {

  publicarMes: async (req, res) => {
    const { ano, mes, publicado } = req.body;

    if (!ano || !mes || typeof publicado !== 'boolean') {
      return res.status(400).json({ 
        message: 'Ano, mês e status (publicado) são obrigatórios.' 
      });
    }

    try {
      const [registro, criado] = await MesPublicado.upsert({
        ano: parseInt(ano, 10),
        mes: parseInt(mes, 10),
        publicado: publicado
      }, {
        
      });

      return res.status(200).json({ 
        message: `Mês ${mes}/${ano} foi ${publicado ? 'publicado' : 'despublicado'} com sucesso.`,
        data: registro 
      });

    } catch (error) {
      console.error('Erro ao publicar mês:', error);
      return res.status(500).json({ message: 'Erro no servidor ao tentar publicar o mês.' });
    }
  },


  getMesesPublicados: async (req, res) => {
    try {
      const meses = await MesPublicado.findAll({
        where: {
          publicado: true 
        },
        attributes: ['ano', 'mes'],
        order: [
          ['ano', 'ASC'],
          ['mes', 'ASC'] 
        ]
      });

      return res.status(200).json(meses);

    } catch (error) {
      console.error('Erro ao buscar meses publicados:', error);
      return res.status(500).json({ message: 'Erro no servidor ao buscar meses.' });
    }
  }

};

module.exports = mesPublicadoController;