# Smart Alcohol Sale Regulation & Rationing System

A full-stack centralized web application to regulate alcohol sales at the point of sale (POS), enforce real-time per-user consumption quotas, provide an authority monitoring dashboard, and maintain secure transaction logs.

## Architecture Highlights
- Frontend: React + Tailwind CSS
- Backend: Node.js + Express
- Database: MySQL (Relational structure) + MongoDB (Logs & Analytics Metadata)
- Security: JWT-based Role Access Control (Authority, Shop, Buyer), Bcrypt hashing.
- Deployment: Docker & docker-compose ready.

## Setup Instructions

1. **Start the Database Infrastructure**
   Ensure Docker and Docker-Compose are installed on your machine.
   Run the following command at the root of the project to start MySQL and MongoDB:
   ```bash
   docker-compose up -d
   ```
   Note: On first boot, the `schema.sql` will automatically populate the MySQL database.

2. **Setup the Backend**
   ```bash
   cd backend
   npm install
   # Create a .env file from the example
   cp .env.example .env
   # Start the development server
   npm run dev
   ```

3. **Setup the Frontend**
   ```bash
   cd frontend
   npm install
   # Start the frontend using Vite
   npm run dev
   ```

## Dummy Testing Data
Once the initial boot is done, you can test the APIs or use the frontend interface. The schema initializes a standard policy format. You can register users through the API (`POST /api/auth/register`) assigning them `authority`, `shop`, or `buyer` roles.

## Environment Variables
Check the `.env.example` provided in both frontend and backend directories to configure ports and database connection strings if using without Docker.
