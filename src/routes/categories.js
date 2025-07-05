const { Router } = require('express');
const { prisma } = require('../db');
const { authenticateToken, requireAuthor, requireAdmin } = require('../middleware/auth');

const router = Router();

// Generate slug from name
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 100);
};

// Get all categories (public)
router.get('/', async (req, res) => {
  try {
    const includePosts = req.query.includePosts === 'true';
    const includeCount = req.query.includeCount === 'true';

    const categories = await prisma.category.findMany({
      include: {
        ...(includePosts && {
          CategoryToPost: {
            where: { posts: { status: 'PUBLISHED' } },
            select: {
              posts: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  excerpt: true,
                  publishedAt: true
                }
              }
            },
            orderBy: { posts: { publishedAt: 'desc' } },
            take: 5
          }
        }),
        ...(includeCount && {
          _count: {
            select: {
              CategoryToPost: {
                where: { posts: { status: 'PUBLISHED' } }
              }
            }
          }
        })
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get single category by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        CategoryToPost: {
          where: { posts: { status: 'PUBLISHED' } },
          include: {
            posts: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                },
                PostToTag: {
                  select: {
                    tags: {
                      select: {
                        id: true,
                        name: true,
                        slug: true
                      }
                    }
                  }
                }
              }
            }
          },
          skip: offset,
          take: limit,
          orderBy: { posts: { publishedAt: 'desc' } }
        },
        _count: {
          select: {
            CategoryToPost: {
              where: { posts: { status: 'PUBLISHED' } }
            }
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const totalPosts = category._count.CategoryToPost;
    
    res.json({
      success: true,
      data: {
        category: {
          ...category,
          pagination: {
            page,
            limit,
            total: totalPosts,
            pages: Math.ceil(totalPosts / limit)
          }
        }
      }
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Create new category
router.post('/', authenticateToken, requireAuthor, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }

    // Generate slug from name
    let slug = generateSlug(name);
    
    // Ensure slug is unique
    let counter = 1;
    let originalSlug = slug;
    while (await prisma.category.findUnique({ where: { slug } })) {
      slug = `${originalSlug}-${counter}`;
      counter++;
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null
      },
      include: {
        _count: {
          select: { CategoryToPost: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: { category }
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update category
router.put('/:id', authenticateToken, requireAuthor, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const existingCategory = await prisma.category.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const updateData = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Category name cannot be empty'
        });
      }
      
      updateData.name = name.trim();
      
      // Update slug if name changed
      if (name.trim() !== existingCategory.name) {
        let slug = generateSlug(name);
        let counter = 1;
        let originalSlug = slug;
        while (await prisma.category.findFirst({ where: { slug, id: { not: id } } })) {
          slug = `${originalSlug}-${counter}`;
          counter++;
        }
        updateData.slug = slug;
      }
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { CategoryToPost: true }
        }
      }
    });

    res.json({
      success: true,
      data: { category }
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Delete category
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { CategoryToPost: true }
        }
      }
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Check if category has posts
    if (existingCategory._count.CategoryToPost > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category with existing posts. Please reassign or delete posts first.'
      });
    }

    await prisma.category.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Bulk reassign posts to new category (Admin only)
router.post('/:id/reassign', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newCategoryId } = req.body;

    if (!newCategoryId) {
      return res.status(400).json({
        success: false,
        error: 'New category ID is required'
      });
    }

    // Check if both categories exist
    const [oldCategory, newCategory] = await Promise.all([
      prisma.category.findUnique({ where: { id } }),
      prisma.category.findUnique({ where: { id: newCategoryId } })
    ]);

    if (!oldCategory || !newCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Reassign all posts
    const result = await prisma.categoryToPost.updateMany({
      where: { A: id },
      data: { A: newCategoryId }
    });

    res.json({
      success: true,
      message: `${result.count} posts reassigned to ${newCategory.name}`,
      data: { affected: result.count }
    });
  } catch (error) {
    console.error('Reassign category error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;