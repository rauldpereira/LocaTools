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
                console.log(`[PAYMENT] Pedido #${order.id} já está pago/finalizado. Redirecionando...`);
                return res.status(200).json({ status: 'approved', id: 'ALREADY_PAID' });
            } else {
                console.error(`[PAYMENT] Pedido #${order.id} com status inválido: ${order.status}`);
                return res.status(400).json({ error: `O pedido #${order.id} não está aguardando pagamento (Status: ${order.status}).` });
            }
        }

        // Prepara os dados para o Mercado Pago
        const paymentData = {
            body: {
                transaction_amount: Number(valorTotalACobrar.toFixed(2)),
                token: formData.token,
                description: isDivida 
                    ? `Quitação de Dívida (B.O.) - Pedidos: ${orderIds.join(', ')}` 
                    : `Sinal - Lote de Pedidos: ${orderIds.join(', ')}`,
                installments: Number(formData.installments),
                payment_method_id: formData.payment_method_id,
                issuer_id: formData.issuer_id,
                payer: {
                    email: formData.payer?.email || orders[0].Usuario.email,
                    identification: formData.payer?.identification || {
                        type: orders[0].Usuario.tipo_pessoa === 'juridica' ? 'CNPJ' : 'CPF',
                        number: (orders[0].Usuario.cnpj || orders[0].Usuario.cpf || '').replace(/\D/g, '')
                    },
                    first_name: formData.payer?.first_name || formData.payer?.firstName || orders[0].Usuario.nome.split(' ')[0],
                    last_name: formData.payer?.last_name || formData.payer?.lastName || orders[0].Usuario.nome.split(' ').slice(1).join(' ') || 'da Silva',
                },
                metadata: {
                    user_id: userId,
                    order_ids: orderIds.join(','),
                    is_divida: isDivida
                }
            }
        };

        const result = await payment.create(paymentData);

        if (result.status === 'approved') {
            // Atualiza os pedidos se já for aprovado (Cartão/Pix)
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

        // Retorna o resultado completo para o Brick processar a UI 
        res.status(200).json(result);

    } catch (error) {
        console.error('Erro ao processar pagamento Mercado Pago:', error);
        res.status(500).json({ error: 'Erro ao processar pagamento.', details: error.message });
    }
};

const createPaymentIntent = async (req, res) => {
    const { orderIds } = req.body;
    const userId = req.user.id;

    try {
        const { Op } = require('sequelize');
        const orders = await OrdemDeServico.findAll({
            where: { id: { [Op.in]: orderIds } }
        });

        let valorTotalACobrar = 0;
        for (const order of orders) {
            if (order.status === 'pendente') {
                valorTotalACobrar += Number(order.valor_sinal);
            } else if (order.status === 'PREJUIZO') {
                // Lógica simplificada aqui para o "intent"
                valorTotalACobrar += (Number(order.valor_total) - Number(order.valor_sinal));
            }
        }

        res.status(200).json({ 
            amount: valorTotalACobrar 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const handleWebhook = async (req, res) => {
    const { type, data, action } = req.body;

    // Mercado Pago pode enviar 'type' ou 'action' 
    if (type === 'payment' || action === 'payment.created' || action === 'payment.updated') {
        const paymentId = data.id || req.body.data?.id;

        try {
            const paymentDetail = await payment.get({ id: paymentId });
            
            if (paymentDetail.status === 'approved') {
                const { order_ids, is_divida } = paymentDetail.metadata;
                const orderIdList = order_ids.split(',').map(Number);

                for (const id of orderIdList) {
                    const order = await OrdemDeServico.findByPk(id, {
                        include: [{ model: ItemReserva, as: 'ItemReservas', include: [{ model: Prejuizo, as: 'prejuizo' }] }]
                    });

                    if (order) {
                        // Verifica se o pagamento já foi registrado para evitar duplicidade
                        const existingPayment = await Pagamento.findOne({ where: { id_transacao_externa: paymentId.toString(), id_ordem_servico: id } });
                        
                        if (!existingPayment) {
                            if (order.status === 'pendente') {
                                await order.update({ status: 'aprovada' });
                                await Pagamento.create({
                                    id_ordem_servico: id,
                                    valor: order.valor_sinal,
                                    status_pagamento: 'aprovado',
                                    id_transacao_externa: paymentId.toString(),
                                    metodo_detalhe: paymentDetail.payment_method_id,
                                    cartao_final: paymentDetail.card?.last_four_digits,
                                    parcelas: paymentDetail.installments || 1
                                });
                            } else if (order.status === 'PREJUIZO' || is_divida === 'true' || is_divida === true) {
                                let dividaDaOS = Number(order.valor_total) - Number(order.valor_sinal);
                                
                                if (order.ItemReservas) {
                                    for (const item of order.ItemReservas) {
                                        if (item.prejuizo && !item.prejuizo.resolvido) {
                                            dividaDaOS += Number(item.prejuizo.valor_prejuizo);
                                            await item.prejuizo.update({
                                                resolvido: true,
                                                data_resolucao: new Date(),
                                                forma_recuperacao: 'mercado_pago_webhook'
                                            });
                                        }
                                    }
                                }

                                await order.update({ status: 'finalizada' });
                                await Pagamento.create({
                                    id_ordem_servico: id,
                                    valor: dividaDaOS,
                                    status_pagamento: 'aprovado',
                                    id_transacao_externa: paymentId.toString(),
                                    metodo_detalhe: paymentDetail.payment_method_id,
                                    cartao_final: paymentDetail.card?.last_four_digits,
                                    parcelas: paymentDetail.installments || 1
                                });
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao processar webhook do Mercado Pago:', error);
        }
    }

    // Mercado Pago exige resposta 200 ou 201
    res.status(200).send('OK');
};

module.exports = { processPayment, createPaymentIntent, handleWebhook };