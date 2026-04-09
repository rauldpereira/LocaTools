'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ConfigLoja extends Model {
    static associate(models) {
    }
  }
  ConfigLoja.init({
    fidelidade_num_pedidos: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10
    },
    fidelidade_desconto_pct: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 10.00
    }
  }, {
    sequelize,
    modelName: 'ConfigLoja',
    tableName: 'ConfigLoja'
  });
  return ConfigLoja;
};