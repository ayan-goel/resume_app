// Import the AWS SDK v3 S3 client
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

// Configure AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const bucketName = process.env.AWS_S3_BUCKET;

// Upload a file to S3
const uploadFile = async (fileBuffer, key, contentType) => {
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
    ACL: 'public-read' // Make the file publicly accessible
  };

  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
};

// Delete a file from S3
const deleteFile = async (key) => {
  const params = {
    Bucket: bucketName,
    Key: key
  };

  try {
    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting from S3:', error);
    throw error;
  }
};

// Get a signed URL for a file (time-limited access to a file)
const generateSignedUrl = async (key, expirationInSeconds = 60) => {
  const params = {
    Bucket: bucketName,
    Key: key
  };

  try {
    const command = new GetObjectCommand(params);
    // Create a signed URL that expires after the specified time
    const url = await getSignedUrl(s3Client, command, { expiresIn: expirationInSeconds });
    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};

module.exports = {
  uploadFile,
  deleteFile,
  generateSignedUrl
}; 