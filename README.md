# Tulip Blog - Blog CMS Backend API

A standalone backend API for a headless CMS built with Node.js, Express, PostgreSQL, and Prisma.

## Features

- RESTful API design
- JWT authentication
- Role-based access control (RBAC)
- PostgreSQL database with Prisma ORM
- Media management with Cloudinary
- Rate limiting and security headers
- CORS support

## Requirements

- Node.js 18+ 
- PostgreSQL 12+
- Cloudinary account (for media uploads)

## Quick Start

1. **Clone and Install**
   ```bash
   git clone <your-repo-url>
   cd blog-backend-standalone
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**
   ```bash
   # Generate Prisma client
   npm run prisma:generate
   
   # Run migrations
   npm run prisma:migrate
   
   # Seed database (optional)
   npm run prisma:seed
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `JWT_EXPIRES_IN` | JWT token expiration time | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `POST /api/v1/auth/logout` - User logout

### Posts
- `GET /api/v1/posts` - Get all posts (public)
- `GET /api/v1/posts/:id` - Get single post (public)
- `POST /api/v1/posts` - Create post (auth required)
- `PUT /api/v1/posts/:id` - Update post (auth required)
- `DELETE /api/v1/posts/:id` - Delete post (auth required)

### Categories
- `GET /api/v1/categories` - Get all categories
- `POST /api/v1/categories` - Create category (admin only)
- `PUT /api/v1/categories/:id` - Update category (admin only)
- `DELETE /api/v1/categories/:id` - Delete category (admin only)

### Media
- `POST /api/v1/media/upload` - Upload media file (auth required)
- `DELETE /api/v1/media/:id` - Delete media file (auth required)

## Deployment

### Deploy to Heroku

1. Install Heroku CLI
2. Create Heroku app:
   ```bash
   heroku create your-app-name
   ```

3. Add PostgreSQL:
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```

4. Set environment variables:
   ```bash
   heroku config:set JWT_SECRET=your-secret-key
   heroku config:set CLOUDINARY_CLOUD_NAME=your-cloud-name
   # Set other required env vars
   ```

5. Deploy:
   ```bash
   git push heroku main
   heroku run npm run prisma:migrate:prod
   ```

### Deploy to Railway

1. Connect your GitHub repo to Railway
2. Add PostgreSQL database service
3. Set environment variables in Railway dashboard
4. Deploy will happen automatically

### Deploy to DigitalOcean App Platform

1. Create new app in DigitalOcean
2. Connect GitHub repo
3. Add PostgreSQL database
4. Configure environment variables
5. Set build command: `npm run setup`
6. Set run command: `npm start`

### Deploy with Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npm run prisma:generate

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t blog-backend .
docker run -p 3000:3000 --env-file .env blog-backend
```

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secret (32+ characters)
- [ ] Configure CORS for your frontend domain
- [ ] Enable rate limiting
- [ ] Set up monitoring (e.g., PM2, New Relic)
- [ ] Configure proper logging
- [ ] Set up SSL/TLS
- [ ] Regular database backups

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server
- `npm run setup` - Install deps and generate Prisma client
- `npm run setup:full` - Full setup including migrations and seed
- `npm run prisma:migrate:prod` - Run production migrations
- `npm run lint` - Run ESLint
- `npm test` - Run tests

## License

MIT
