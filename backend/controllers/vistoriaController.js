const { Vistoria, DetalhesVistoria, OrdemDeServico, sequelize } = require('../models');

const createVistoria = async (req, res) => {
    const { id_ordem_servico, tipo_vistoria, detalhes } = req.body;
    const files = req.files;
    const id_responsavel_vistoria = req.user.id;

    try {
        const resultado = await sequelize.transaction(async (t) => {
            const novaVistoria = await Vistoria.create({
                id_reserva: id_ordem_servico,
                tipo_vistoria,
                id_responsavel_vistoria,
                data: new Date()
            }, { transaction: t });

            const detalhesParsed = JSON.parse(detalhes);

            const detalhesParaCriar = detalhesParsed.map(detalhe => {

                const fotosDaUnidade = files
                    .filter(file => {
                        const regex = new RegExp(`\\[${detalhe.id_unidade}\\]`);
                        return regex.test(file.fieldname);
                    })
                    .map(file => `/uploads/vistorias/${file.filename}`);

                return {
                    id_vistoria: novaVistoria.id,
                    id_item_equipamento: detalhe.id_unidade,
                    condicao: detalhe.condicao,
                    foto: fotosDaUnidade,
                    comentarios: detalhe.comentarios
                };
            });

            await DetalhesVistoria.bulkCreate(detalhesParaCriar, { transaction: t });


            if (tipo_vistoria === 'entrega') {
                const ordemDeServico = await OrdemDeServico.findByPk(id_ordem_servico, { transaction: t });
                if (ordemDeServico) {
                    await ordemDeServico.update({ status: 'aguardando_assinatura' }, { transaction: t });
                }
            }

            const ordemDeServico = await OrdemDeServico.findByPk(id_ordem_servico, { transaction: t });
            if (ordemDeServico) {
                if (tipo_vistoria === 'entrega') {
                    await ordemDeServico.update({ status: 'aguardando_assinatura' }, { transaction: t });
                } else if (tipo_vistoria === 'devolucao') {
                    await ordemDeServico.update({ status: 'aguardando_pagamento_final' }, { transaction: t });
                }
            }

            return novaVistoria;
        });

        res.status(201).json({ message: "Vistoria registrada com sucesso!", vistoriaId: resultado.id });
    } catch (error) {
        console.error("Erro ao criar vistoria:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};

const getVistoriasByOrder = async (req, res) => {
    try {
        const vistorias = await Vistoria.findAll({
            where: { id_reserva: req.params.orderId },
            include: [{ model: DetalhesVistoria, as: 'detalhes' }],
            order: [['data', 'DESC']]
        });
        res.status(200).json(vistorias);
    } catch (error) {
        console.error("Erro ao buscar vistorias:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};

module.exports = { createVistoria, getVistoriasByOrder };