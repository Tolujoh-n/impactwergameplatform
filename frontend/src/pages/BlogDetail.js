import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../components/Notification';

const BlogDetail = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    fetchBlog();
  }, [slug]);

  const fetchBlog = async () => {
    try {
      const response = await api.get(`/blogs/${slug}`);
      setBlog(response.data);
      setIsLiked(
        user && response.data.likes?.some(like => 
          (typeof like === 'object' ? like._id : like) === user._id
        )
      );
    } catch (error) {
      console.error('Error fetching blog:', error);
      showNotification('Blog not found', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      showNotification('Please login to like blogs', 'warning');
      return;
    }

    try {
      const response = await api.post(`/blogs/${slug}/like`);
      setIsLiked(response.data.isLiked);
      setBlog(prev => ({
        ...prev,
        likes: response.data.likes,
      }));
    } catch (error) {
      showNotification('Failed to like blog', 'error');
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) {
      showNotification('Please login to comment', 'warning');
      return;
    }

    if (!commentText.trim()) {
      showNotification('Please enter a comment', 'warning');
      return;
    }

    try {
      const response = await api.post(`/blogs/${slug}/comment`, {
        content: commentText,
      });
      setBlog(prev => ({
        ...prev,
        comments: [...(prev.comments || []), response.data],
      }));
      setCommentText('');
      showNotification('Comment added successfully', 'success');
    } catch (error) {
      showNotification('Failed to add comment', 'error');
    }
  };

  const handleShare = async (platform) => {
    const url = window.location.href;
    const text = blog?.title || 'Check out this blog post!';

    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Blog not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link
          to="/blogs"
          className="inline-flex items-center text-blue-500 hover:text-blue-600 dark:text-blue-400 mb-6"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Blogs
        </Link>

        {/* Blog Header */}
        <article className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {blog.thumbnail && (
            <img
              src={blog.thumbnail}
              alt={blog.title}
              className="w-full h-96 object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          <div className="p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                {blog.category}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(blog.publishedAt || blog.createdAt).toLocaleDateString()}
              </span>
            </div>

            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {blog.title}
            </h1>

            <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {blog.author?.username?.[0]?.toUpperCase() || 'A'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {blog.author?.username || 'Admin'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {blog.views || 0} views
                  </p>
                </div>
              </div>

              {/* Like and Share */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleLike}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    isLiked
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>{blog.likes?.length || 0}</span>
                </button>
                <div className="relative group">
                  <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                    Share
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <div className="p-2">
                      <button
                        onClick={() => handleShare('twitter')}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center space-x-2"
                      >
                        <span>🐦</span>
                        <span>Twitter</span>
                      </button>
                      <button
                        onClick={() => handleShare('facebook')}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center space-x-2"
                      >
                        <span>📘</span>
                        <span>Facebook</span>
                      </button>
                      <button
                        onClick={() => handleShare('linkedin')}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center space-x-2"
                      >
                        <span>💼</span>
                        <span>LinkedIn</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Blog Content */}
            <div className="prose dark:prose-invert max-w-none mb-8">
              <BlogContentRenderer content={blog.content} />
            </div>

            {/* Tags */}
            {blog.tags && blog.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {blog.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Comments Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Comments ({blog.comments?.length || 0})
              </h2>

              {/* Add Comment */}
              {user ? (
                <form onSubmit={handleComment} className="mb-6">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white mb-2"
                    rows="3"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Post Comment
                  </button>
                </form>
              ) : (
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  <Link to="/login" className="text-blue-500 hover:underline">Login</Link> to comment
                </p>
              )}

              {/* Comments List */}
              <div className="space-y-4">
                {blog.comments && blog.comments.length > 0 ? (
                  blog.comments.map((comment) => (
                    <div
                      key={comment._id || comment.createdAt}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {comment.user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {comment.user?.username || 'Anonymous'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No comments yet. Be the first to comment!</p>
                )}
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

// Render Slate content
const BlogContentRenderer = ({ content }) => {
  if (!content || !Array.isArray(content)) {
    return <p>No content available</p>;
  }

  return (
    <div>
      {content.map((node, index) => {
        switch (node.type) {
          case 'heading-one':
            return <h1 key={index} className="text-3xl font-bold mb-4">{renderText(node.children)}</h1>;
          case 'heading-two':
            return <h2 key={index} className="text-2xl font-bold mb-3">{renderText(node.children)}</h2>;
          case 'heading-three':
            return <h3 key={index} className="text-xl font-bold mb-2">{renderText(node.children)}</h3>;
          case 'bulleted-list':
            return (
              <ul key={index} className="list-disc list-inside mb-4">
                {node.children?.map((item, idx) => (
                  <li key={idx}>{renderText(item.children)}</li>
                ))}
              </ul>
            );
          case 'numbered-list':
            return (
              <ol key={index} className="list-decimal list-inside mb-4">
                {node.children?.map((item, idx) => (
                  <li key={idx}>{renderText(item.children)}</li>
                ))}
              </ol>
            );
          case 'link':
            return (
              <a key={index} href={node.url} className="text-blue-500 hover:underline">
                {renderText(node.children)}
              </a>
            );
          case 'table':
            return (
              <table key={index} className="border-collapse border border-gray-300 dark:border-gray-600 my-4 w-full">
                <tbody>
                  {node.children?.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.children?.map((cell, cellIdx) => (
                        <td key={cellIdx} className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                          {renderText(cell.children)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          case 'iframe':
            return (
              <iframe
                key={index}
                src={node.url}
                className="w-full h-64 my-4"
                frameBorder="0"
                allowFullScreen
                title="Embedded content"
              />
            );
          default:
            return <p key={index} className="mb-4">{renderText(node.children)}</p>;
        }
      })}
    </div>
  );
};

const renderText = (children) => {
  if (!children || !Array.isArray(children)) return '';
  return children.map((child, idx) => {
    if (typeof child === 'string') return child;
    let text = child.text || '';
    if (child.bold) text = <strong key={idx}>{text}</strong>;
    if (child.italic) text = <em key={idx}>{text}</em>;
    if (child.underline) text = <u key={idx}>{text}</u>;
    return text || '';
  });
};

export default BlogDetail;
