'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Pagamento extends Model {
    static associate(models) {
      Pagamento.belongsTo(models.Reserva, {
        foreignKey: 'id_reserva',
      });
    }
  }
  Pagamento.init({
    id_reserva: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Reservas',
        key: 'id',
      },
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status_pagamento: {
      type: DataTypes.ENUM('aprovado', 'recusado', 'pendente'),
      allowNull: false,
    },
    data_pagamento: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    id_transacao_externa: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Pagamento',
  });
  return Pagamento;
};