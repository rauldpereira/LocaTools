const { Op } = require('sequelize');
const { Reserva, Equipamento, Usuario } = require('../models');
const PDFDocument = require('pdfkit');
const fs = require('fs');

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

const updateReservationStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    if (req.user.tipo_usuario !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem atualizar o status de reservas.' });
    }

    const reservation = await Reserva.findByPk(id);

    if (!reservation) {
      return res.status(404).json({ error: 'Reserva não encontrada.' });
    }

    await reservation.update({ status });

    res.status(200).json({ message: 'Status da reserva atualizado com sucesso.', reservation });

  } catch (error) {
    console.error('Erro ao atualizar reserva:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

const deleteReservation = async (req, res) => {
  const { id } = req.params;
  const id_usuario = req.user.id;
  const tipo_usuario = req.user.tipo_usuario;

  try {
    const reservation = await Reserva.findByPk(id);

    if (!reservation) {
      return res.status(404).json({ error: 'Reserva não encontrada.' });
    }

    if (reservation.id_usuario !== id_usuario && tipo_usuario !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Você só pode deletar suas próprias reservas.' });
    }

    await reservation.destroy();

    res.status(200).json({ message: 'Reserva deletada com sucesso.' });

  } catch (error) {
    console.error('Erro ao deletar reserva:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

const generateContract = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const tipoUsuario = req.user.tipo_usuario;

  try {
    const reservation = await Reserva.findByPk(id, {
      include: [{
        model: Equipamento,
        as: 'Equipamento',
      }, {
        model: Usuario,
        as: 'Usuario',
      }]
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reserva não encontrada.' });
    }

    if (reservation.id_usuario !== userId && tipoUsuario !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para visualizar este contrato.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=contrato_reserva_${id}.pdf`);

    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(25).text('Contrato de Aluguel de Equipamento', { align: 'center' });
    doc.moveDown();

    doc.fontSize(16).text(`Reserva ID: ${reservation.id}`);
    doc.moveDown();

    doc.fontSize(14).text('Detalhes do Cliente:');
    doc.fontSize(12).text(`Nome: ${reservation.Usuario.nome}`);
    doc.fontSize(12).text(`Email: ${reservation.Usuario.email}`);
    doc.moveDown();

    doc.fontSize(14).text('Detalhes do Equipamento:');
    doc.fontSize(12).text(`Nome: ${reservation.Equipamento.nome}`);
    doc.fontSize(12).text(`Descrição: ${reservation.Equipamento.descricao}`);
    doc.fontSize(12).text(`Preço Diário: R$ ${reservation.Equipamento.preco_diaria}`);
    doc.moveDown();

    doc.fontSize(14).text('Período de Aluguel:');
    doc.fontSize(12).text(`Início: ${reservation.data_inicio.toISOString().split('T')[0]}`);
    doc.fontSize(12).text(`Fim: ${reservation.data_fim.toISOString().split('T')[0]}`);
    doc.moveDown();

    doc.end();

  } catch (error) {
    console.error('Erro ao gerar contrato:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

module.exports = {
  createReservation,
  getMyReservations,
  getAllReservations,
  updateReservationStatus,
  deleteReservation,
  generateContract,
};