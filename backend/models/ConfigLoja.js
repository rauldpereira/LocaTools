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
    },
    fidelidade_ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    horario_limite_hoje: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '12:00'
    },
    cnpj: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '00.000.000/0001-00'
    },
    taxa_reagendamento: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    }
  }, {
    sequelize,
    modelName: 'ConfigLoja',
    tableName: 'ConfigLoja'
  });
  return ConfigLoja;
};