'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MesPublicado extends Model {
    static associate(models) {
    }
  }
  
  MesPublicado.init({
    ano: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    mes: { 
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 12
      }
    },
    publicado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'MesPublicado',
    tableName: 'MesesPublicados',
    indexes: [
      {
        unique: true,
        fields: ['ano', 'mes'],
        name: 'idx_ano_mes_unico' 
      }
    ]
  });
  
  return MesPublicado;
};