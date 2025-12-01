'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Prejuizo extends Model {
    static associate(models) {
      Prejuizo.belongsTo(models.ItemReserva, {
        foreignKey: 'item_reserva_id',
        as: 'itemReserva'
      });
    }
  }

  Prejuizo.init({
    tipo: {
      type: DataTypes.ENUM('ROUBO', 'CALOTE', 'AVARIA', 'EXTRAVIO', 'OUTRO'),
      allowNull: false
    },
    valor_prejuizo: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    resolvido: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    data_resolucao: {
      type: DataTypes.DATE,
      allowNull: true
    },
    forma_recuperacao: {
      type: DataTypes.STRING, 
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Prejuizo',
    tableName: 'Prejuizos',
  });

  return Prejuizo;
};