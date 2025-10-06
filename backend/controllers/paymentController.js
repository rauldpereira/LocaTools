const Stripe = require('stripe');
const { OrdemDeServico, Pagamento, Usuario } = require('../models');

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


const createCheckoutSession = async (req, res) => {
    const { orderId } = req.body;

    try {
        const order = await OrdemDeServico.findByPk(orderId, { include: [Usuario] });

        console.log(`\n--- [DEBUG] Tentando gerar link PIX para Ordem #${orderId} ---`);
        if (order) {
            console.log(`[DEBUG] Status atual no banco: '${order.status}'`);
            console.log(`[DEBUG] Verificando se é igual a: 'aguardando_pagamento_final'`);
            console.log(`[DEBUG] Resultado da comparação: ${order.status === 'aguardando_pagamento_final'}`);
        } else {
            console.log('[DEBUG] Ordem não encontrada!');
        }

        if (!order || order.status !== 'aguardando_pagamento_final') {
            return res.status(400).json({ error: 'Ordem inválida para gerar link de pagamento.' });
        }

        const valorRestante = Number(order.valor_total) - Number(order.valor_sinal);

        if (valorRestante <= 0) {
            await order.update({ status: 'finalizada' });
            return res.status(200).json({ message: 'Ordem finalizada sem cobrança adicional.' });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['pix'],
            line_items: [{
                price_data: {
                    currency: 'brl',
                    product_data: { name: `Pagamento Final - Pedido #${order.id}` },
                    unit_amount: Math.round(valorRestante * 100),
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/payment/success/${order.id}`,
            cancel_url: `${process.env.FRONTEND_URL}/my-reservations/${order.id}`,
            customer_email: order.Usuario.email,
            metadata: { orderId: order.id }
        });


        res.status(200).json({ url: session.url });

    } catch (error) {
        console.error('Erro ao criar sessão de checkout:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

module.exports = { processPayment, createCheckoutSession };