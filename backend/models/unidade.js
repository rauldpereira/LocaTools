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

      Unidade.hasMany(models.DetalhesVistoria, {
        foreignKey: 'id_unidade',
        as: 'Vistorias'
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
    },
    avarias_atuais: {
      type: DataTypes.JSON,
      allowNull: true
    },
    codigo_serial: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },
  }, {
    sequelize,
    modelName: 'Unidade',
  });
  return Unidade;
};