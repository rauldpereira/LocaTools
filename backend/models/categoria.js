'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Categoria extends Model {
    static associate(models) {
      Categoria.hasMany(models.Equipamento, {
        foreignKey: 'id_categoria',
        as: 'Equipamentos'
      });
    }
  }
  Categoria.init({
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    sequelize,
    modelName: 'Categoria',
    tableName: 'Categorias',
  });
  return Categoria;
};