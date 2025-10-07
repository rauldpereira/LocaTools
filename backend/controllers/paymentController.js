const Stripe = require('stripe');
const { OrdemDeServico, Pagamento } = require('../models');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const processPayment = async (req, res) => {
    const { orderId, token } = req.body;
    const userId = req.user.id;
    try {
        const order = await OrdemDeServico.findByPk(orderId);

        if (!order) {
            return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
        }
        if (order.id_usuario !== userId) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        if (order.status !== 'pendente') {
            return res.status(400).json({ error: 'Esta ordem de serviço já foi paga ou está cancelada.' });
        }

        const valorACobrar = order.valor_sinal;

        const charge = await stripe.charges.create({
            amount: Math.round(valorACobrar * 100),
            currency: 'brl',
            source: token,
            description: `Sinal de 50% - Ordem de Serviço #${order.id}`
        });

        if (charge.status === 'succeeded') {
            await order.update({ status: 'aprovada' });

            await Pagamento.create({
                id_ordem_servico: order.id,
                valor: valorACobrar,
                status_pagamento: 'aprovado',
                id_transacao_externa: charge.id
            });

            res.status(200).json({ message: 'Pagamento processado com sucesso!' });
        } else {
            res.status(400).json({ error: 'O pagamento falhou.' });
        }
    } catch (error) {
        console.error('Erro ao processar pagamento:', error);
        res.status(500).json({ error: 'Erro no servidor ao processar pagamento.', details: error.message });
    }
};

module.exports = { 
    processPayment
};