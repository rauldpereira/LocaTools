'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ItemReserva extends Model {
    static associate(models) {
      ItemReserva.belongsTo(models.OrdemDeServico, {
        foreignKey: 'id_ordem_servico',
      });
      ItemReserva.belongsTo(models.Unidade, {
        foreignKey: 'id_unidade',
      });
    }
  }
  ItemReserva.init({
    id_ordem_servico: {
      type: DataTypes.INTEGER,
      references: {
        model: 'OrdensDeServico',
        key: 'id',
      },
    },
    id_unidade: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Unidades',
        key: 'id',
      },
    },
    data_inicio: {
      type: DataTypes.DATE,
      allowNull: false
    },
    data_fim: {
      type: DataTypes.DATE,
      allowNull: false
    },
  }, {
    sequelize,
    modelName: 'ItemReserva',
    tableName: 'ItensReserva'
  });
  return ItemReserva;
};