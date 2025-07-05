const { Router } = require('express');
const { prisma } = require('../db');
const { authenticateToken, requireAuthor, requireAdmin } = require('../middleware/auth');

const router = Router();

// Generate slug from title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 100);
};

// Get all posts (public endpoint with optional auth)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status || 'PUBLISHED';
    const categoryId = req.query.categoryId;
    const tag = req.query.tag;
    const search = req.query.search;

    const where = {};

    // Only show published posts for public access
    if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.CategoryToPost = {
        some: {
          A: categoryId
        }
      };
    }

    if (tag) {
      where.PostToTag = {
        some: {
          tags: {
            slug: tag
          }
        }
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [posts, totalCount] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          CategoryToPost: {
            select: {
              categories: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
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
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.post.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get single post by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const post = await prisma.post.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        CategoryToPost: {
          select: {
            categories: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
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
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    res.json({
      success: true,
      data: { post }
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Create new post
router.post('/', authenticateToken, requireAuthor, async (req, res) => {
  try {
    const {
      title,
      excerpt,
      content,
      featuredImage,
      status = 'DRAFT',
      categoryId,
      tags = [],
      metaTitle,
      metaDescription,
      metaKeywords
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required'
      });
    }

    // Generate slug from title
    let slug = generateSlug(title);
    
    // Ensure slug is unique
    let counter = 1;
    let originalSlug = slug;
    while (await prisma.post.findUnique({ where: { slug } })) {
      slug = `${originalSlug}-${counter}`;
      counter++;
    }

    // Process tags
    const tagConnections = [];
    for (const tagName of tags) {
      if (typeof tagName === 'string' && tagName.trim()) {
        const tagSlug = generateSlug(tagName);
        
        // Find or create tag
        let tag = await prisma.tag.findUnique({
          where: { slug: tagSlug }
        });

        if (!tag) {
          tag = await prisma.tag.create({
            data: {
              name: tagName.trim(),
              slug: tagSlug
            }
          });
        }

        tagConnections.push({ id: tag.id });
      }
    }

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        excerpt,
        content,
        featuredImage,
        status,
        authorId: req.user.id,
        CategoryToPost: categoryId ? { create: { A: categoryId } } : undefined,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        PostToTag: {
          create: tagConnections.map(tag => ({ B: tag.id }))
        },
        seo_meta: {
          create: {
            metaTitle,
            metaDescription,
            metaKeywords
          }
        }
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        CategoryToPost: {
          select: {
            categories: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
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
        },
        seo_meta: true
      }
    });

    res.status(201).json({
      success: true,
      data: { post }
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update post
router.put('/:id', authenticateToken, requireAuthor, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      excerpt,
      content,
      featuredImage,
      status,
      categoryId,
      tags = [],
      metaTitle,
      metaDescription,
      metaKeywords
    } = req.body;

    // Check if post exists and user has permission
    const existingPost = await prisma.post.findUnique({
      where: { id },
      include: { author: true }
    });

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Check if user owns the post or is admin
    if (existingPost.authorId !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'You can only edit your own posts'
      });
    }

    const updateData = {};

    if (title !== undefined) {
      updateData.title = title;
      
      // Update slug if title changed
      if (title !== existingPost.title) {
        let slug = generateSlug(title);
        let counter = 1;
        let originalSlug = slug;
        while (await prisma.post.findFirst({ where: { slug, id: { not: id } } })) {
          slug = `${originalSlug}-${counter}`;
          counter++;
        }
        updateData.slug = slug;
      }
    }

    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (content !== undefined) updateData.content = content;
    if (featuredImage !== undefined) updateData.featuredImage = featuredImage;
    if (categoryId !== undefined) {
      await prisma.categoryToPost.deleteMany({ where: { B: id } });
      updateData.CategoryToPost = { create: { A: categoryId } };
    }
    if (metaTitle !== undefined || metaDescription !== undefined || metaKeywords !== undefined) {
      updateData.seo_meta = {
        upsert: {
          create: {
            metaTitle,
            metaDescription,
            metaKeywords
          },
          update: {
            metaTitle,
            metaDescription,
            metaKeywords
          }
        }
      };
    }

    if (status !== undefined) {
      updateData.status = status;
      // Set publishedAt when first published
      if (status === 'PUBLISHED' && existingPost.status !== 'PUBLISHED') {
        updateData.publishedAt = new Date();
      }
    }

    // Handle tags
    if (tags.length >= 0) {
      // First disconnect all existing tags
      await prisma.postToTag.deleteMany({ where: { A: id } });

      // Process new tags
      const tagConnections = [];
      for (const tagName of tags) {
        if (typeof tagName === 'string' && tagName.trim()) {
          const tagSlug = generateSlug(tagName);
          
          let tag = await prisma.tag.findUnique({
            where: { slug: tagSlug }
          });

          if (!tag) {
            tag = await prisma.tag.create({
              data: {
                name: tagName.trim(),
                slug: tagSlug
              }
            });
          }

          tagConnections.push({ B: tag.id });
        }
      }

      updateData.PostToTag = {
        create: tagConnections
      };
    }

    const post = await prisma.post.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        CategoryToPost: {
          select: {
            categories: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
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
    });

    res.json({
      success: true,
      data: { post }
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Delete post
router.delete('/:id', authenticateToken, requireAuthor, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if post exists and user has permission
    const existingPost = await prisma.post.findUnique({
      where: { id },
      include: { author: true }
    });

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Check if user owns the post or is admin
    if (existingPost.authorId !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own posts'
      });
    }

    await prisma.post.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Bulk operations (Admin only)
router.post('/bulk', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { action, postIds } = req.body;

    if (!action || !Array.isArray(postIds) || postIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Action and postIds array are required'
      });
    }

    let result;
    switch (action) {
      case 'publish':
        result = await prisma.post.updateMany({
          where: { id: { in: postIds } },
          data: { 
            status: 'PUBLISHED',
            publishedAt: new Date()
          }
        });
        break;
      case 'unpublish':
        result = await prisma.post.updateMany({
          where: { id: { in: postIds } },
          data: { status: 'DRAFT' }
        });
        break;
      case 'archive':
        result = await prisma.post.updateMany({
          where: { id: { in: postIds } },
          data: { status: 'ARCHIVED' }
        });
        break;
      case 'delete':
        result = await prisma.post.deleteMany({
          where: { id: { in: postIds } }
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Must be one of: publish, unpublish, archive, delete'
        });
    }

    res.json({
      success: true,
      message: `${action} operation completed`,
      data: { affected: result.count }
    });
  } catch (error) {
    console.error('Bulk operation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;