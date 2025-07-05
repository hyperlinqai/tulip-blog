const { PrismaClient } = require('@prisma/client');

// Initialize Prisma with error handling
let prisma;
try {
  prisma = new PrismaClient();
  console.log('Database connection initialized');
} catch (error) {
  console.warn('Database connection failed, running in limited mode:', error);
}

module.exports = { prisma };