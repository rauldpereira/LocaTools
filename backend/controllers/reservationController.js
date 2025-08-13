const { Op } = require('sequelize');
const { Reserva, Equipamento, Usuario } = require('../models');

const createReservation = async (req, res) => {
  const { id_equipamento, data_inicio, data_fim } = req.body;
  const id_usuario = req.user.id;

  try {
    if (!id_equipamento || !data_inicio || !data_fim) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    const overlappingReservations = await Reserva.findAll({
      where: {
        id_equipamento,
        [Op.or]: [
          {
            data_inicio: {
              [Op.between]: [data_inicio, data_fim],
            },
          },
          {
            data_fim: {
              [Op.between]: [data_inicio, data_fim],
            },
          },
          {
            data_inicio: {
              [Op.lte]: data_inicio,
            },
            data_fim: {
              [Op.gte]: data_fim,
            },
          },
        ],
      },
    });

    if (overlappingReservations.length > 0) {
      return res.status(409).json({ error: 'Equipamento não disponível para o período selecionado.' });
    }

    const newReservation = await Reserva.create({
      id_usuario,
      id_equipamento,
      data_inicio,
      data_fim,
      status: 'pendente',
    });

    res.status(201).json(newReservation);

  } catch (error) {
    console.error('Erro ao criar reserva:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

const getMyReservations = async (req, res) => {
  try {
    const reservations = await Reserva.findAll({
      where: { id_usuario: req.user.id },
      include: [{
        model: Equipamento,
        as: 'Equipamento',
        attributes: ['id', 'nome', 'preco_diaria', 'url_imagem']
      }],
      order: [['data_inicio', 'DESC']]
    });
    res.status(200).json(reservations);
  } catch (error) {
    console.error('Erro ao buscar minhas reservas:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

const getAllReservations = async (req, res) => {
  try {
    if (req.user.tipo_usuario !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem ver todas as reservas.' });
    }

    const reservations = await Reserva.findAll({
      include: [{
        model: Equipamento,
        as: 'Equipamento',
        attributes: ['id', 'nome', 'preco_diaria', 'url_imagem']
      }, {
        model: Usuario,
        as: 'Usuario',
        attributes: ['id', 'nome', 'email']
      }],
      order: [['data_inicio', 'DESC']]
    });
    res.status(200).json(reservations);
  } catch (error) {
    console.error('Erro ao buscar todas as reservas:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

module.exports = {
  createReservation,
  getMyReservations,
  getAllReservations
};