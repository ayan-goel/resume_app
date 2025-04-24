# Business Fraternity Resume Database

A web application for managing and searching through a collection of member resumes for a business fraternity.

## Features

- **Resume Search**: Search for resumes by name, major, companies, or keywords
- **Filtering**: Filter resumes by major, company, and graduation year
- **PDF Viewing**: View and download resumes directly in the browser
- **Admin Upload**: Secure admin portal for uploading new resumes with metadata
- **Authentication**: Basic authentication to protect the admin area

## Tech Stack

- **Frontend**: Next.js with JavaScript and Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Storage**: AWS S3
- **Deployment**: Vercel and AWS EC2

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
   ```
   git clone <repository-url>
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Run the development server
   ```
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### User Access

- Visit the homepage and click "Search Resumes" to browse the resume database
- Use the search bar to find specific resumes
- Apply filters to narrow down results
- Click "View PDF" to view a resume directly in the browser

### Admin Access

- Click "Admin Login" from the homepage
- Use the demo credentials:
  - Email: admin@example.com
  - Password: admin123
- Once logged in, access the upload page to add new resumes

## Next Steps

- Implement backend API with Express.js
- Set up PostgreSQL database for storing resume metadata
- Integrate AWS S3 for PDF storage
- Implement full-text search functionality
- Add more robust authentication with JWT tokens
- Create user management for admins

## License

This project is licensed under the MIT License.
