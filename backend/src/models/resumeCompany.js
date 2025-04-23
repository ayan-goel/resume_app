module.exports = (sequelize, DataTypes) => {
  const ResumeCompany = sequelize.define('ResumeCompany', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    resumeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Resumes',
        key: 'id'
      }
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Companies',
        key: 'id'
      }
    }
  });

  return ResumeCompany;
}; 