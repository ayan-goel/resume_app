module.exports = (sequelize, DataTypes) => {
  const Resume = sequelize.define('Resume', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    major: {
      type: DataTypes.STRING,
      allowNull: false
    },
    graduationYear: {
      type: DataTypes.STRING,
      allowNull: false
    },
    pdfUrl: {
      type: DataTypes.STRING,
      allowNull: false
    },
    s3Key: {
      type: DataTypes.STRING,
      allowNull: false
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  });

  // Associate the Resume model with other models
  Resume.associate = function(models) {
    // A resume belongs to a user who uploaded it
    Resume.belongsTo(models.User, {
      foreignKey: 'uploadedBy',
      as: 'uploader'
    });

    // A resume can have many companies
    Resume.belongsToMany(models.Company, {
      through: 'ResumeCompanies',
      foreignKey: 'resumeId',
      as: 'companies'
    });

    // A resume can have many keywords
    Resume.belongsToMany(models.Keyword, {
      through: 'ResumeKeywords',
      foreignKey: 'resumeId',
      as: 'keywords'
    });
  };

  return Resume;
}; 