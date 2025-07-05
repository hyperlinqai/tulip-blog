# Blog API Documentation

This documentation provides details about the API endpoints for the blog backend.

## Base URL

The base URL for all API endpoints is `/api`.

## Authentication

Most endpoints require authentication using a JSON Web Token (JWT). The token should be included in the `Authorization` header of the request, with the value `Bearer <token>`.

---

## Auth API

Handles user authentication, registration, and profile management.

**Endpoints:**

*   `POST /auth/login`: Logs in a user and returns a JWT.
    *   **Request Body:**
        *   `email` (string, required): The user's email address.
        *   `password` (string, required): The user's password.
    *   **Response:**
        *   `accessToken` (string): The JWT for the session.
        *   `user` (object): The authenticated user's information.

*   `POST /auth/register`: Registers a new user.
    *   **Request Body:**
        *   `email` (string, required): The user's email address.
        *   `password` (string, required): The user's password.
        *   `name` (string, required): The user's name.
        *   `role` (string, optional): The user's role (e.g., `USER`, `ADMIN`). Defaults to `USER`.
    *   **Response:**
        *   `user` (object): The newly created user's information.

*   `GET /auth/me`: Retrieves the currently authenticated user's profile.
    *   **Authentication:** Required.
    *   **Response:**
        *   `user` (object): The authenticated user's information.

*   `POST /auth/logout`: Logs out the current user.
    *   **Authentication:** Required.
    *   **Response:**
        *   `message` (string): A success message.

*   `POST /auth/logout-all`: Logs out the user from all sessions.
    *   **Authentication:** Required.
    *   **Response:**
        *   `message` (string): A success message.

*   `POST /auth/refresh`: Refreshes the JWT for the current session.
    *   **Authentication:** Required.
    *   **Response:**
        *   `accessToken` (string): The new JWT.
        *   `user` (object): The authenticated user's information.

*   `POST /auth/change-password`: Changes the password for the authenticated user.
    *   **Authentication:** Required.
    *   **Request Body:**
        *   `currentPassword` (string, required): The user's current password.
        *   `newPassword` (string, required): The new password.
    *   **Response:**
        *   `message` (string): A success message.

*   `PUT /auth/profile`: Updates the profile of the authenticated user.
    *   **Authentication:** Required.
    *   **Request Body:**
        *   `name` (string, required): The user's new name.
        *   `email` (string, required): The user's new email address.
    *   **Response:**
        *   `user` (object): The updated user information.

*   `GET /auth/users`: Retrieves a list of all users (Admin only).
    *   **Authentication:** Required (Admin).
    *   **Query Parameters:**
        *   `page` (number, optional): The page number for pagination.
        *   `limit` (number, optional): The number of users per page.
    *   **Response:**
        *   `users` (array): A list of user objects.
        *   `pagination` (object): Pagination information.

*   `PUT /auth/users/:id/role`: Updates the role of a specific user (Admin only).
    *   **Authentication:** Required (Admin).
    *   **Request Body:**
        *   `role` (string, required): The new role for the user.
    *   **Response:**
        *   `user` (object): The updated user information.

*   `DELETE /auth/users/:id`: Deletes a specific user (Admin only).
    *   **Authentication:** Required (Admin).
    *   **Response:**
        *   `message` (string): A success message.

---

## Categories API

Manages blog post categories.

**Endpoints:**

*   `GET /categories`: Retrieves a list of all categories.
    *   **Query Parameters:**
        *   `includePosts` (boolean, optional): Whether to include the latest posts for each category.
        *   `includeCount` (boolean, optional): Whether to include the number of posts in each category.
    *   **Response:**
        *   `categories` (array): A list of category objects.

*   `GET /categories/:slug`: Retrieves a single category by its slug.
    *   **Query Parameters:**
        *   `page` (number, optional): The page number for paginating through the category's posts.
        *   `limit` (number, optional): The number of posts per page.
    *   **Response:**
        *   `category` (object): The requested category, including its posts and pagination information.

*   `POST /categories`: Creates a new category.
    *   **Authentication:** Required (Author).
    *   **Request Body:**
        *   `name` (string, required): The name of the category.
        *   `description` (string, optional): A description of the category.
    *   **Response:**
        *   `category` (object): The newly created category.

*   `PUT /categories/:id`: Updates an existing category.
    *   **Authentication:** Required (Author).
    *   **Request Body:**
        *   `name` (string, optional): The new name for the category.
        *   `description` (string, optional): The new description for the category.
    *   **Response:**
        *   `category` (object): The updated category.

*   `DELETE /categories/:id`: Deletes a category.
    *   **Authentication:** Required (Admin).
    *   **Response:**
        *   `message` (string): A success message.

*   `POST /categories/:id/reassign`: Reassigns all posts from one category to another (Admin only).
    *   **Authentication:** Required (Admin).
    *   **Request Body:**
        *   `newCategoryId` (string, required): The ID of the category to which the posts will be reassigned.
    *   **Response:**
        *   `message` (string): A success message.
        *   `affected` (number): The number of posts that were reassigned.

---

## Posts API

Manages blog posts.

**Endpoints:**

*   `GET /posts`: Retrieves a list of all posts.
    *   **Query Parameters:**
        *   `page` (number, optional): The page number for pagination.
        *   `limit` (number, optional): The number of posts per page.
        *   `status` (string, optional): The status of the posts to retrieve (e.g., `PUBLISHED`, `DRAFT`).
        *   `categoryId` (string, optional): The ID of the category to filter by.
        *   `tag` (string, optional): The slug of the tag to filter by.
        *   `search` (string, optional): A search term to filter by.
    *   **Response:**
        *   `posts` (array): A list of post objects.
        *   `pagination` (object): Pagination information.

*   `GET /posts/:slug`: Retrieves a single post by its slug.
    *   **Response:**
        *   `post` (object): The requested post.

*   `POST /posts`: Creates a new post.
    *   **Authentication:** Required (Author).
    *   **Request Body:**
        *   `title` (string, required): The title of the post.
        *   `content` (string, required): The content of the post.
        *   `excerpt` (string, optional): A brief excerpt of the post.
        *   `featuredImage` (string, optional): The URL of the featured image.
        *   `status` (string, optional): The status of the post (e.g., `DRAFT`, `PUBLISHED`).
        *   `categoryId` (string, optional): The ID of the category for the post.
        *   `tags` (array, optional): An array of tag names.
        *   `metaTitle` (string, optional): The meta title for SEO.
        *   `metaDescription` (string, optional): The meta description for SEO.
        *   `metaKeywords` (string, optional): The meta keywords for SEO.
    *   **Response:**
        *   `post` (object): The newly created post.

*   `PUT /posts/:id`: Updates an existing post.
    *   **Authentication:** Required (Author).
    *   **Request Body:**
        *   (Same as `POST /posts`)
    *   **Response:**
        *   `post` (object): The updated post.

*   `DELETE /posts/:id`: Deletes a post.
    *   **Authentication:** Required (Author).
    *   **Response:**
        *   `message` (string): A success message.

*   `POST /posts/bulk`: Performs bulk operations on posts (Admin only).
    *   **Authentication:** Required (Admin).
    *   **Request Body:**
        *   `action` (string, required): The action to perform (e.g., `publish`, `unpublish`, `archive`, `delete`).
        *   `postIds` (array, required): An array of post IDs to perform the action on.
    *   **Response:**
        *   `message` (string): A success message.
        *   `affected` (number): The number of posts that were affected.

---

## Tags API

Manages blog post tags.

**Endpoints:**

*   `GET /tags`: Retrieves a list of all tags.
    *   **Query Parameters:**
        *   `includePosts` (boolean, optional): Whether to include the latest posts for each tag.
        *   `includeCount` (boolean, optional): Whether to include the number of posts in each tag.
        *   `search` (string, optional): A search term to filter by.
        *   `limit` (number, optional): The maximum number of tags to return.
    *   **Response:**
        *   `tags` (array): A list of tag objects.

*   `GET /tags/popular`: Retrieves a list of the most popular tags.
    *   **Query Parameters:**
        *   `limit` (number, optional): The maximum number of tags to return.
    *   **Response:**
        *   `tags` (array): A list of tag objects.

*   `GET /tags/:slug`: Retrieves a single tag by its slug.
    *   **Query Parameters:**
        *   `page` (number, optional): The page number for paginating through the tag's posts.
        *   `limit` (number, optional): The number of posts per page.
    *   **Response:**
        *   `tag` (object): The requested tag, including its posts and pagination information.

*   `POST /tags`: Creates a new tag.
    *   **Authentication:** Required (Author).
    *   **Request Body:**
        *   `name` (string, required): The name of the tag.
    *   **Response:**
        *   `tag` (object): The newly created tag.

*   `PUT /tags/:id`: Updates an existing tag.
    *   **Authentication:** Required (Author).
    *   **Request Body:**
        *   `name` (string, required): The new name for the tag.
    *   **Response:**
        *   `tag` (object): The updated tag.

*   `DELETE /tags/:id`: Deletes a tag.
    *   **Authentication:** Required (Admin).
    *   **Response:**
        *   `message` (string): A success message.

*   `POST /tags/:id/remove-from-posts`: Removes a tag from all posts (Admin only).
    *   **Authentication:** Required (Admin).
    *   **Response:**
        *   `message` (string): A success message.

*   `POST /tags/:id/merge`: Merges one tag into another (Admin only).
    *   **Authentication:** Required (Admin).
    *   **Request Body:**
        *   `targetTagId` (string, required): The ID of the tag to merge into.
    *   **Response:**
        *   `message` (string): A success message.
        *   `targetTag` (object): The tag that the other tag was merged into.
