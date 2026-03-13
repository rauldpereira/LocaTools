const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');


const registerUser = async (req, res) => {
  const { nome, email, senha, telefone, tipo_pessoa, cpf, rg, cnpj, razao_social } = req.body;

  try {
    if (!nome || !email || !senha || !tipo_pessoa) {
      return res.status(400).json({ error: 'Preencha os campos obrigatórios.' });
    }

    // Validação de Força da Senha no Cadastro 
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(senha)) {
        return res.status(400).json({ error: 'A senha deve ter no mínimo 8 caracteres, contendo letras e números.' });
    }

    const userExists = await Usuario.findOne({ where: { email } });
    if (userExists) {
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }

    if (tipo_pessoa === 'fisica') {
        if (!cpf || !rg) {
            return res.status(400).json({ error: 'CPF e RG são obrigatórios para Pessoa Física.' });
        }
        const cpfExists = await Usuario.findOne({ where: { cpf } });
        if (cpfExists) return res.status(400).json({ error: 'CPF já cadastrado.' });
    }

    if (tipo_pessoa === 'juridica') {
        if (!cnpj) {
            return res.status(400).json({ error: 'CNPJ é obrigatório para Empresa.' });
        }
        const cnpjExists = await Usuario.findOne({ where: { cnpj } });
        if (cnpjExists) return res.status(400).json({ error: 'CNPJ já cadastrado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const senha_hash = await bcrypt.hash(senha, salt);

    const newUser = await Usuario.create({
      nome,
      email,
      senha_hash,
      telefone,
      tipo_usuario: 'cliente',
      tipo_pessoa,
      
      cpf: tipo_pessoa === 'fisica' ? cpf : null,
      rg: tipo_pessoa === 'fisica' ? rg : null,
      cnpj: tipo_pessoa === 'juridica' ? cnpj : null,
      razao_social: tipo_pessoa === 'juridica' ? razao_social : null
    });

    res.status(201).json({
      message: 'Usuário registrado com sucesso.',
      usuario: { id: newUser.id, nome: newUser.nome, tipo_pessoa: newUser.tipo_pessoa },
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

    // Requisitos: Mínimo 8 caracteres, pelo menos uma letra e um número.
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(new_senha)) {
        return res.status(400).json({ error: 'A nova senha deve ter no mínimo 8 caracteres, contendo pelo menos letras e números.' });
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

const getTeam = async (req, res) => {
  try {
    if (req.user.tipo_usuario !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const team = await Usuario.findAll({
      where: {
        tipo_usuario: ['admin', 'funcionario']
      },
      attributes: ['id', 'nome', 'email', 'tipo_usuario', 'permissoes']
    });

    res.json(team);
  } catch (error) {
    console.error('Erro ao buscar equipe:', error);
    res.status(500).json({ error: 'Erro ao buscar equipe.' });
  }
};

// Atualiza as permissões de um funcionário
const updatePermissions = async (req, res) => {
  try {
    if (req.user.tipo_usuario !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const { id } = req.params;
    const { permissoes } = req.body;

    const usuario = await Usuario.findByPk(id);
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });

    usuario.permissoes = permissoes;
    await usuario.save();

    res.json({ message: 'Permissões atualizadas com sucesso!', usuario });
  } catch (error) {
    console.error('Erro ao atualizar permissões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const createFuncionario = async (req, res) => {
  try {
    if (req.user.tipo_usuario !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Preencha todos os campos.' });
    }

    // Validação de Força da Senha para Funcionários 
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(senha)) {
        return res.status(400).json({ error: 'A senha do funcionário deve ter no mínimo 8 caracteres, contendo letras e números.' });
    }

    // Checa se o email já tá em uso
    const userExists = await Usuario.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ error: 'Este email já está cadastrado.' });
    }

    // Criptografa a senha
    const salt = await bcrypt.genSalt(10);
    const senha_hash = await bcrypt.hash(senha, salt);

    // Cria o colaborador
    const novoFuncionario = await Usuario.create({
      nome,
      email,
      senha_hash,
      tipo_usuario: 'funcionario',
      permissoes: []
    });

    res.status(201).json({ message: 'Colaborador criado com sucesso!', usuario: { id: novoFuncionario.id, nome, email } });
  } catch (error) {
    console.error('Erro ao criar colaborador:', error);
    res.status(500).json({ error: 'Erro interno ao criar colaborador.' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
  getTeam,
  updatePermissions,
  createFuncionario
};