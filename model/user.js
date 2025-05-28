const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true // Permitir null para login social
    },
    role: {
      type: DataTypes.ENUM('admin', 'operador', 'visualizador'),
      defaultValue: 'visualizador'
    },
    googleId: DataTypes.STRING,
    facebookId: DataTypes.STRING
  });

  return User;
};