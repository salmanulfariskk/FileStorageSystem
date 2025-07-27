# Cloud Storage Application

This project is a full-stack cloud storage application with a Next.js frontend and an Express.js backend, integrated with MongoDB for database storage, AWS S3 for file storage, and Google OAuth for authentication.

## Setup Steps

### Prerequisites
- **Node.js** (v18 or higher)
- **MongoDB** (local or MongoDB Atlas)
- **AWS Account** with S3 bucket configured
- **Google Cloud Console** project with OAuth 2.0 credentials
- **Git** (for cloning the repository)

### Tech Stack

## Frontend: 
Next.js, React, Tailwind CSS, Framer Motion

## Backend: 
Node.js, Express, MongoDB, AWS S3

## Authentication: 
JWT, Google OAuth2

## File Handling: 
express-fileupload, AWS S3 SDK


### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/salmanulfariskk/FileStorageSystem.git
   cd FileStorageSystem
   ```

2. **Set Up the Backend**
   - Navigate to the backend directory:
     ```bash
     cd server
     ```
   - Install dependencies:
     ```bash
     npm install
     ```
   - Create a `.env` file in the `backend` directory based on the `.env.example` (see below).
   - Start the backend server:
     ```bash
     npm run dev
     ```
     The backend will run on `http://localhost:5000` by default.

3. **Set Up the Frontend**
   - Navigate to the frontend directory:
     ```bash
     cd client
     ```
   - Install dependencies:
     ```bash
     npm install
     ```
   - Create a `.env.local` file in the `frontend` directory based on the `.env.local.example` (see below).
   - Start the frontend development server:
     ```bash
     npm run dev
     ```
     The frontend will run on `http://localhost:3000` by default.

4. **Configure Environment Variables**
   - See the `.env.example` and `.env.local.example` sections below for the required environment variables.
   - Replace placeholder values (e.g., `<your-jwt-secret>`) with actual values from your MongoDB, AWS, and Google Cloud setups.

5. **Run the Application**
   - Ensure MongoDB is running (locally or via Atlas).
   - Start both the backend and frontend servers.
   - Access the application at `http://localhost:3000`.

### Running in Production
- For the backend:
  ```bash
  npm run dev
  ```
- For the frontend:
  ```bash
  npm run build
  npm run dev
  ```
### Production Git Repo and URL's
- Github(main):
  ```bash
 https://github.com/salmanulfariskk/FileStorageSystem
  ```

- Live URL: [https://secure-file-storage-five.vercel.app](https://secure-file-storage-five.vercel.app)

  ```

## API Documentation

The backend provides RESTful API endpoints for authentication and file/folder management.

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints (`/api/auth`)

#### `POST /register`
- **Description**: Register a new user with username, email, and password.
- **Request Body**:
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string"
  }
  ```
- **Responses**:
  - `200`: `{ accessToken: string, refreshToken: string }`
  - `400`: `{ message: "Username or email already exists" }`
  - `500`: `{ message: "Server error" }`

#### `POST /login`
- **Description**: Log in a user with username/email and password.
- **Request Body**:
  ```json
  {
    "identifier": "string",
    "password": "string"
  }
  ```
- **Responses**:
  - `200`: `{ accessToken: string, refreshToken: string }`
  - `400`: `{ message: "Invalid credentials" | "Account uses Google login" }`
  - `500`: `{ message: "Server error" }`

#### `POST /google`
- **Description**: Log in or register a user via Google OAuth.
- **Request Body**:
  ```json
  {
    "token": "string"
  }
  ```
- **Responses**:
  - `200`: `{ accessToken: string, refreshToken: string }`
  - `401`: `{ message: "Invalid Google token" }`
  - `500`: `{ message: "Server error" }`

#### `POST /refresh-token`
- **Description**: Refresh an access token using a refresh token.
- **Request Body**:
  ```json
  {
    "refreshToken": "string"
  }
  ```
- **Responses**:
  - `200`: `{ accessToken: string }`
  - `401`: `{ message: "No refresh token" | "Refresh token invalidated" | "Invalid refresh token" }`
  - `500`: `{ message: "Server error" }`

#### `POST /logout`
- **Description**: Log out a user by invalidating the refresh token.
- **Request Body**:
  ```json
  {
    "refreshToken": "string"
  }
  ```
- **Responses**:
  - `200`: `{ message: "Logged out successfully" }`
  - `500`: `{ message: "Server error" }`

### File/Folder Endpoints (`/api/files`)

*All endpoints require authentication via JWT in the `Authorization` header (`Bearer <accessToken>`).*

#### `POST /folders`
- **Description**: Create a new folder.
- **Request Body**:
  ```json
  {
    "name": "string",
    "parentId": "string" // optional
  }
  ```
- **Responses**:
  - `201`: `{ folder: object }`
  - `400`: `{ message: "Folder name is required" }`
  - `404`: `{ message: "Parent folder not found" }`
  - `500`: `{ message: "Error creating folder" }`

#### `POST /upload`
- **Description**: Upload a file to AWS S3.
- **Request Body**: Form-data with `file` (file) and optional `folderId` (string).
- **Responses**:
  - `201`: `{ file: object }`
  - `400`: `{ message: "No file uploaded" }`
  - `404`: `{ message: "Folder not found or does not belong to user" }`
  - `500`: `{ message: "Error uploading file" }`

#### `GET /`
- **Description**: Get files and folders for the authenticated user.
- **Query Parameters**:
  - `folderId`: string (optional)
  - `page`: number (default: 1)
  - `limit`: number (default: 20)
- **Responses**:
  - `200`: `{ files: array, folders: array }`
  - `500`: `{ message: "Error fetching files and folders" }`

#### `GET /recent`
- **Description**: Get recent files and folders for the authenticated user.
- **Query Parameters**:
  - `limit`: number (default: 10)
- **Responses**:
  - `200`: `array` (combined files and folders)
  - `500`: `{ message: "Error fetching recent files and folders" }`

#### `GET /folders/:id`
- **Description**: Get a specific folder by ID.
- **Parameters**:
  - `id`: string (folder ID)
- **Responses**:
  - `200`: `{ folder: object }`
  - `404`: `{ message: "Folder not found" }`
  - `500`: `{ message: "Error fetching folder" }`

#### `DELETE /folders/:id`
- **Description**: Delete a folder by ID (only if empty).
- **Parameters**:
  - `id`: string (folder ID)
- **Responses**:
  - `200`: `{ message: "Folder deleted successfully" }`
  - `400`: `{ message: "Folder is not empty" }`
  - `404`: `{ message: "Folder not found" }`
  - `500`: `{ message: "Error deleting folder" }`

#### `GET /:id`
- **Description**: Get a specific file by ID.
- **Parameters**:
  - `id`: string (file ID)
- **Responses**:
  - `200`: `{ file: object }`
  - `404`: `{ message: "File not found" }`
  - `500`: `{ message: "Error fetching file" }`

#### `DELETE /:id`
- **Description**: Delete a file by ID from MongoDB and AWS S3.
- **Parameters**:
  - `id`: string (file ID)
- **Responses**:
  - `200`: `{ message: "File deleted successfully" }`
  - `404`: `{ message: "File not found" }`
  - `500`: `{ message: "Error deleting file" }`

#### `GET /export/:id`
- **Description**: Get a presigned URL for downloading a file.
- **Parameters**:
  - `id`: string (file ID)
- **Responses**:
  - `200`: `{ url: string, filename: string }`
  - `404`: `{ message: "File not found" }`
  - `500`: `{ message: "Error generating download URL" }`

## Sample Environment Files

### `.env.example` (Backend)
```env
# MongoDB Connection URI
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/?retryWrites=true&w=majority&appName=<app-name>

# JWT Secret
JWT_SECRET=<your-jwt-secret>

# AWS Configuration
AWS_ACCESS_KEY_ID=<your-aws-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-access-key>
AWS_REGION=<your-aws-region>
S3_BUCKET_NAME=<your-s3-bucket-name>

# Google OAuth Credentials
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

# Server Port
PORT=5000
```

### `.env.local.example` (Frontend)
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-google-client-id>
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```



## Notes
- Ensure MongoDB, AWS S3, and Google OAuth credentials are correctly configured before running the application.
- The frontend uses Next.js with Turbopack for development and Tailwind CSS for styling.
- The backend uses Express.js with MongoDB for data persistence and AWS S3 for file storage.
- Authentication is handled via JWT and Google OAuth, with refresh tokens for session management.
- Files and folders are scoped to the authenticated user, ensuring data isolation.