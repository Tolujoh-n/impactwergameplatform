# WeRgame Blog System Documentation

## Overview

The WeRgame blog system is a fully integrated content management system that allows administrators to create, edit, and manage blog posts with rich text editing capabilities. Users can view blogs, like them, comment, and share them on social media platforms.

## Features

- **Rich Text Editing**: Powered by Slate.js editor with support for headings, paragraphs, lists, links, tables, and iframes
- **Blog Management**: Full CRUD operations for administrators
- **Featured Blogs**: Admins can mark up to 3 blogs as featured (displayed in footer)
- **User Engagement**: Like, comment, and share functionality
- **Filtering & Search**: Filter blogs by category, tag, or search by keywords
- **Responsive Design**: Works seamlessly on all devices
- **Dark Mode Support**: Fully compatible with light/dark themes

## Database Schema

### Blog Model

```javascript
{
  title: String (required),
  slug: String (required, unique, auto-generated),
  description: String (required),
  content: Mixed (Slate.js format, required),
  thumbnail: String (URL),
  author: ObjectId (ref: User, required),
  category: String (default: 'General'),
  tags: [String],
  isFeatured: Boolean (default: false),
  isPublished: Boolean (default: false),
  views: Number (default: 0),
  likes: [ObjectId] (ref: User),
  comments: [{
    user: ObjectId (ref: User),
    content: String,
    createdAt: Date
  }],
  publishedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Public Blog APIs

#### 1. Get All Published Blogs
**Endpoint:** `GET /api/blogs`

**Description:** Retrieves all published blogs with optional filtering.

**Query Parameters:**
- `category` (optional): Filter by category
- `tag` (optional): Filter by tag
- `search` (optional): Search in title and description
- `featured` (optional): Set to `true` to get only featured blogs

**Response:**
```json
[
  {
    "_id": "blog_id",
    "title": "Blog Title",
    "slug": "blog-slug",
    "description": "Short description",
    "thumbnail": "https://example.com/image.jpg",
    "author": {
      "_id": "user_id",
      "username": "admin"
    },
    "category": "Tournament",
    "tags": ["World Cup", "Football"],
    "isFeatured": true,
    "views": 1250,
    "likes": ["user_id1", "user_id2"],
    "publishedAt": "2024-06-01T00:00:00.000Z",
    "createdAt": "2024-06-01T00:00:00.000Z"
  }
]
```

**Example:**
```javascript
// Get all blogs
GET /api/blogs

// Get blogs by category
GET /api/blogs?category=Tournament

// Search blogs
GET /api/blogs?search=world cup

// Get featured blogs only
GET /api/blogs?featured=true
```

---

#### 2. Get Featured Blogs
**Endpoint:** `GET /api/blogs/featured`

**Description:** Retrieves up to 3 featured blogs (used in footer).

**Response:**
```json
[
  {
    "_id": "blog_id",
    "title": "Featured Blog Title",
    "slug": "featured-blog-slug",
    "description": "Description",
    "thumbnail": "https://example.com/image.jpg",
    "author": {
      "_id": "user_id",
      "username": "admin"
    },
    "category": "Tournament",
    "views": 1250,
    "publishedAt": "2024-06-01T00:00:00.000Z"
  }
]
```

**Example:**
```javascript
GET /api/blogs/featured
```

---

#### 3. Get Blog by Slug
**Endpoint:** `GET /api/blogs/:slug`

**Description:** Retrieves a single blog post by its slug. Automatically increments view count.

**Response:**
```json
{
  "_id": "blog_id",
  "title": "Blog Title",
  "slug": "blog-slug",
  "description": "Description",
  "content": [
    {
      "type": "paragraph",
      "children": [{ "text": "Blog content..." }]
    },
    {
      "type": "heading-two",
      "children": [{ "text": "Section Title" }]
    }
  ],
  "thumbnail": "https://example.com/image.jpg",
  "author": {
    "_id": "user_id",
    "username": "admin",
    "email": "admin@example.com"
  },
  "category": "Tournament",
  "tags": ["World Cup", "Football"],
  "isFeatured": true,
  "views": 1251,
  "likes": [
    {
      "_id": "user_id",
      "username": "user1"
    }
  ],
  "comments": [
    {
      "_id": "comment_id",
      "user": {
        "_id": "user_id",
        "username": "user1"
      },
      "content": "Great blog post!",
      "createdAt": "2024-06-02T00:00:00.000Z"
    }
  ],
  "publishedAt": "2024-06-01T00:00:00.000Z",
  "createdAt": "2024-06-01T00:00:00.000Z"
}
```

**Example:**
```javascript
GET /api/blogs/world-cup-2024-top-teams-to-watch
```

---

#### 4. Like/Unlike Blog
**Endpoint:** `POST /api/blogs/:slug/like`

**Description:** Toggles like status for the authenticated user.

**Authentication:** Required (JWT token)

**Response:**
```json
{
  "likes": 5,
  "isLiked": true
}
```

**Example:**
```javascript
POST /api/blogs/world-cup-2024-top-teams-to-watch/like
Headers: { Authorization: "Bearer <token>" }
```

---

#### 5. Add Comment
**Endpoint:** `POST /api/blogs/:slug/comment`

**Description:** Adds a comment to a blog post.

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "content": "This is a great blog post!"
}
```

**Response:**
```json
{
  "_id": "comment_id",
  "user": {
    "_id": "user_id",
    "username": "user1"
  },
  "content": "This is a great blog post!",
  "createdAt": "2024-06-02T00:00:00.000Z"
}
```

**Example:**
```javascript
POST /api/blogs/world-cup-2024-top-teams-to-watch/comment
Headers: { Authorization: "Bearer <token>" }
Body: { "content": "Great analysis!" }
```

---

#### 6. Get Categories
**Endpoint:** `GET /api/blogs/meta/categories`

**Description:** Retrieves all unique categories from published blogs.

**Response:**
```json
["Tournament", "Tutorial", "Tips", "Strategy", "General"]
```

**Example:**
```javascript
GET /api/blogs/meta/categories
```

---

#### 7. Get Tags
**Endpoint:** `GET /api/blogs/meta/tags`

**Description:** Retrieves all unique tags from published blogs.

**Response:**
```json
["World Cup", "Football", "Tournament", "Market", "Trading", "Guide", "Streaks", "Strategy", "Jackpot", "Champions League"]
```

**Example:**
```javascript
GET /api/blogs/meta/tags
```

---

### Admin Blog APIs

All admin endpoints require authentication and admin role.

#### 1. Get All Blogs (Admin)
**Endpoint:** `GET /api/admin/blogs`

**Description:** Retrieves all blogs (including unpublished) for admin management.

**Authentication:** Required (Admin role)

**Response:**
```json
[
  {
    "_id": "blog_id",
    "title": "Blog Title",
    "slug": "blog-slug",
    "description": "Description",
    "author": {
      "_id": "user_id",
      "username": "admin"
    },
    "category": "Tournament",
    "isFeatured": true,
    "isPublished": true,
    "views": 1250,
    "createdAt": "2024-06-01T00:00:00.000Z"
  }
]
```

**Example:**
```javascript
GET /api/admin/blogs
Headers: { Authorization: "Bearer <admin_token>" }
```

---

#### 2. Create Blog
**Endpoint:** `POST /api/admin/blogs`

**Description:** Creates a new blog post.

**Authentication:** Required (Admin role)

**Request Body:**
```json
{
  "title": "New Blog Post",
  "description": "Short description of the blog",
  "content": [
    {
      "type": "paragraph",
      "children": [{ "text": "Blog content here..." }]
    },
    {
      "type": "heading-two",
      "children": [{ "text": "Section Title" }]
    }
  ],
  "thumbnail": "https://example.com/image.jpg",
  "category": "Tournament",
  "tags": ["World Cup", "Football"],
  "isFeatured": false,
  "isPublished": true
}
```

**Response:**
```json
{
  "_id": "blog_id",
  "title": "New Blog Post",
  "slug": "new-blog-post",
  "description": "Short description",
  "content": [...],
  "author": {
    "_id": "admin_id",
    "username": "admin"
  },
  "category": "Tournament",
  "tags": ["World Cup", "Football"],
  "isFeatured": false,
  "isPublished": true,
  "publishedAt": "2024-06-01T00:00:00.000Z",
  "createdAt": "2024-06-01T00:00:00.000Z"
}
```

**Example:**
```javascript
POST /api/admin/blogs
Headers: { Authorization: "Bearer <admin_token>" }
Body: { ...blog data }
```

**Notes:**
- `slug` is auto-generated from title if not provided
- `publishedAt` is automatically set when `isPublished` is true
- `author` is automatically set to the authenticated admin user

---

#### 3. Update Blog
**Endpoint:** `PUT /api/admin/blogs/:id`

**Description:** Updates an existing blog post.

**Authentication:** Required (Admin role)

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "content": [...],
  "category": "Updated Category",
  "tags": ["Tag1", "Tag2"],
  "isFeatured": true,
  "isPublished": true
}
```

**Response:**
```json
{
  "_id": "blog_id",
  "title": "Updated Title",
  "slug": "updated-title",
  "description": "Updated description",
  "content": [...],
  "author": {
    "_id": "admin_id",
    "username": "admin"
  },
  "category": "Updated Category",
  "tags": ["Tag1", "Tag2"],
  "isFeatured": true,
  "isPublished": true,
  "updatedAt": "2024-06-02T00:00:00.000Z"
}
```

**Example:**
```javascript
PUT /api/admin/blogs/blog_id
Headers: { Authorization: "Bearer <admin_token>" }
Body: { ...updated blog data }
```

**Notes:**
- If `isPublished` changes from `false` to `true`, `publishedAt` is automatically set
- `updatedAt` is automatically updated

---

#### 4. Delete Blog
**Endpoint:** `DELETE /api/admin/blogs/:id`

**Description:** Deletes a blog post.

**Authentication:** Required (Admin role)

**Response:**
```json
{
  "message": "Blog deleted successfully"
}
```

**Example:**
```javascript
DELETE /api/admin/blogs/blog_id
Headers: { Authorization: "Bearer <admin_token>" }
```

---

## Slate.js Content Format

Blog content is stored in Slate.js format, which is a JSON structure representing the rich text content.

### Basic Structure

```json
[
  {
    "type": "paragraph",
    "children": [{ "text": "This is a paragraph." }]
  },
  {
    "type": "heading-one",
    "children": [{ "text": "Heading 1" }]
  },
  {
    "type": "heading-two",
    "children": [{ "text": "Heading 2" }]
  },
  {
    "type": "heading-three",
    "children": [{ "text": "Heading 3" }]
  },
  {
    "type": "bulleted-list",
    "children": [
      {
        "type": "list-item",
        "children": [{ "text": "List item 1" }]
      },
      {
        "type": "list-item",
        "children": [{ "text": "List item 2" }]
      }
    ]
  },
  {
    "type": "numbered-list",
    "children": [
      {
        "type": "list-item",
        "children": [{ "text": "Numbered item 1" }]
      }
    ]
  },
  {
    "type": "link",
    "url": "https://example.com",
    "children": [{ "text": "Link text" }]
  },
  {
    "type": "table",
    "children": [
      {
        "type": "table-row",
        "children": [
          {
            "type": "table-cell",
            "children": [{ "text": "Cell 1" }]
          },
          {
            "type": "table-cell",
            "children": [{ "text": "Cell 2" }]
          }
        ]
      }
    ]
  },
  {
    "type": "iframe",
    "url": "https://www.youtube.com/embed/VIDEO_ID",
    "children": []
  }
]
```

### Text Formatting

Text nodes can have formatting properties:

```json
{
  "text": "Bold and italic text",
  "bold": true,
  "italic": true,
  "underline": true
}
```

---

## Frontend Components

### 1. SlateEditor
**Location:** `frontend/src/components/SlateEditor.js`

Rich text editor component powered by Slate.js.

**Props:**
- `value`: Slate content array
- `onChange`: Callback function when content changes
- `placeholder`: Placeholder text (default: "Start writing...")
- `showToolbar`: Boolean to show/hide toolbar (default: false)

**Usage:**
```javascript
import SlateEditor from '../components/SlateEditor';

<SlateEditor
  value={content}
  onChange={(newContent) => setContent(newContent)}
  showToolbar={true}
/>
```

---

### 2. SlateToolbar
**Location:** `frontend/src/components/SlateToolbar.js`

Toolbar component for Slate editor with formatting options.

**Features:**
- Bold, Italic, Underline
- Headings (H1, H2, H3)
- Bulleted and Numbered Lists
- Insert Link

**Usage:**
Must be used inside Slate context (within `<Slate>` component).

---

### 3. Footer
**Location:** `frontend/src/components/Footer.js`

Footer component that displays featured blogs and site links.

**Features:**
- Displays 3 featured blogs
- "View All Blogs" button
- Quick links navigation
- Tournament links
- Social media icons
- Copyright notice

---

### 4. Blogs Page
**Location:** `frontend/src/pages/Blogs.js`

Blog listing page with filtering capabilities.

**Features:**
- Search functionality
- Category filter
- Tag filter
- Responsive grid layout
- Blog cards with thumbnails

**Route:** `/blogs`

---

### 5. BlogDetail Page
**Location:** `frontend/src/pages/BlogDetail.js`

Individual blog post detail page.

**Features:**
- Rich content rendering
- Like/unlike functionality
- Comment system
- Social sharing (Twitter, Facebook, LinkedIn)
- Author information
- View count
- Tags display

**Route:** `/blog/:slug`

---

### 6. Admin Blog Management
**Location:** `frontend/src/pages/Admin.js` (BlogsTab component)

Admin interface for managing blogs.

**Features:**
- List all blogs (published and drafts)
- Create new blog
- Edit existing blog
- Delete blog
- Rich text editor with toolbar
- Featured toggle
- Publish/Draft toggle
- Category and tags management

**Access:** Admin dashboard → Blogs tab

---

## Usage Examples

### Creating a Blog (Admin)

```javascript
import api from '../utils/api';

const createBlog = async () => {
  const blogData = {
    title: "My New Blog Post",
    description: "This is a description of my blog post",
    content: [
      {
        type: "paragraph",
        children: [{ text: "This is the blog content..." }]
      }
    ],
    thumbnail: "https://example.com/image.jpg",
    category: "Tournament",
    tags: ["World Cup", "Football"],
    isFeatured: false,
    isPublished: true
  };

  try {
    const response = await api.post('/admin/blogs', blogData);
    console.log('Blog created:', response.data);
  } catch (error) {
    console.error('Error creating blog:', error);
  }
};
```

### Fetching Featured Blogs

```javascript
import api from '../utils/api';

const fetchFeaturedBlogs = async () => {
  try {
    const response = await api.get('/blogs/featured');
    console.log('Featured blogs:', response.data);
  } catch (error) {
    console.error('Error fetching featured blogs:', error);
  }
};
```

### Liking a Blog

```javascript
import api from '../utils/api';

const likeBlog = async (slug) => {
  try {
    const response = await api.post(`/blogs/${slug}/like`);
    console.log('Likes:', response.data.likes);
    console.log('Is Liked:', response.data.isLiked);
  } catch (error) {
    console.error('Error liking blog:', error);
  }
};
```

### Adding a Comment

```javascript
import api from '../utils/api';

const addComment = async (slug, commentText) => {
  try {
    const response = await api.post(`/blogs/${slug}/comment`, {
      content: commentText
    });
    console.log('Comment added:', response.data);
  } catch (error) {
    console.error('Error adding comment:', error);
  }
};
```

---

## Best Practices

1. **Content Formatting**: Always use Slate.js format for blog content. The editor handles conversion automatically.

2. **Slug Generation**: Slugs are auto-generated from titles. Ensure titles are unique to avoid slug conflicts.

3. **Featured Blogs**: Only mark up to 3 blogs as featured. The footer displays only 3 featured blogs.

4. **Thumbnail Images**: Use high-quality images (recommended: 800x600px) for better display.

5. **Categories**: Use consistent category names for better filtering.

6. **Tags**: Use relevant tags to help users discover related content.

7. **Publishing**: Set `isPublished: false` to save drafts. Only published blogs are visible to public users.

8. **Content Length**: Keep descriptions concise (100-200 characters) for better card displays.

---

## Error Handling

All API endpoints return appropriate HTTP status codes:

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions (admin required)
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error response format:
```json
{
  "message": "Error message description"
}
```

---

## Testing

To test the blog system:

1. **Seed Data**: Run the seed script to create sample blogs:
   ```bash
   cd backend
   npm run seed
   ```

2. **Admin Access**: Login as admin to access blog management:
   - Email: `admin@wergame.com`
   - Password: `admin123`

3. **Test Features**:
   - View blogs at `/blogs`
   - View blog detail at `/blog/:slug`
   - Create/edit blogs in Admin → Blogs tab
   - Test like and comment functionality
   - Check featured blogs in footer

---

## Future Enhancements

Potential improvements for the blog system:

- [ ] Blog post scheduling
- [ ] Image upload functionality
- [ ] Blog post drafts and revisions
- [ ] Author profiles
- [ ] Related posts suggestions
- [ ] Reading time estimation
- [ ] Blog analytics dashboard
- [ ] RSS feed support
- [ ] Email notifications for new comments
- [ ] Blog post templates

---

## Support

For issues or questions about the blog system, please refer to the main project documentation or contact the development team.
