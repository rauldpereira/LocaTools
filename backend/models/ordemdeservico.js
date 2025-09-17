'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class OrdemDeServico extends Model {
    static associate(models) {
      OrdemDeServico.belongsTo(models.Usuario, {
        foreignKey: 'id_usuario',
      });
      OrdemDeServico.hasMany(models.ItemReserva, {
        foreignKey: 'id_ordem_servico',
      });
      OrdemDeServico.hasMany(models.Pagamento, {
        foreignKey: 'id_ordem_servico',
        as: 'Pagamentos'
      });
      OrdemDeServico.hasMany(models.Entrega, {
        foreignKey: 'id_ordem_servico',
        as: 'Entregas'
      });
      OrdemDeServico.hasMany(models.Vistoria, {
        foreignKey: 'id_ordem_servico',
        as: 'Vistorias'
      });
    }
  }

  OrdemDeServico.init({
    id_usuario: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Usuarios',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('pendente', 'aprovada', 'cancelada', 'entregue', 'devolvida', 'finalizada'),
      allowNull: false
    },
    data_criacao: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    data_inicio: {
      type: DataTypes.DATE,
      allowNull: false
    },
    data_fim: {
      type: DataTypes.DATE,
      allowNull: false
    },
    valor_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'OrdemDeServico',
    tableName: 'OrdensDeServico'
  });
  return OrdemDeServico;
};