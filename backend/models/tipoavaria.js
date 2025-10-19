'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TipoAvaria extends Model {
    static associate(models) {
      TipoAvaria.belongsTo(models.Equipamento, {
        foreignKey: 'id_equipamento',
      });
    }
  }
  TipoAvaria.init({
    descricao: DataTypes.STRING,
    preco: DataTypes.DECIMAL(10, 2),
    id_equipamento: DataTypes.INTEGER,
    is_default: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'TipoAvaria',
    tableName: 'TiposAvaria'
  });
  return TipoAvaria;
};