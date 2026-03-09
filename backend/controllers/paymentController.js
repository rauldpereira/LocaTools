const Stripe = require('stripe');
const { OrdemDeServico, Pagamento } = require('../models');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const processPayment = async (req, res) => {
    const { orderIds, token, cpfCnpj } = req.body; 
    const userId = req.user.id;

    try {
        const { Op } = require('sequelize');

        // Busca TODAS as ordens de uma vez
        const orders = await OrdemDeServico.findAll({
            where: { id: { [Op.in]: orderIds } }
        });

        if (!orders || orders.length === 0) {
            return res.status(404).json({ error: 'Ordens de serviço não encontradas.' });
        }

        let valorTotalACobrar = 0;

        // Validações e soma dos valores de todas as OS
        for (const order of orders) {
            if (order.id_usuario !== userId) {
                return res.status(403).json({ error: 'Acesso negado a um dos pedidos.' });
            }
            if (order.status !== 'pendente') {
                return res.status(400).json({ error: `O pedido #${order.id} já foi pago ou cancelado.` });
            }
            valorTotalACobrar += Number(order.valor_sinal);
        }

        // Faz UMA ÚNICA cobrança no Stripe
        const charge = await stripe.charges.create({
            amount: Math.round(valorTotalACobrar * 100),
            currency: 'brl',
            source: token,
            description: `Sinal (50%) - Lote de Pedidos: ${orderIds.join(', ')}`
        });

        // dá baixa no lote inteiro Se o pagamento aprovou, 
        if (charge.status === 'succeeded') {
            for (const order of orders) {
                await order.update({ status: 'aprovada' });

                await Pagamento.create({
                    id_ordem_servico: order.id,
                    valor: order.valor_sinal, // Salva o valor fracionado que cada OS custou
                    status_pagamento: 'aprovado',
                    id_transacao_externa: charge.id // O ID do Stripe fica o mesmo pras duas
                });
            }

            res.status(200).json({ message: 'Pagamento processado com sucesso em todos os pedidos!' });
        } else {
            res.status(400).json({ error: 'O pagamento falhou.' });
        }
    } catch (error) {
        console.error('Erro ao processar pagamento do Lote:', error);
        res.status(500).json({ error: 'Erro no servidor ao processar pagamento.', details: error.message });
    }
};

module.exports = { 
    processPayment
};