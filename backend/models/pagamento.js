'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Pagamento extends Model {
    static associate(models) {

      Pagamento.belongsTo(models.OrdemDeServico, {
        foreignKey: 'id_ordem_servico',
      });
    }
  }
  Pagamento.init({
    id_ordem_servico: {
      type: DataTypes.INTEGER,
      references: {
        model: 'OrdensDeServico',
        key: 'id',
      },
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status_pagamento: {
      type: DataTypes.ENUM('aprovado', 'recusado', 'pendente'),
      allowNull: false
    },
    data_pagamento: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    id_transacao_externa: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Pagamento',
  });
  return Pagamento;
};