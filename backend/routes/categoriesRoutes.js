const express = require('express');
const { Categoria } = require('../models');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const categorias = await Categoria.findAll();
        res.status(200).json(categorias);
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

router.post('/', protect, async (req, res) => {
    const { nome } = req.body;
    try {
        if (req.user.tipo_usuario !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem criar categorias.' });
        }
        if (!nome) {
            return res.status(400).json({ error: 'O nome da categoria é obrigatório.' });
        }
        const novaCategoria = await Categoria.create({ nome });
        res.status(201).json(novaCategoria);
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

module.exports = router;