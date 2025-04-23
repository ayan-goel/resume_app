module.exports = (sequelize, DataTypes) => {
  const Keyword = sequelize.define('Keyword', {
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

  // Associate the Keyword model with other models
  Keyword.associate = function(models) {
    // A keyword can be associated with many resumes
    Keyword.belongsToMany(models.Resume, {
      through: 'ResumeKeywords',
      foreignKey: 'keywordId',
      as: 'resumes'
    });
  };

  return Keyword;
}; 