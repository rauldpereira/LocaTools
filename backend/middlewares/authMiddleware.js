const jwt = require("jsonwebtoken");
const { Usuario } = require("../models");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await Usuario.findByPk(decoded.id, {
        attributes: { exclude: ["senha_hash"] },
      });

      if (!req.user) {
        console.log(
          "❌ [Protect] Usuário barrado: ID não existe mais no banco de dados.",
        );
        return res
          .status(401)
          .json({ error: "Usuário não encontrado no banco" });
      }

      return next(); 
    } catch (error) {
      console.error(
        "❌ [Protect] Erro no Token (Vencido ou Inválido):",
        error.message,
      );
      return res.status(401).json({ error: "Token inválido ou expirado" });
    }
  }

  if (!token) {
    console.log("❌ [Protect] Barrado: Nenhum token foi enviado pelo React.");
    return res
      .status(401)
      .json({ error: "Não autorizado, token não fornecido" });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.tipo_usuario === "admin") {
    return next();
  } else {
    return res
      .status(403)
      .json({
        error: "Acesso negado. Esta rota é apenas para administradores.",
      });
  }
};

const checkPermissao = (...permissoesRequeridas) => {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ error: "Não autorizado, usuário não encontrado" });
    }

    if (req.user.tipo_usuario === "admin") {
      return next(); 
    }

    let permissoes = req.user.permissoes || [];
    if (typeof permissoes === "string") {
      try {
        permissoes = JSON.parse(permissoes);
      } catch (err) {
        permissoes = [];
      }
    }

    // verifica se Tem pelo menos uma das permissões que a rota pede
    const temPermissao = permissoesRequeridas.some((permissao) =>
      permissoes.includes(permissao),
    );

    if (temPermissao) {
      console.log("✅ [Segurança] Catraca Liberada!\n");
      return next();
    }

    console.log("🚫 [Segurança] Barrado por falta de Permissão!\n");
    return res.status(403).json({ error: `Acesso negado. Faltam permissões.` });
  };
};

module.exports = { protect, admin, checkPermissao };
