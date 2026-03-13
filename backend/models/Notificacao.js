const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Notificacao extends Model {
    static associate(models) {
      // Uma notificação pertence a um usuário
      Notificacao.belongsTo(models.Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
    }
  }
  
  Notificacao.init({
    usuario_id: DataTypes.INTEGER,
    titulo: DataTypes.STRING,
    mensagem: DataTypes.TEXT,
    lida: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    link_redirecionamento: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Notificacao',
    tableName: 'Notificacoes'
  });
  
  return Notificacao;
};