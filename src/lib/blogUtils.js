// Utility functions for blog content processing

/**
 * Convert HTML content to structured content format
 * @param {string} htmlContent - Raw HTML content
 * @returns {Array} Structured content blocks
 */
export const htmlToStructuredContent = (htmlContent) => {
  if (!htmlContent) return [];

  // Create a temporary DOM element to parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const blocks = [];

  // Process each element in the body
  Array.from(doc.body.children).forEach((element) => {
    const block = processHtmlElement(element);
    if (block) {
      blocks.push(block);
    }
  });

  return blocks;
};

/**
 * Process individual HTML elements into structured blocks
 * @param {Element} element - DOM element
 * @returns {Object|null} Structured block or null
 */
const processHtmlElement = (element) => {
  const tagName = element.tagName.toLowerCase();

  switch (tagName) {
    case 'p':
      return {
        type: 'paragraph',
        content: element.textContent.trim()
      };

    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return {
        type: 'heading',
        level: parseInt(tagName.charAt(1)),
        content: element.textContent.trim()
      };

    case 'img':
      return {
        type: 'image',
        src: element.src || '',
        alt: element.alt || '',
        caption: element.getAttribute('data-caption') || ''
      };

    case 'ul':
      const ulItems = Array.from(element.querySelectorAll('li')).map(li => li.textContent.trim());
      return {
        type: 'bulletList',
        items: ulItems
      };

    case 'ol':
      const olItems = Array.from(element.querySelectorAll('li')).map(li => li.textContent.trim());
      return {
        type: 'numberedList',
        items: olItems
      };

    case 'blockquote':
      return {
        type: 'quote',
        content: element.textContent.trim(),
        author: element.getAttribute('data-author') || ''
      };

    case 'a':
      return {
        type: 'link',
        href: element.href || '#',
        text: element.textContent.trim(),
        target: element.target || '_self'
      };

    default:
      // For other elements, treat as paragraph if they have text content
      if (element.textContent.trim()) {
        return {
          type: 'paragraph',
          content: element.textContent.trim()
        };
      }
      return null;
  }
};

/**
 * Convert structured content to HTML
 * @param {Array} structuredContent - Array of structured content blocks
 * @returns {string} HTML string
 */
export const structuredContentToHtml = (structuredContent) => {
  if (!Array.isArray(structuredContent)) return '';

  return structuredContent.map(block => {
    switch (block.type) {
      case 'paragraph':
        return `<p>${escapeHtml(block.content)}</p>`;

      case 'heading':
        const level = Math.min(Math.max(parseInt(block.level) || 2, 1), 6);
        return `<h${level}>${escapeHtml(block.content)}</h${level}>`;

      case 'image':
        const caption = block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : '';
        return `<figure><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" loading="lazy">${caption}</figure>`;

      case 'bulletList':
        const ulItems = block.items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
        return `<ul>${ulItems}</ul>`;

      case 'numberedList':
        const olItems = block.items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
        return `<ol>${olItems}</ol>`;

      case 'link':
        const target = block.target === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${escapeHtml(block.href)}"${target}>${escapeHtml(block.text)}</a>`;

      case 'quote':
        const author = block.author ? `<cite>— ${escapeHtml(block.author)}</cite>` : '';
        return `<blockquote><p>"${escapeHtml(block.content)}"</p>${author}</blockquote>`;

      default:
        return `<p>${escapeHtml(block.content || '')}</p>`;
    }
  }).join('');
};

/**
 * Escape HTML characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Validate structured content format
 * @param {Array} structuredContent - Array of structured content blocks
 * @returns {Object} Validation result with isValid and errors
 */
export const validateStructuredContent = (structuredContent) => {
  const errors = [];

  if (!Array.isArray(structuredContent)) {
    errors.push('Content must be an array of blocks');
    return { isValid: false, errors };
  }

  structuredContent.forEach((block, index) => {
    if (!block || typeof block !== 'object') {
      errors.push(`Block ${index} is invalid`);
      return;
    }

    if (!block.type) {
      errors.push(`Block ${index} is missing type`);
      return;
    }

    switch (block.type) {
      case 'paragraph':
        if (!block.content || typeof block.content !== 'string') {
          errors.push(`Block ${index} (paragraph) is missing content`);
        }
        break;

      case 'heading':
        if (!block.content || typeof block.content !== 'string') {
          errors.push(`Block ${index} (heading) is missing content`);
        }
        if (block.level && (block.level < 1 || block.level > 6)) {
          errors.push(`Block ${index} (heading) has invalid level`);
        }
        break;

      case 'image':
        if (!block.src || typeof block.src !== 'string') {
          errors.push(`Block ${index} (image) is missing src`);
        }
        break;

      case 'bulletList':
      case 'numberedList':
        if (!Array.isArray(block.items)) {
          errors.push(`Block ${index} (${block.type}) is missing items array`);
        }
        break;

      case 'link':
        if (!block.href || typeof block.href !== 'string') {
          errors.push(`Block ${index} (link) is missing href`);
        }
        if (!block.text || typeof block.text !== 'string') {
          errors.push(`Block ${index} (link) is missing text`);
        }
        break;

      case 'quote':
        if (!block.content || typeof block.content !== 'string') {
          errors.push(`Block ${index} (quote) is missing content`);
        }
        break;

      default:
        errors.push(`Block ${index} has unknown type: ${block.type}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Calculate estimated reading time for structured content
 * @param {Array} structuredContent - Array of structured content blocks
 * @returns {number} Estimated reading time in minutes
 */
export const calculateReadingTime = (structuredContent) => {
  if (!Array.isArray(structuredContent)) return 5;

  let wordCount = 0;

  structuredContent.forEach(block => {
    switch (block.type) {
      case 'paragraph':
      case 'heading':
      case 'quote':
        if (block.content) {
          wordCount += block.content.split(/\s+/).length;
        }
        break;

      case 'bulletList':
      case 'numberedList':
        if (Array.isArray(block.items)) {
          block.items.forEach(item => {
            wordCount += item.split(/\s+/).length;
          });
        }
        break;

      case 'link':
        if (block.text) {
          wordCount += block.text.split(/\s+/).length;
        }
        break;
    }
  });

  // Average reading speed: 200 words per minute
  const readingTime = Math.ceil(wordCount / 200);
  return Math.max(readingTime, 1); // Minimum 1 minute
};

/**
 * Extract images from structured content
 * @param {Array} structuredContent - Array of structured content blocks
 * @returns {Array} Array of image objects
 */
export const extractImagesFromContent = (structuredContent) => {
  if (!Array.isArray(structuredContent)) return [];

  return structuredContent
    .filter(block => block.type === 'image')
    .map(block => ({
      src: block.src,
      alt: block.alt,
      caption: block.caption
    }));
};

/**
 * Create a sample structured content template
 * @returns {Array} Sample structured content
 */
export const createSampleStructuredContent = () => {
  return [
    {
      type: 'paragraph',
      content: 'This is a sample blog post with structured content. It demonstrates how to create rich, formatted content with multiple elements.'
    },
    {
      type: 'heading',
      level: 2,
      content: 'Key Features'
    },
    {
      type: 'bulletList',
      items: [
        'Multiple images support',
        'Rich text formatting',
        'Bullet and numbered lists',
        'Links and quotes',
        'Responsive design'
      ]
    },
    {
      type: 'heading',
      level: 3,
      content: 'Implementation Steps'
    },
    {
      type: 'numberedList',
      items: [
        'Set up the database schema',
        'Update the backend controllers',
        'Enhance the frontend components',
        'Add CSS styling',
        'Test the functionality'
      ]
    },
    {
      type: 'quote',
      content: 'The best way to predict the future is to create it.',
      author: 'Peter Drucker'
    },
    {
      type: 'paragraph',
      content: 'This structured content system provides a flexible way to create rich blog posts with proper formatting and styling.'
    }
  ];
};
