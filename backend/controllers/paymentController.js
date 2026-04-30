const { MercadoPagoConfig, Payment } = require('mercadopago');
const { OrdemDeServico, Pagamento, ItemReserva, Prejuizo, Usuario } = require('../models');

// Configuração do Mercado Pago
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN 
});
const payment = new Payment(client);

const processPayment = async (req, res) => {
    const { formData, orderIds } = req.body;
    const userId = req.user.id;

    console.log(`[PAYMENT] Iniciando processamento para pedidos: ${orderIds} | Usuário: ${userId}`);

    try {
        const { Op } = require('sequelize');

        // Busca as ordens de serviço
        const orders = await OrdemDeServico.findAll({
            where: { id: { [Op.in]: orderIds } },
            include: [
                {
                    model: ItemReserva,
                    as: 'ItemReservas',
                    include: [{ model: Prejuizo, as: 'prejuizo' }]
                },
                {
                    model: Usuario,
                    as: 'Usuario'
                }
            ]
        });

        if (!orders || orders.length === 0) {
            return res.status(404).json({ error: 'Ordens de serviço não encontradas.' });
        }

        let valorTotalACobrar = 0;
        let isDivida = false;

        for (const order of orders) {
            if (order.id_usuario !== userId) {
                return res.status(403).json({ error: 'Acesso negado a um dos pedidos.' });
            }

            if (order.status === 'pendente') {
                valorTotalACobrar += Number(order.valor_sinal);
            } else if (order.status === 'PREJUIZO') {
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
            } else if (order.status === 'aprovada' || order.status === 'finalizada') {
                return res.status(200).json({ status: 'approved', id: 'ALREADY_PAID' });
            } else {
                return res.status(400).json({ error: `O pedido #${order.id} não está aguardando pagamento.` });
            }
        }

        // Payload 
        const paymentData = {
            body: {
                transaction_amount: Number(formData.transaction_amount || valorTotalACobrar.toFixed(2)),
                token: formData.token,
                description: isDivida 
                    ? `Quitação de Dívida (B.O.) - Pedidos: ${orderIds.join(', ')}` 
                    : `Sinal - Lote de Pedidos: ${orderIds.join(', ')}`,
                installments: Number(formData.installments || 1),
                payment_method_id: formData.payment_method_id,
                ...(process.env.NODE_ENV === 'production' && formData.issuer_id ? { issuer_id: String(formData.issuer_id) } : {}),
                payer: {
                    email: formData.payer?.email === 'teste@gmail.com' ? 'comprador.teste@sandbox.com' : formData.payer?.email || 'comprador.teste@sandbox.com'
                },
                metadata: {
                    user_id: userId,
                    order_ids: orderIds.join(','),
                    is_divida: isDivida
                }
            }
        };

        console.log('[PAYMENT] Payload FINAL para API:', JSON.stringify(paymentData.body, null, 2));

        const result = await payment.create(paymentData);

        if (result.status === 'approved') {
            for (const order of orders) {
                if (order.status === 'pendente') {
                    await order.update({ status: 'aprovada' });
                    await Pagamento.create({
                        id_ordem_servico: order.id,
                        valor: order.valor_sinal, 
                        status_pagamento: 'aprovado',
                        id_transacao_externa: result.id.toString(),
                        metodo_detalhe: result.payment_method_id || result.payment_method?.id,
                        cartao_final: result.card?.last_four_digits,
                        parcelas: result.installments || 1
                    });
                } else if (order.status === 'PREJUIZO') {
                    let dividaDaOS = Number(order.valor_total) - Number(order.valor_sinal);
                    if (order.ItemReservas) {
                        for (const item of order.ItemReservas) {
                            if (item.prejuizo && !item.prejuizo.resolvido) {
                                dividaDaOS += Number(item.prejuizo.valor_prejuizo);
                                await item.prejuizo.update({
                                    resolvido: true,
                                    data_resolucao: new Date(),
                                    forma_recuperacao: 'mercado_pago_bricks' 
                                });
                            }
                        }
                    }
                    await order.update({ status: 'finalizada' });
                    await Pagamento.create({
                        id_ordem_servico: order.id,
                        valor: dividaDaOS,
                        status_pagamento: 'aprovado',
                        id_transacao_externa: result.id.toString(),
                        metodo_detalhe: result.payment_method_id || result.payment_method?.id,
                        cartao_final: result.card?.last_four_digits,
                        parcelas: result.installments || 1
                    });
                }
            }
        } else if (result.status === 'in_process' || result.status === 'pending') {
             for (const order of orders) {
                await Pagamento.create({
                    id_ordem_servico: order.id,
                    valor: order.status === 'pendente' ? order.valor_sinal : 0, 
                    status_pagamento: 'pendente',
                    id_transacao_externa: result.id.toString(),
                    metodo_detalhe: result.payment_method_id || result.payment_method?.id,
                    cartao_final: result.card?.last_four_digits,
                    parcelas: result.installments || 1
                });
             }
        }

        res.status(200).json(result);

    } catch (error) {
        console.error('Erro na API Mercado Pago:', error);
        res.status(500).json({ error: 'Erro interno', details: error.message });
    }
};

const createPaymentIntent = async (req, res) => res.status(200).json({ amount: 0 });
const handleWebhook = async (req, res) => res.status(200).send('OK');

module.exports = { processPayment, createPaymentIntent, handleWebhook };