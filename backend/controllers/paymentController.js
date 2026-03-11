const Stripe = require('stripe');
const { OrdemDeServico, Pagamento, ItemReserva, Prejuizo } = require('../models');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const processPayment = async (req, res) => {
    const { orderIds, token, cpfCnpj } = req.body; 
    const userId = req.user.id;

    try {
        const { Op } = require('sequelize');

        // Busca TODAS as ordens e já traz os Itens e Prejuízos
        const orders = await OrdemDeServico.findAll({
            where: { id: { [Op.in]: orderIds } },
            include: [{
                model: ItemReserva,
                as: 'ItemReservas',
                include: [{ model: Prejuizo, as: 'prejuizo' }]
            }]
        });

        if (!orders || orders.length === 0) {
            return res.status(404).json({ error: 'Ordens de serviço não encontradas.' });
        }

        let valorTotalACobrar = 0;
        let isDivida = false;

        // Validações e soma dos valores
        for (const order of orders) {
            if (order.id_usuario !== userId) {
                return res.status(403).json({ error: 'Acesso negado a um dos pedidos.' });
            }

            if (order.status === 'pendente') {
                // Cliente novo pagando Sinal
                valorTotalACobrar += Number(order.valor_sinal);
            } else if (order.status === 'PREJUIZO') {
                // Cliente pagando Dívida!
                isDivida = true;
                let dividaDaOS = Number(order.valor_total) - Number(order.valor_sinal);
                
                if (order.ItemReservas) {
                    order.ItemReservas.forEach(item => {
                        if (item.prejuizo && !item.prejuizo.resolvido) {
                            dividaDaOS += Number(item.prejuizo.valor_prejuizo);
                        }
                    });
                }
                valorTotalACobrar += dividaDaOS;
            } else {
                return res.status(400).json({ error: `O pedido #${order.id} não está aguardando pagamento.` });
            }
        }

        // Faz UMA ÚNICA cobrança no Stripe
        const charge = await stripe.charges.create({
            amount: Math.round(valorTotalACobrar * 100),
            currency: 'brl',
            source: token,
            description: isDivida 
                ? `Quitação de Dívida (B.O.) - Pedidos: ${orderIds.join(', ')}` 
                : `Sinal (50%) - Lote de Pedidos: ${orderIds.join(', ')}`
        });

        // Se o cartão passou, dá baixa no sistema!
        if (charge.status === 'succeeded') {
            for (const order of orders) {
                
                if (order.status === 'pendente') {
                    await order.update({ status: 'aprovada' });
                    await Pagamento.create({
                        id_ordem_servico: order.id,
                        valor: order.valor_sinal, 
                        status_pagamento: 'aprovado',
                        id_transacao_externa: charge.id 
                    });

                } else if (order.status === 'PREJUIZO') {
                    // Limpa o nome do cara
                    let dividaDaOS = Number(order.valor_total) - Number(order.valor_sinal);
                    
                    if (order.ItemReservas) {
                        for (const item of order.ItemReservas) {
                            if (item.prejuizo && !item.prejuizo.resolvido) {
                                dividaDaOS += Number(item.prejuizo.valor_prejuizo);
                                await item.prejuizo.update({
                                    resolvido: true,
                                    data_resolucao: new Date(),
                                    forma_recuperacao: 'cartao' 
                                });
                            }
                        }
                    }

                    await order.update({ status: 'finalizada' });
                    await Pagamento.create({
                        id_ordem_servico: order.id,
                        valor: dividaDaOS,
                        status_pagamento: 'aprovado',
                        id_transacao_externa: `recuperacao_stripe_${charge.id}` 
                    });
                }
            }

            res.status(200).json({ message: 'Pagamento processado com sucesso em todos os pedidos!' });
        } else {
            res.status(400).json({ error: 'O pagamento falhou.' });
        }
    } catch (error) {
        console.error('Erro ao processar pagamento:', error);
        res.status(500).json({ error: 'Erro no servidor ao processar pagamento.', details: error.message });
    }
};

module.exports = { processPayment };