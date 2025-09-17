const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await Usuario.findByPk(decoded.id, {
        attributes: { exclude: ['senha_hash'] },
      });

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ error: 'Token inválido ou expirado' });
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Não autorizado, token não fornecido' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.tipo_usuario === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Acesso negado. Esta rota é apenas para administradores.' });
  }
};

module.exports = { protect, admin };