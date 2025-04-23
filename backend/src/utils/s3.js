// Import the AWS SDK v3 S3 client
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const dotenv = require("dotenv");

dotenv.config();

// Ensure required environment variables are set
const requiredEnv = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_BUCKET_NAME', 'AWS_REGION'];
requiredEnv.forEach(key => {
  if (!process.env[key]) {
    console.error(`FATAL ERROR: Environment variable ${key} is not defined.`);
    process.exit(1);
  }
});

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

// Initialize S3 client with region and credentials
const s3Client = new S3Client({
  region: region, // Explicitly set the region
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey
  }
});

// Upload a file to S3
const uploadFile = async (fileBuffer, key, contentType) => {
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  };

  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
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
    console.log(`Successfully deleted ${key} from S3`);
  } catch (error) {
    console.error(`Error deleting ${key} from S3:`, error);
    // Decide if you want to throw the error or just log it
    // throw error;
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
  generateSignedUrl,
  s3Client // Export the client for presigning
}; 