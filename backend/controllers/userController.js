const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');


const registerUser = async (req, res) => {
  const { nome, email, senha } = req.body;
  try {
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }
    const userExists = await Usuario.findOne({ where: { email } });
    if (userExists) {
      return res.status(409).json({ error: 'Já existe um usuário com este e-mail.' });
    }
    const salt = await bcrypt.genSalt(10);
    const senha_hash = await bcrypt.hash(senha, salt);
    const newUser = await Usuario.create({
      nome,
      email,
      senha_hash,
      tipo_usuario: 'cliente',
    });
    res.status(201).json({
      message: 'Usuário registrado com sucesso.',
      usuario: { id: newUser.id, nome: newUser.nome, email: newUser.email, tipo_usuario: newUser.tipo_usuario },
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

const loginUser = async (req, res) => {
  const { email, senha } = req.body;
  try {
    const user = await Usuario.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }
    const isPasswordCorrect = await bcrypt.compare(senha, user.senha_hash);
    if (!isPasswordCorrect) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }
    const token = jwt.sign(
      { id: user.id, nome: user.nome, tipo_usuario: user.tipo_usuario },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.status(200).json({
      message: 'Login bem-sucedido.',
      token,
      usuario: { id: user.id, nome: user.nome, email: user.email, tipo_usuario: user.tipo_usuario },
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

const getProfile = (req, res) => {
  res.status(200).json(req.user);
};

const updateProfile = async (req, res) => {
  const { nome, email } = req.body;
  const { id } = req.user;
  try {
    const user = await Usuario.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    await user.update({ nome, email });
    res.status(200).json({
      message: 'Perfil atualizado com sucesso.',
      usuario: { id: user.id, nome: user.nome, email: user.email },
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

const changePassword = async (req, res) => {
  const { old_senha, new_senha } = req.body;
  const { id } = req.user;
  try {
    const user = await Usuario.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    const isOldPasswordCorrect = await bcrypt.compare(old_senha, user.senha_hash);
    if (!isOldPasswordCorrect) {
      return res.status(401).json({ error: 'A senha antiga está incorreta.' });
    }
    const salt = await bcrypt.genSalt(10);
    const new_senha_hash = await bcrypt.hash(new_senha, salt);
    await user.update({ senha_hash: new_senha_hash });
    res.status(200).json({ message: 'Senha atualizada com sucesso.' });
  } catch (error) {
    console.error('Erro ao mudar a senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
};