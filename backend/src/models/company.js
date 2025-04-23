module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define('Company', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  });

  // Associate the Company model with other models
  Company.associate = function(models) {
    // A company can be associated with many resumes
    Company.belongsToMany(models.Resume, {
      through: 'ResumeCompanies',
      foreignKey: 'companyId',
      as: 'resumes'
    });
  };

  return Company;
}; 