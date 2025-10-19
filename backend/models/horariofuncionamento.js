'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class HorarioFuncionamento extends Model {}
  HorarioFuncionamento.init({
    dia_semana: DataTypes.STRING,
    horario_abertura: DataTypes.TIME,
    horario_fechamento: DataTypes.TIME,
    fechado: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'HorarioFuncionamento',
    tableName: 'HorariosFuncionamento'
  });
  return HorarioFuncionamento;
};