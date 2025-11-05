'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DiasExcecoes extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here if needed
    }
  }
  DiasExcecoes.init({
    data: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: true
    },
    tipo: {
      type: DataTypes.ENUM('feriado', 'parada', 'extra', 'outro'),
      allowNull: false,
      defaultValue: 'outro'
    },
    funcionamento: {
      type: DataTypes.BOOLEAN, 
      allowNull: false
    },
    descricao: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'DiasExcecoes',
    tableName: 'dias_excecoes'
  });
  return DiasExcecoes;
};