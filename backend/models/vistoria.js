'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Vistoria extends Model {
    static associate(models) {
      // Vistoria pertence a uma OrdemDeServico
      Vistoria.belongsTo(models.OrdemDeServico, {
        foreignKey: 'id_ordem_servico',
      });
      // Vistoria pertence a um Usuario
      Vistoria.belongsTo(models.Usuario, {
        foreignKey: 'id_responsavel_vistoria',
      });
      // Vistoria tem muitos DetalhesVistoria
      Vistoria.hasMany(models.DetalhesVistoria, {
        foreignKey: 'id_vistoria',
      });
    }
  }
  Vistoria.init({
    id_ordem_servico: {
      type: DataTypes.INTEGER,
      references: {
        model: 'OrdensDeServico',
        key: 'id',
      },
    },
    id_responsavel_vistoria: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Usuarios',
        key: 'id',
      },
    },
    tipo_vistoria: {
      type: DataTypes.ENUM('entrega', 'devolucao'),
      allowNull: false,
    },
    data: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    sequelize,
    modelName: 'Vistoria',
  });
  return Vistoria;
};