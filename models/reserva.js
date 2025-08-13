'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Reserva extends Model {
    static associate(models) {
      Reserva.belongsTo(models.Usuario, {
        foreignKey: 'id_usuario',
      });

      Reserva.belongsTo(models.Equipamento, {
        foreignKey: 'id_equipamento',
      });

      Reserva.hasOne(models.Pagamento, {
        foreignKey: 'id_reserva',
      });
      
      Reserva.hasOne(models.Entrega, {
        foreignKey: 'id_reserva',
      });

      Reserva.hasMany(models.Vistoria, {
        foreignKey: 'id_reserva',
      });
    }
  }
  Reserva.init({
    id_usuario: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Usuarios',
        key: 'id',
      },
    },
    id_equipamento: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Equipamentos',
        key: 'id',
      },
    },
    data_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    data_fim: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pendente', 'aprovada', 'cancelada', 'entregue', 'devolvida', 'finalizada'),
      allowNull: false,
    },
    data_criacao: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    sequelize,
    modelName: 'Reserva',
  });
  return Reserva;
};