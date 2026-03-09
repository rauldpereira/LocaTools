const express = require('express');
const { Categoria } = require('../models');
const { protect, checkPermissao } = require('../middlewares/authMiddleware');

const router = express.Router();

// Público
router.get('/', async (req, res) => {
    try {
        const categorias = await Categoria.findAll();
        res.status(200).json(categorias);
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// Protegido
router.post('/', protect, checkPermissao('gerenciar_estoque'), async (req, res) => {
    const { nome } = req.body;
    try {
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