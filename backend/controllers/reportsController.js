const { OrdemDeServico, ItemReserva, Equipamento, Unidade, sequelize } = require('../models');
const { Op } = require('sequelize');


const getFinancialReport = async (req, res) => {
    
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'As datas de início e fim são obrigatórias.' });
    }

    try {
        const whereClause = {
            status: 'finalizada',
            updatedAt: {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            }
        };

        const orders = await OrdemDeServico.findAll({
            where: whereClause,
            include: [{
                model: ItemReserva,
                as: 'ItemReservas',
                include: [{
                    model: Unidade,
                    as: 'Unidade',
                    include: [{ model: Equipamento, as: 'Equipamento', attributes: ['id', 'nome'] }]
                }]
            }]
        });

        let faturamentoTotal = 0;
        let totalTaxaAvaria = 0;
        let totalTaxaRemarcacao = 0;
        const receitaPorEquipamento = {};

        for (const order of orders) {
            const taxaAvaria = Number(order.taxa_avaria) || 0;
            const taxaRemarcacao = Number(order.taxa_remarcacao) || 0;

            faturamentoTotal += Number(order.valor_total) + taxaAvaria + taxaRemarcacao;
            totalTaxaAvaria += taxaAvaria;
            totalTaxaRemarcacao += taxaRemarcacao;

            for (const item of order.ItemReservas) {
                const equipId = item.Unidade.Equipamento.id;
                const equipNome = item.Unidade.Equipamento.nome;

                const itemValue = Number(order.valor_total) / order.ItemReservas.length;

                if (receitaPorEquipamento[equipId]) {
                    receitaPorEquipamento[equipId].receita += itemValue;
                    receitaPorEquipamento[equipId].alugueis += 1;
                } else {
                    receitaPorEquipamento[equipId] = {
                        nome: equipNome,
                        receita: itemValue,
                        alugueis: 1
                    };
                }
            }
        }

        const topEquipamentos = Object.values(receitaPorEquipamento)
            .sort((a, b) => b.receita - a.receita);

        res.status(200).json({
            kpis: {
                faturamentoTotal,
                totalPedidos: orders.length,
                ticketMedio: orders.length > 0 ? faturamentoTotal / orders.length : 0,
                totalTaxaAvaria,
                totalTaxaRemarcacao
            },
            topEquipamentos
        });

    } catch (error) {
        console.error("Erro ao gerar relatório financeiro:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};

module.exports = { getFinancialReport };