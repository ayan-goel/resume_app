# Resume Database Backend

This is the backend API for the Resume Database application. It provides endpoints for uploading, searching, and managing resumes, along with authentication for admin users.

## Technologies Used

- Node.js
- Express.js
- PostgreSQL
- Sequelize ORM
- JWT Authentication
- AWS S3 for file storage
- Multer for file uploads

## Getting Started

### Prerequisites

- Node.js 14+
- PostgreSQL database
- AWS S3 bucket and credentials

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database Configuration
   DB_HOST=localhost
   DB_USER=postgres
   DB_PASS=postgres
   DB_NAME=resume_db
   DB_PORT=5432

   # JWT Secret
   JWT_SECRET=your_jwt_secret_key_here

   # AWS S3 Configuration
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=your-resume-bucket

   # Misc
   UPLOAD_LIMIT=10
   ```

4. Run database migrations and seed the database:
   ```
   npm run seed
   ```

5. Start the development server:
   ```
   npm run dev
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with email and password
- `GET /api/auth/profile` - Get current user profile (requires authentication)

### Resumes

- `GET /api/resumes/search` - Search resumes with filtering
- `GET /api/resumes/filters` - Get available filters (majors, companies, years)
- `GET /api/resumes/:id` - Get resume by ID
- `POST /api/resumes` - Upload a new resume (requires authentication)
- `PUT /api/resumes/:id` - Update a resume (requires authentication)
- `DELETE /api/resumes/:id` - Delete a resume (requires authentication)

## Development

### Scripts

- `npm start` - Start the server in production mode
- `npm run dev` - Start the server in development mode with hot reloading
- `npm run seed` - Seed the database with initial data

## Default Admin User

After running the seed script, you can login with the following credentials:
- Email: admin@example.com
- Password: admin123 