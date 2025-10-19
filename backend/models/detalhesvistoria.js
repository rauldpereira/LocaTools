'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DetalhesVistoria extends Model {
    static associate(models) {
      DetalhesVistoria.belongsTo(models.Vistoria, {
        foreignKey: 'id_vistoria',
      });
      DetalhesVistoria.belongsTo(models.Unidade, {
        foreignKey: 'id_unidade',
        field: 'id_item_equipamento'
      });
      DetalhesVistoria.hasMany(models.AvariasEncontradas, {
        foreignKey: 'id_detalhe_vistoria',
        as: 'avariasEncontradas'
      });
    }
  }
  DetalhesVistoria.init({
    id_vistoria: {
      type: DataTypes.INTEGER,
      references: { model: 'Vistorias', key: 'id' },
    },
    id_unidade: {
      type: DataTypes.INTEGER,
      field: 'id_item_equipamento',
      references: {
        model: 'Unidades',
        key: 'id',
      },
    },
    condicao: {
      type: DataTypes.ENUM('ok', 'danificado'),
      allowNull: false,
    },
    foto: DataTypes.JSON,
    comentarios: DataTypes.TEXT,
  }, {
    sequelize,
    modelName: 'DetalhesVistoria',
    tableName: 'DetalhesVistoria'
  });
  return DetalhesVistoria;
};

