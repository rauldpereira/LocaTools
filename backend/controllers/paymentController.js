const Stripe = require('stripe');
const { Reserva, Equipamento, Pagamento } = require('../models');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const processPayment = async (req, res) => {
    const { reservationId, token } = req.body;
    const userId = req.user.id;

    try {
        const reservation = await Reserva.findByPk(reservationId, {
            include: [{
                model: Equipamento,
                as: 'Equipamento'
            }]
        });

        if (!reservation) {
            return res.status(404).json({ error: 'Reserva não encontrada.' });
        }

        if (reservation.id_usuario !== userId) {
            return res.status(403).json({ error: 'Acesso negado. Você não é o dono desta reserva.' });
        }

        if (reservation.status === 'aprovada') {
            return res.status(400).json({ error: 'Esta reserva já foi paga.' });
        }

        const dataInicio = new Date(reservation.data_inicio);
        const dataFim = new Date(reservation.data_fim);
        const diasAlugados = (dataFim - dataInicio) / (1000 * 60 * 60 * 24) + 1;
        const valorTotal = diasAlugados * reservation.Equipamento.preco_diaria;

        const charge = await stripe.charges.create({
            amount: Math.round(valorTotal * 100),
            currency: 'brl',
            source: token,
            description: `Aluguel de ${reservation.Equipamento.nome} - Reserva #${reservation.id}`
        });

        if (charge.status === 'succeeded') {
            await reservation.update({ status: 'aprovada' });

            await Pagamento.create({
                id_reserva: reservation.id,
                valor: valorTotal,
                status_pagamento: 'aprovado',
                id_transacao_externa: charge.id
            });

            res.status(200).json({ message: 'Pagamento processado com sucesso!', charge });
        } else {
            res.status(400).json({ error: 'O pagamento falhou.' });
        }

    } catch (error) {
        console.error('Erro ao processar pagamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

module.exports = {
    processPayment,
};