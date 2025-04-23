module.exports = (sequelize, DataTypes) => {
  const ResumeKeyword = sequelize.define('ResumeKeyword', {
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
    keywordId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Keywords',
        key: 'id'
      }
    }
  });

  return ResumeKeyword;
}; 