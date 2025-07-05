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

// Get all tags (public)
router.get('/', async (req, res) => {
  try {
    const includePosts = req.query.includePosts === 'true';
    const includeCount = req.query.includeCount === 'true';
    const search = req.query.search;
    const limit = parseInt(req.query.limit) || 50;

    const where = {};
    
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const tags = await prisma.tag.findMany({
      where,
      include: {
        ...(includePosts && {
          PostToTag: {
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
              PostToTag: {
                where: { posts: { status: 'PUBLISHED' } }
              }
            }
          }
        })
      },
      orderBy: { name: 'asc' },
      take: limit
    });

    res.json({
      success: true,
      data: { tags }
    });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get popular tags
router.get('/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: {
            PostToTag: {
              where: { posts: { status: 'PUBLISHED' } }
            }
          }
        }
      },
      orderBy: {
        PostToTag: {
          _count: 'desc'
        }
      },
      take: limit
    });

    // Filter out tags with no posts
    const popularTags = tags.filter(tag => tag._count.PostToTag > 0);

    res.json({
      success: true,
      data: { tags: popularTags }
    });
  } catch (error) {
    console.error('Get popular tags error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get single tag by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const tag = await prisma.tag.findUnique({
      where: { slug },
      include: {
        PostToTag: {
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
            PostToTag: {
              where: { posts: { status: 'PUBLISHED' } }
            }
          }
        }
      }
    });

    if (!tag) {
      return res.status(404).json({
        success: false,
        error: 'Tag not found'
      });
    }

    const totalPosts = tag._count.PostToTag;
    
    res.json({
      success: true,
      data: {
        tag: {
          ...tag,
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
    console.error('Get tag error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Create new tag
router.post('/', authenticateToken, requireAuthor, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Tag name is required'
      });
    }

    // Generate slug from name
    let slug = generateSlug(name);
    
    // Check if tag already exists
    const existingTag = await prisma.tag.findUnique({
      where: { slug }
    });

    if (existingTag) {
      return res.status(409).json({
        success: false,
        error: 'Tag already exists'
      });
    }

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        slug
      },
      include: {
        _count: {
          select: { PostToTag: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: { tag }
    });
  } catch (error) {
    console.error('Create tag error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update tag
router.put('/:id', authenticateToken, requireAuthor, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Tag name is required'
      });
    }

    const existingTag = await prisma.tag.findUnique({
      where: { id }
    });

    if (!existingTag) {
      return res.status(404).json({
        success: false,
        error: 'Tag not found'
      });
    }

    // Generate new slug if name changed
    let slug = existingTag.slug;
    if (name.trim() !== existingTag.name) {
      slug = generateSlug(name);
      
      // Check if new slug conflicts with existing tag
      const conflictingTag = await prisma.tag.findFirst({
        where: { 
          slug,
          id: { not: id }
        }
      });

      if (conflictingTag) {
        return res.status(409).json({
          success: false,
          error: 'A tag with this name already exists'
        });
      }
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: {
        name: name.trim(),
        slug
      },
      include: {
        _count: {
          select: { PostToTag: true }
        }
      }
    });

    res.json({
      success: true,
      data: { tag }
    });
  } catch (error) {
    console.error('Update tag error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Delete tag
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existingTag = await prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: { PostToTag: true }
        }
      }
    });

    if (!existingTag) {
      return res.status(404).json({
        success: false,
        error: 'Tag not found'
      });
    }

    // Check if tag has posts
    if (existingTag._count.PostToTag > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete tag with existing posts. Please remove tag from posts first.'
      });
    }

    await prisma.tag.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Tag deleted successfully'
    });
  } catch (error) {
    console.error('Delete tag error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Remove tag from all posts (Admin only)
router.post('/:id/remove-from-posts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existingTag = await prisma.tag.findUnique({
      where: { id }
    });

    if (!existingTag) {
      return res.status(404).json({
        success: false,
        error: 'Tag not found'
      });
    }

    // Get all posts with this tag
    const postsWithTag = await prisma.post.findMany({
      where: {
        PostToTag: {
          some: { B: id }
        }
      },
      select: { id: true }
    });

    // Remove tag from each post individually
    for (const post of postsWithTag) {
      await prisma.postToTag.deleteMany({
        where: { A: post.id, B: id }
      });
    }

    res.json({
      success: true,
      message: 'Tag removed from all posts'
    });
  } catch (error) {
    console.error('Remove tag from posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Merge tags (Admin only)
router.post('/:id/merge', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { targetTagId } = req.body;

    if (!targetTagId) {
      return res.status(400).json({
        success: false,
        error: 'Target tag ID is required'
      });
    }

    // Check if both tags exist
    const [sourceTag, targetTag] = await Promise.all([
      prisma.tag.findUnique({ where: { id } }),
      prisma.tag.findUnique({ where: { id: targetTagId } })
    ]);

    if (!sourceTag || !targetTag) {
      return res.status(404).json({
        success: false,
        error: 'Tag not found'
      });
    }

    if (sourceTag.id === targetTag.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot merge tag with itself'
      });
    }

    // Get all posts with source tag
    const postsWithSourceTag = await prisma.post.findMany({
      where: {
        PostToTag: {
          some: { B: sourceTag.id }
        }
      },
      include: {
        PostToTag: true
      }
    });

    // For each post, remove source tag and add target tag if not already present
    for (const post of postsWithSourceTag) {
      const hasTargetTag = post.PostToTag.some(postToTag => postToTag.B === targetTag.id);
      
      if (!hasTargetTag) {
        await prisma.postToTag.updateMany({
          where: { A: post.id, B: sourceTag.id },
          data: { B: targetTag.id }
        });
      } else {
        await prisma.postToTag.deleteMany({
          where: { A: post.id, B: sourceTag.id }
        });
      }
    }

    // Delete the source tag
    await prisma.tag.delete({
      where: { id: sourceTag.id }
    });

    res.json({
      success: true,
      message: `Tag "${sourceTag.name}" merged into "${targetTag.name}"`,
      data: { 
        mergedPosts: postsWithSourceTag.length,
        targetTag
      }
    });
  } catch (error) {
    console.error('Merge tags error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;