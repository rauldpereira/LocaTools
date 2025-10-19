const { Unidade, Equipamento, ItemReserva, OrdemDeServico, TipoAvaria } = require('../models');

const addUnitsToEquipment = async (req, res) => {
    const equipmentId = req.params.id;
    const { quantityToAdd } = req.body; 

    try {
        const quantity = parseInt(quantityToAdd);
        if (isNaN(quantity) || quantity <= 0) {
            return res.status(400).json({ error: 'A quantidade a ser adicionada deve ser um número maior que zero.' });
        }

        const equipment = await Equipamento.findByPk(equipmentId);
        if (!equipment) {
            return res.status(404).json({ error: 'Equipamento não encontrado.' });
        }

        for (let i = 0; i < quantity; i++) {
            await Unidade.create({
                id_equipamento: equipmentId,
                status: 'disponivel'
            });
        }
        
        await equipment.increment('total_quantidade', { by: quantity });

        res.status(201).json({ message: `${quantity} unidades foram adicionadas com sucesso ao equipamento "${equipment.nome}".` });

    } catch (error) {
        console.error('Erro ao adicionar unidades:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const getUnitsByEquipment = async (req, res) => {
    try {
        const units = await Unidade.findAll({
            where: { id_equipamento: req.params.id }
        });
        res.status(200).json(units);
    } catch (error) {
        console.error('Erro ao buscar unidades por equipamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const updateUnitStatus = async (req, res) => {
    const { status } = req.body;
    try {
        const unit = await Unidade.findByPk(req.params.id);
        if (!unit) {
            return res.status(404).json({ error: 'Unidade não encontrada.' });
        }
        unit.status = status;
        await unit.save();
        res.status(200).json(unit);
    } catch (error) {
        console.error('Erro ao atualizar status da unidade:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const deleteUnit = async (req, res) => {
    try {
        const unit = await Unidade.findByPk(req.params.id);
        if (!unit) {
            return res.status(404).json({ error: 'Unidade não encontrada.' });
        }

        const equipment = await Equipamento.findByPk(unit.id_equipamento);

        await unit.destroy();

        if (equipment) {

            await equipment.decrement('total_quantidade', { by: 1 });
        }

        res.status(200).json({ message: 'Unidade deletada com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar unidade:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const updateUnitDetails = async (req, res) => {
    const { status, avarias_atuais } = req.body;
    
    try {
        const unit = await Unidade.findByPk(req.params.id);
        if (!unit) {
            return res.status(404).json({ error: 'Unidade não encontrada.' });
        }

        await unit.update({
            status: status,
            avarias_atuais: avarias_atuais
        });

        res.status(200).json(unit);
    } catch (error) {
        console.error('Erro ao atualizar detalhes da unidade:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

module.exports = { 
    addUnitsToEquipment,
    getUnitsByEquipment,
    updateUnitStatus,
    deleteUnit,
    updateUnitDetails
};
