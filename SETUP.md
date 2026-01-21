# Setup Guide - WeRgame

Complete setup instructions for running the WeRgame platform locally.

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **MongoDB** - [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **npm** (comes with Node.js) or **yarn**
- **Git** (optional, for cloning)

## Quick Start

### 1. Clone/Download the Project

If using Git:
```bash
git clone <repository-url>
cd wergame
```

Or download and extract the project files.

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
# Copy the content below or create from .env.example
```

Create `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/wergame
JWT_SECRET=your-secret-key-change-this-in-production
```

**For MongoDB Atlas (Cloud):**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/wergame
```

```bash
# Seed the database with dummy data
npm run seed

# Start the backend server
npm start

# Or for development with auto-reload:
npm run dev
```

The backend should now be running at `http://localhost:5000`

### 3. Frontend Setup

Open a new terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file
```

Create `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

```bash
# Start the frontend development server
npm start
```

The frontend should now open at `http://localhost:3000`

## Verification

### Test Accounts

After running the seed script, you can use these accounts:

**Admin:**
- Email: `admin@wergame.com`
- Password: `admin123`

**SuperAdmin:**
- Email: `superadmin@wergame.com`
- Password: `superadmin123`

**Regular User:**
- Email: `test@wergame.com`
- Password: `test123`

### Testing the Application

1. **Home Page**: Should display cups/tournaments
2. **Login**: Use test account credentials
3. **Tournament**: Click on "World Cup" to see matches
4. **Prediction**: Click on a match and select Free/Boost/Market
5. **Admin**: Login as admin to access admin dashboard

## MongoDB Setup

### Local MongoDB

1. Install MongoDB Community Edition
2. Start MongoDB service:
   ```bash
   # Windows
   net start MongoDB
   
   # macOS/Linux
   sudo systemctl start mongod
   ```
3. MongoDB will run on `mongodb://localhost:27017`

### MongoDB Atlas (Cloud)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get connection string
4. Update `MONGODB_URI` in `backend/.env`

## Troubleshooting

### Backend Issues

**MongoDB Connection Error:**
- Ensure MongoDB is running
- Check `MONGODB_URI` in `.env` file
- For Atlas, check network access and credentials

**Port Already in Use:**
- Change `PORT` in `backend/.env`
- Or stop the process using port 5000

### Frontend Issues

**API Connection Error:**
- Ensure backend is running
- Check `REACT_APP_API_URL` in `frontend/.env`
- Check browser console for CORS errors

**Build Errors:**
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear npm cache: `npm cache clean --force`

### Common Issues

**Module Not Found:**
```bash
# Delete node_modules and package-lock.json, then reinstall
rm -rf node_modules package-lock.json
npm install
```

**Port Conflicts:**
- Backend: Change `PORT` in `backend/.env`
- Frontend: Change port in `package.json` scripts or use environment variable

## Development Workflow

1. Start MongoDB (if local)
2. Start backend: `cd backend && npm run dev`
3. Start frontend: `cd frontend && npm start`
4. Open browser to `http://localhost:3000`

## Production Build

### Backend
```bash
cd backend
npm start
```

### Frontend
```bash
cd frontend
npm run build
# Serve the build folder with a static server
```

## Next Steps

- Review the main [README.md](./README.md) for API documentation
- Check [frontend/README.md](./frontend/README.md) for frontend details
- Smart contract integration will be done in the next phase

## Support

For issues or questions:
1. Check the main README.md for documentation
2. Review API endpoints and smart contract functions
3. Check browser console and server logs for errors
