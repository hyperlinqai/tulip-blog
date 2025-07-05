const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Create test admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@blogcms.com' },
    update: {},
    create: {
      email: 'admin@blogcms.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Admin user created:', adminUser);

  // Create a test category
  const category = await prisma.category.upsert({
    where: { slug: 'general' },
    update: {},
    create: {
      name: 'General',
      slug: 'general',
      description: 'General blog posts',
    },
  });

  console.log('✅ Category created:', category);

  // Create a test post
  const post = await prisma.post.upsert({
    where: { slug: 'welcome-to-blog-cms' },
    update: {},
    create: {
      title: 'Welcome to Blog CMS',
      slug: 'welcome-to-blog-cms',
      excerpt: 'This is your first blog post using the new CMS!',
      content: `# Welcome to Blog CMS

This is your first blog post! You can edit this content and create new posts from the admin panel.

## Features

- Rich text editing
- SEO optimization
- Media management
- Category and tag organization

Enjoy writing!`,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      authorId: adminUser.id,
      categoryId: category.id,
      metaTitle: 'Welcome to Blog CMS',
      metaDescription: 'Your first blog post using the new CMS system',
    },
  });

  console.log('✅ Post created:', post);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });