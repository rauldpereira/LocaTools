<<<<<<< HEAD
const { Equipamento, Categoria } = require('../models');

const createEquipment = async (req, res) => {
    const { nome, descricao, preco_diaria, id_categoria, status, url_imagem } = req.body;
=======
const { Equipamento, Categoria, Unidade, sequelize } = require('../models');

const createEquipment = async (req, res) => {
    const { nome, descricao, preco_diaria, id_categoria, status, url_imagem, quantidade_inicial } = req.body;
>>>>>>> 2d9d9a8 (feat: add calendario, modal e consertado o bug de uma unidade fantasma)

    try {
        if (req.user.tipo_usuario !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem criar equipamentos.' });
        }

<<<<<<< HEAD
        if (!nome || !preco_diaria || !id_categoria) {
            return res.status(400).json({ error: 'Nome, preço diário e categoria são campos obrigatórios.' });
        }

        const newEquipment = await Equipamento.create({
            nome,
            descricao,
            preco_diaria,
            id_categoria,
            status: status || 'disponivel',
            url_imagem,
=======
        const qtdInicialNum = parseInt(quantidade_inicial);
        if (!nome || !preco_diaria || !id_categoria || isNaN(qtdInicialNum) || qtdInicialNum < 0) {
            return res.status(400).json({ error: 'Nome, preço diário, categoria e uma quantidade inicial válida (0 ou mais) são campos obrigatórios.' });
        }

        const newEquipment = await sequelize.transaction(async (t) => {
            
            const equipamentoCriado = await Equipamento.create({
                nome,
                descricao,
                preco_diaria,
                id_categoria,
                status: status || 'disponivel',
                url_imagem,
                total_quantidade: qtdInicialNum 
            }, { transaction: t });

            if (qtdInicialNum > 0) {
                const unidadesParaCriar = [];
                for (let i = 0; i < qtdInicialNum; i++) {
                    unidadesParaCriar.push({
                        id_equipamento: equipamentoCriado.id,
                        status: 'disponivel'
                    });
                }
                await Unidade.bulkCreate(unidadesParaCriar, { transaction: t });
            }

            return equipamentoCriado;
>>>>>>> 2d9d9a8 (feat: add calendario, modal e consertado o bug de uma unidade fantasma)
        });

        res.status(201).json(newEquipment);

    } catch (error) {
<<<<<<< HEAD
        console.error('Erro ao criar equipamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
=======
        console.error('Erro ao criar equipamento e suas unidades:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao criar equipamento.' });
>>>>>>> 2d9d9a8 (feat: add calendario, modal e consertado o bug de uma unidade fantasma)
    }
};

const getEquipments = async (req, res) => {
    try {
        const equipamentos = await Equipamento.findAll({
            include: [{
                model: Categoria,
                as: 'Categoria',
                attributes: ['id', 'nome']
            }]
        });

        res.status(200).json(equipamentos);

    } catch (error) {
        console.error('Erro ao buscar equipamentos:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const getEquipmentById = async (req, res) => {
    const { id } = req.params;

    try {
        const equipamento = await Equipamento.findByPk(id, {
            include: [{
                model: Categoria,
                as: 'Categoria',
                attributes: ['id', 'nome']
            }]
        });

        if (!equipamento) {
            return res.status(404).json({ error: 'Equipamento não encontrado.' });
        }

        res.status(200).json(equipamento);

    } catch (error) {
        console.error('Erro ao buscar equipamento por ID:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const updateEquipment = async (req, res) => {
    const { id } = req.params;

    try {
        if (req.user.tipo_usuario !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem atualizar equipamentos.' });
        }

        const equipamento = await Equipamento.findByPk(id);

        if (!equipamento) {
            return res.status(404).json({ error: 'Equipamento não encontrado.' });
        }

        await equipamento.update(req.body);

        res.status(200).json({ message: 'Equipamento atualizado com sucesso.', equipamento });

    } catch (error) {
        console.error('Erro ao atualizar equipamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const deleteEquipment = async (req, res) => {
    const { id } = req.params;

    try {
        if (req.user.tipo_usuario !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem deletar equipamentos.' });
        }

        const equipamento = await Equipamento.findByPk(id);

        if (!equipamento) {
            return res.status(404).json({ error: 'Equipamento não encontrado.' });
        }

        await equipamento.destroy();

        res.status(200).json({ message: 'Equipamento deletado com sucesso.' });

    } catch (error) {
        console.error('Erro ao deletar equipamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

module.exports = {
    createEquipment,
    getEquipments,
    getEquipmentById,
    updateEquipment,
    deleteEquipment,
};