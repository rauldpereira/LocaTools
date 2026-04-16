const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');
const nodemailer = require('nodemailer');


const registerUser = async (req, res) => {
  const { nome, email, senha, telefone, tipo_pessoa, cpf, rg, cnpj, razao_social } = req.body;

  try {
    if (!nome || !email || !senha || !tipo_pessoa) {
      return res.status(400).json({ error: 'Preencha os campos obrigatórios.' });
    }

    // Validação de Força da Senha no Cadastro 
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
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
      { id: user.id, nome: user.nome, tipo_usuario: user.tipo_usuario, precisa_trocar_senha: user.precisa_trocar_senha },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.status(200).json({
      message: 'Login bem-sucedido.',
      token,
      usuario: { id: user.id, nome: user.nome, email: user.email, tipo_usuario: user.tipo_usuario, precisa_trocar_senha: user.precisa_trocar_senha },
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
  const { nome, email, telefone, rg, razao_social } = req.body;
  const { id } = req.user;
  try {
    const user = await Usuario.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    
    // Atualiza apenas os campos permitidos
    await user.update({ 
      nome, 
      email, 
      telefone, 
      rg, 
      razao_social 
    });

    res.status(200).json({
      message: 'Perfil atualizado com sucesso.',
      usuario: { 
        id: user.id, 
        nome: user.nome, 
        email: user.email, 
        telefone: user.telefone, 
        rg: user.rg, 
        razao_social: user.razao_social,
        cpf: user.cpf,
        cnpj: user.cnpj,
        tipo_pessoa: user.tipo_pessoa
      },
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

    if (!user.precisa_trocar_senha) {
      if (!old_senha) {
        return res.status(400).json({ error: 'A senha antiga é obrigatória.' });
      }
      const isOldPasswordCorrect = await bcrypt.compare(old_senha, user.senha_hash);
      if (!isOldPasswordCorrect) {
        return res.status(401).json({ error: 'A senha atual está incorreta.' });
      }
    }

    // Requisitos: Mínimo 8 caracteres, pelo menos uma letra e um número.
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(new_senha)) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 8 caracteres, contendo pelo menos letras e números.' });
    }

    const salt = await bcrypt.genSalt(10);
    const new_senha_hash = await bcrypt.hash(new_senha, salt);

    await user.update({
      senha_hash: new_senha_hash,
      precisa_trocar_senha: false
    });

    const newToken = jwt.sign(
      {
        id: user.id,
        nome: user.nome,
        tipo_usuario: user.tipo_usuario,
        precisa_trocar_senha: false
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Senha atualizada com sucesso.',
      token: newToken
    });
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
      attributes: ['id', 'nome', 'email', 'cpf', 'tipo_usuario', 'permissoes']
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

    const { nome, email, cpf, senha, tipo_usuario } = req.body;

    if (!nome || !email || !senha || !cpf) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios (Nome, Email, CPF e Senha).' });
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(senha)) {
      return res.status(400).json({ error: 'A senha do funcionário deve ter no mínimo 8 caracteres, contendo letras e números.' });
    }

    const userExists = await Usuario.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ error: 'Este email já está cadastrado.' });
    }

    // Não deixa cadastrar CPF duplicado
    const cpfExists = await Usuario.findOne({ where: { cpf } });
    if (cpfExists) {
      return res.status(400).json({ error: 'Este CPF já está vinculado a outra conta.' });
    }

    const salt = await bcrypt.genSalt(10);
    const senha_hash = await bcrypt.hash(senha, salt);

    // Cria o colaborador
    const novoFuncionario = await Usuario.create({
      nome,
      email,
      cpf,
      senha_hash,
      tipo_usuario: tipo_usuario || 'funcionario',
      tipo_pessoa: 'fisica',
      permissoes: []
    });

    res.status(201).json({ message: 'Colaborador criado com sucesso!', usuario: { id: novoFuncionario.id, nome, email, cpf } });
  } catch (error) {
    console.error('Erro ao criar colaborador:', error);
    res.status(500).json({ error: 'Erro interno ao criar colaborador.' });
  }
};

const updateFuncionarioDados = async (req, res) => {
  try {
    if (req.user.tipo_usuario !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem editar a equipe.' });
    }

    const { id } = req.params;
    const { nome, email, cpf, senha, tipo_usuario } = req.body;

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    if (usuario.tipo_usuario === 'admin' && tipo_usuario !== 'admin') {
      const adminCount = await Usuario.count({ where: { tipo_usuario: 'admin' } });
      if (adminCount <= 1) {
        return res.status(403).json({ error: 'Operação bloqueada! O sistema precisa ter pelo menos um Administrador.' });
      }
    }

    if (email !== usuario.email) {
      const emailExists = await Usuario.findOne({ where: { email } });
      if (emailExists) return res.status(400).json({ error: 'Este e-mail já está em uso por outra conta.' });
    }

    if (cpf && cpf !== usuario.cpf) {
      const cpfExists = await Usuario.findOne({ where: { cpf } });
      if (cpfExists) return res.status(400).json({ error: 'Este CPF já está em uso por outro colaborador.' });
    }

    const updateData = { nome, email, cpf, tipo_usuario };

    if (senha && senha.trim() !== '') {
      if (senha.length < 6) {
        return res.status(400).json({ error: 'A senha provisória deve ter pelo menos 6 dígitos.' });
      }
      const salt = await bcrypt.genSalt(10);
      updateData.senha_hash = await bcrypt.hash(senha, salt);

      updateData.precisa_trocar_senha = true;
    }

    await usuario.update(updateData);

    res.status(200).json({ message: 'Dados e acessos atualizados com sucesso!', usuario: updateData });
  } catch (error) {
    console.error('Erro ao atualizar dados do funcionário:', error);
    res.status(500).json({ error: 'Erro interno ao atualizar colaborador.' });
  }
};

const deleteUser = async (req, res) => {
  try {
    if (req.user.tipo_usuario !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const { id } = req.params;
    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // O Admin não pode se auto-excluir 
    if (usuario.id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode excluir sua própria conta.' });
    }

    if (usuario.tipo_usuario === 'admin') {
      const adminCount = await Usuario.count({ where: { tipo_usuario: 'admin' } });
      if (adminCount <= 1) {
        return res.status(403).json({ error: 'Operação bloqueada! Não é possível excluir o único Administrador do sistema.' });
      }
    }

    await usuario.destroy();
    res.status(200).json({ message: 'Usuário excluído com sucesso.' });

  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro interno ao excluir usuário.' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await Usuario.findOne({ where: { email } });
    if (!user) {
      return res.status(200).json({ message: 'Se o e-mail existir, um link de recuperação foi enviado.' });
    }

    // Cria um token válido por 15 minutos!
    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });

    // Configura o Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // O link que o usuário vai clicar
    const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"LocaTools Suporte" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: '🔒 Redefinição de Senha - LocaTools',
      html: `
        <h2>Olá, ${user.nome}!</h2>
        <p>Recebemos um pedido para redefinir a sua senha.</p>
        <p>Clique no botão abaixo para criar uma nova senha. <b>Este link é válido por apenas 15 minutos.</b></p>
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Redefinir Minha Senha</a>
        <p>Se você não solicitou isso, apenas ignore este e-mail.</p>
      `
    };

    transporter.sendMail(mailOptions).catch(error => {
        console.error('Falha silenciosa ao disparar o e-mail de recuperação:', error);
    });

    return res.status(200).json({ message: 'Se o e-mail existir, um link de recuperação foi enviado.' });
  } catch (error) {
    console.error('Erro no forgotPassword:', error);
    res.status(500).json({ error: 'Erro ao tentar enviar o e-mail.' });
  }
};

const resetPasswordFromLink = async (req, res) => {
  const { token, novaSenha } = req.body;

  try {
    // Tenta abrir o token. Se passou de 15 min ou for falso, cai no catch na hora!
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await Usuario.findByPk(decoded.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(novaSenha)) {
        return res.status(400).json({ error: 'A nova senha deve ter no mínimo 8 caracteres, contendo letras e números.' });
    }

    const salt = await bcrypt.genSalt(10);
    const senha_hash = await bcrypt.hash(novaSenha, salt);

    await user.update({ senha_hash });

    res.status(200).json({ message: 'Sua senha foi redefinida com sucesso! Você já pode fazer login.' });
  } catch (error) {
    res.status(400).json({ error: 'O link é inválido ou expirou. Solicite a recuperação novamente.' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  forgotPassword,
  resetPasswordFromLink,
  updateProfile,
  changePassword,
  getTeam,
  updatePermissions,
  createFuncionario,
  updateFuncionarioDados,
  deleteUser
};