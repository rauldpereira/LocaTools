'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Unidade extends Model {
    static associate(models) {
      Unidade.belongsTo(models.Equipamento, {
        foreignKey: 'id_equipamento',
        onDelete: 'CASCADE',
        as: 'Equipamento'
      });

      Unidade.hasMany(models.ItemReserva, {
        foreignKey: 'id_unidade',
        as: 'ItensReserva'
      });
    }
  }
  Unidade.init({
    id_equipamento: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Equipamentos',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('disponivel', 'alugado', 'manutencao'),
      defaultValue: 'disponivel'
    }
  }, {
    sequelize,
    modelName: 'Unidade',
  });
  return Unidade;
};