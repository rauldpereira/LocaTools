const cron = require('node-cron');
const { Op } = require('sequelize');
const { OrdemDeServico, ItemReserva, Unidade } = require('../models'); 

const iniciarCronJobs = () => {
    cron.schedule('*/5 * * * *', async () => {
        try {
            const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);

            const pedidosExpirados = await OrdemDeServico.findAll({
                where: {
                    status: 'pendente',
                    createdAt: {
                        [Op.lt]: umaHoraAtras
                    }
                },
                include: [{ model: ItemReserva, as: 'ItemReservas' }] 
            });

            if (pedidosExpirados.length === 0) return;

            for (const pedido of pedidosExpirados) {
                await pedido.update({ status: 'cancelada' });

                if (pedido.ItemReservas && pedido.ItemReservas.length > 0) {
                    for (const item of pedido.ItemReservas) {
                        await Unidade.update(
                            { status_locacao: 'disponivel' },
                            { where: { id: item.id_unidade } }
                        );
                        
                        if(item.update) {
                            await item.update({ status: 'cancelado' });
                        }
                    }
                }

                console.log(`❌ Pedido #${pedido.id} cancelado. Máquinas liberadas!`);
            }

        } catch (error) {
            console.error('Erro no Vigia de Cancelamento de Pedidos:', error);
        }
    });
};

module.exports = iniciarCronJobs;