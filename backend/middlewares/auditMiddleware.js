const logger = require('../utils/logger');

const auditMiddleware = (req, res, next) => {
  // Guarda a função original
  const originalSend = res.send;

  // Intercepta a resposta para saber se deu sucesso
  res.send = function (body) {
    res.send = originalSend;
    
    // Só loga requisições de métodos que modificam dados 
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        
        // Tenta pegar o ID e Nome do usuário
        const userId = req.user ? req.user.id : 'Não autenticado';
        const userName = req.user ? req.user.nome : 'Anônimo';
        const userType = req.user ? req.user.tipo_usuario : 'N/A';

        // Detalhes da requisição
        const actionLog = {
            usuario_id: userId,
            nome: userName,
            tipo: userType,
            metodo: req.method,
            rota: req.originalUrl,
            status_resposta: res.statusCode,
            ip: req.ip || req.connection.remoteAddress
        };

        // Se deu erro, loga como warn/error, senão como info
        if (res.statusCode >= 400) {
            logger.warn(`Ação Falha: ${req.method} ${req.originalUrl}`, actionLog);
        } else {
            logger.info(`Ação Concluída: ${req.method} ${req.originalUrl}`, actionLog);
        }
    }

    return res.send(body);
  };

  next();
};

module.exports = auditMiddleware;