// backend/controllers/unitController.js

<<<<<<< HEAD
const { Unidade, Equipamento } = require('../models');
=======
const { Unidade, Equipamento, ItemReserva, OrdemDeServico } = require('../models');
>>>>>>> 2d9d9a8 (feat: add calendario, modal e consertado o bug de uma unidade fantasma)

// @desc    Adicionar múltiplas unidades a um equipamento
// @route   POST /api/equipment/:id/units
// @access  Privado/Admin
const addUnitsToEquipment = async (req, res) => {
    const equipmentId = req.params.id;
    // O frontend vai enviar um JSON como: { "quantityToAdd": 5 }
    const { quantityToAdd } = req.body; 

    try {
        // Validação inicial
        const quantity = parseInt(quantityToAdd);
        if (isNaN(quantity) || quantity <= 0) {
            return res.status(400).json({ error: 'A quantidade a ser adicionada deve ser um número maior que zero.' });
        }

        const equipment = await Equipamento.findByPk(equipmentId);
        if (!equipment) {
            return res.status(404).json({ error: 'Equipamento não encontrado.' });
        }

        // Loop para criar a quantidade de unidades solicitada
        for (let i = 0; i < quantity; i++) {
            await Unidade.create({
                id_equipamento: equipmentId,
                status: 'disponivel' // Define o status inicial como 'disponivel'
            });
        }
        
        // ATUALIZA a contagem total no equipamento principal
        await equipment.increment('total_quantidade', { by: quantity });

        res.status(201).json({ message: `${quantity} unidades foram adicionadas com sucesso ao equipamento "${equipment.nome}".` });

    } catch (error) {
        console.error('Erro ao adicionar unidades:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

<<<<<<< HEAD
module.exports = { addUnitsToEquipment };
console.log('[DEBUG] Exportando de unitController:', module.exports);
=======
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

// @desc    Atualizar o status de UMA unidade específica
// @route   PUT /api/units/:id
// @access  Privado/Admin
const updateUnitStatus = async (req, res) => {
    const { status } = req.body; // Espera um body como { "status": "em manutenção" }
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

module.exports = { 
    addUnitsToEquipment,
    getUnitsByEquipment,
    updateUnitStatus
};
>>>>>>> 2d9d9a8 (feat: add calendario, modal e consertado o bug de uma unidade fantasma)
