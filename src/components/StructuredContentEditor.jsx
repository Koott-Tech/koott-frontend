'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { 
  Plus, 
  Trash2, 
  Move, 
  Type, 
  Heading, 
  Image, 
  List, 
  Link, 
  Quote,
  Eye,
  EyeOff,
  Upload,
  X,
  FileText,
  Minus
} from 'lucide-react';

// Normalize URL to ensure it has a protocol
const normalizeUrl = (url) => {
  if (!url || !url.trim()) return url;
  
  const trimmedUrl = url.trim();
  
  // If it already has a protocol, return as is
  if (trimmedUrl.match(/^https?:\/\//i)) {
    return trimmedUrl;
  }
  
  // If it starts with //, add https:
  if (trimmedUrl.startsWith('//')) {
    return `https:${trimmedUrl}`;
  }
  
  // If it's a relative path, return as is
  if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('./') || trimmedUrl.startsWith('../')) {
    return trimmedUrl;
  }
  
  // If it looks like a domain (contains a dot and no spaces), add https://
  if (trimmedUrl.includes('.') && !trimmedUrl.includes(' ')) {
    return `https://${trimmedUrl}`;
  }
  
  // Otherwise, return as is
  return trimmedUrl;
};

// Utility function to parse markdown-style links in text
const parseInlineLinks = (text) => {
  if (!text) return text;
  
  // Regular expression to match [text](url) pattern
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      });
    }
    
    // Normalize the URL to ensure it has a protocol
    const normalizedUrl = normalizeUrl(match[2]);
    
    // Add the link
    parts.push({
      type: 'link',
      text: match[1],
      url: normalizedUrl
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after the last link
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }
  
  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
};

// ContentEditable Block Component
const ContentEditableBlock = forwardRef(({ blockIndex, block, onUpdate, onSelect, onContextMenu, markdownToHtml, htmlToMarkdown, className, placeholder }, ref) => {
  const contentRef = useRef(null);
  const isUpdatingRef = useRef(false);

  useImperativeHandle(ref, () => contentRef.current);

  // Update HTML when block content changes externally
  useEffect(() => {
    if (contentRef.current && !isUpdatingRef.current) {
      const currentHtml = markdownToHtml(block.content);
      const existingHtml = contentRef.current.innerHTML;
      if (existingHtml !== currentHtml) {
        isUpdatingRef.current = true;
        contentRef.current.innerHTML = currentHtml;
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);
      }
    }
  }, [block.content, markdownToHtml]);

  const handleInput = (e) => {
    if (isUpdatingRef.current) return;
    const htmlContent = e.target.innerHTML;
    const markdownContent = htmlToMarkdown(htmlContent);
    onUpdate(markdownContent);
  };

  const handleBlur = (e) => {
    if (isUpdatingRef.current) return;
    const htmlContent = e.target.innerHTML;
    const markdownContent = htmlToMarkdown(htmlContent);
    onUpdate(markdownContent);
  };

  // Initialize content on mount
  useEffect(() => {
    if (contentRef.current && !contentRef.current.innerHTML) {
      contentRef.current.innerHTML = markdownToHtml(block.content);
    }
  }, []);

  return (
    <div
      ref={contentRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onBlur={handleBlur}
      onSelect={(e) => onSelect && onSelect(e, blockIndex)}
      onContextMenu={(e) => onContextMenu && onContextMenu(e, blockIndex)}
      className={className}
      style={{ whiteSpace: 'pre-wrap' }}
      data-placeholder={placeholder}
    />
  );
});

ContentEditableBlock.displayName = 'ContentEditableBlock';

const DEFAULT_TEXT_STYLE = () => ({
  bold: false,
  italic: false,
  underline: false,
});

const TOOLBAR_BUTTON_BASE =
  'flex items-center justify-center w-full h-10 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-gray-700';

const TOOLBAR_BUTTON_ACCENT = `${TOOLBAR_BUTTON_BASE} !bg-green-50 !border-green-300 !text-green-700 hover:!bg-green-100`;

const TOOLBAR_BUTTON_PRIMARY =
  'flex items-center justify-center w-full h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors';

const STYLE_BUTTON_BASE =
  'flex items-center justify-center w-9 h-9 border rounded-md text-sm font-semibold transition-colors';

const STYLE_ACTIVE_CLASSES = 'bg-blue-100 border-blue-400 text-blue-700';
const STYLE_INACTIVE_CLASSES = 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100';

const getTextStyleClasses = (style = {}) => {
  const classes = [];
  if (style.bold) classes.push('font-semibold');
  if (style.italic) classes.push('italic');
  if (style.underline) classes.push('underline');
  return classes.join(' ');
};

const StructuredContentEditor = ({ content, onChange, onImageUpload }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedText, setSelectedText] = useState({ blockIndex: null, text: '', start: 0, end: 0 });
  const [linkDialog, setLinkDialog] = useState({ isOpen: false, url: '', isEdit: false, linkText: '' });
  const contentEditableRefs = useRef({});

  const toggleStyle = (index, styleKey, targetKey = 'style') => {
    const block = content[index];
    const currentStyle = {
      ...DEFAULT_TEXT_STYLE(),
      ...(block?.[targetKey] || {}),
    };
    const updatedStyle = {
      ...currentStyle,
      [styleKey]: !currentStyle[styleKey],
    };
    updateBlock(index, {
      ...block,
      [targetKey]: updatedStyle,
    });
  };

  const renderStyleControls = (style = {}, index, targetKey = 'style') => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => toggleStyle(index, 'bold', targetKey)}
        className={`${STYLE_BUTTON_BASE} ${style.bold ? STYLE_ACTIVE_CLASSES : STYLE_INACTIVE_CLASSES}`}
        title="Bold"
      >
        B
      </button>
      <button
        type="button"
        onClick={() => toggleStyle(index, 'italic', targetKey)}
        className={`${STYLE_BUTTON_BASE} ${style.italic ? STYLE_ACTIVE_CLASSES : STYLE_INACTIVE_CLASSES}`}
        title="Italic"
      >
        I
      </button>
      <button
        type="button"
        onClick={() => toggleStyle(index, 'underline', targetKey)}
        className={`${STYLE_BUTTON_BASE} ${style.underline ? STYLE_ACTIVE_CLASSES : STYLE_INACTIVE_CLASSES}`}
        title="Underline"
      >
        U
      </button>
    </div>
  );

  const addBlock = (type) => {
    let newBlock = {};
    
    switch (type) {
      case 'paragraph':
        newBlock = { type: 'paragraph', content: '', style: DEFAULT_TEXT_STYLE() };
        break;
      case 'heading':
        newBlock = { type: 'heading', level: 2, content: '', style: DEFAULT_TEXT_STYLE() };
        break;
      case 'image':
        newBlock = { type: 'image', src: '', alt: '', caption: '' };
        break;
      case 'bulletList':
        newBlock = { type: 'bulletList', items: [''] };
        break;
      case 'numberedList':
        newBlock = { type: 'numberedList', items: [''] };
        break;
      case 'textBox':
        newBlock = {
          type: 'textBox',
          title: '',
          level: 3,
          content: '',
          titleStyle: DEFAULT_TEXT_STYLE(),
          bodyStyle: DEFAULT_TEXT_STYLE(),
        };
        break;
      case 'link':
        newBlock = { type: 'link', href: '', text: '', target: '_self' };
        break;
      case 'quote':
        newBlock = { type: 'quote', content: '', author: '' };
        break;
      case 'spacer':
        newBlock = { type: 'spacer' };
        break;
      default:
        newBlock = { type: 'paragraph', content: '' };
    }
    
    onChange([...content, newBlock]);
  };


  const updateBlock = (index, updatedBlock) => {
    const newContent = [...content];
    newContent[index] = updatedBlock;
    onChange(newContent);
  };

  const deleteBlock = (index) => {
    const newContent = content.filter((_, i) => i !== index);
    onChange(newContent);
  };

  const moveBlock = (index, direction) => {
    const newContent = [...content];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newContent.length) {
      [newContent[index], newContent[targetIndex]] = [newContent[targetIndex], newContent[index]];
      onChange(newContent);
    }
  };

  const handleImageUpload = async (file, blockIndex) => {
    try {
      const formData = new FormData();
      formData.append('images', file);
      
      const response = await onImageUpload(formData);
      if (response.success && response.data.uploadedImages.length > 0) {
        const imageUrl = response.data.uploadedImages[0].imageUrl;
        updateBlock(blockIndex, {
          ...content[blockIndex],
          src: imageUrl
        });
      }
    } catch (error) {
      console.error('Image upload failed:', error);
    }
  };

  // Convert markdown content to HTML for contentEditable display
  const markdownToHtml = (text) => {
    if (!text) return '';
    
    // Escape HTML to prevent XSS, then replace markdown links
    const escapeHtml = (str) => {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };
    
    // Replace markdown links [text](url) with HTML links
    let html = escapeHtml(text);
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      const normalizedUrl = normalizeUrl(url);
      const escapedText = escapeHtml(linkText);
      return `<a href="${normalizedUrl}" data-link-url="${normalizedUrl}" data-link-text="${escapedText}" class="underline cursor-pointer" contenteditable="false" onclick="return false;" style="text-decoration: underline; color: #025545;">${escapedText}</a>`;
    });
    
    // Convert newlines to <br>
    html = html.replace(/\n/g, '<br>');
    
    return html;
  };

  // Convert HTML content back to markdown format
  const htmlToMarkdown = (html) => {
    if (!html) return '';
    
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Replace HTML links with markdown format (use a[href] so we catch all links even if data-link-url is missing after serialization)
    const links = tempDiv.querySelectorAll('a[href]');
    links.forEach(link => {
      const url = link.getAttribute('data-link-url') || link.getAttribute('href') || '';
      const text = (link.textContent || link.innerText || '').trim();
      if (!url) return;
      const markdown = `[${text}](${url})`;
      
      // Create a text node with the markdown
      const textNode = document.createTextNode(markdown);
      link.parentNode.replaceChild(textNode, link);
    });
    
    // Get the text content which now has markdown links
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  // Handle text selection in contentEditable
  const handleContentEditableSelection = (e, blockIndex) => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = selection.toString().trim();
      
      if (selectedText && !range.collapsed) {
        setSelectedText({
          blockIndex,
          text: selectedText,
          start: 0, // Will be recalculated when saving
          end: 0
        });
      }
    }
  };

  // Handle context menu for adding/editing links
  const handleContextMenu = (e, blockIndex) => {
    const target = e.target;
    
    // Check if clicking on an existing link (support both data-link-url and plain href so right-click always finds the link)
    const linkElement = target.closest('a[data-link-url]') || target.closest('a[href]');
    if (linkElement) {
      e.preventDefault();
      const url = linkElement.getAttribute('data-link-url') || linkElement.href;
      const text = linkElement.textContent;
      
      setLinkDialog({
        isOpen: true,
        url: url,
        isEdit: true,
        linkText: text
      });
      
      // Store reference to the link element for editing
      setSelectedText({
        blockIndex,
        text: text,
        start: 0,
        end: 0,
        linkElement: linkElement
      });
      
      return;
    }
    
    // Check if it's a contentEditable div with selection
    if (target.contentEditable === 'true' || target.closest('[contenteditable="true"]')) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();
        
        if (selectedText && !range.collapsed && (content[blockIndex].type === 'paragraph' || content[blockIndex].type === 'heading')) {
          e.preventDefault();
          
          setSelectedText({
            blockIndex,
            text: selectedText,
            start: 0,
            end: 0
          });
          
          setContextMenu({
            x: e.clientX,
            y: e.clientY
          });
        }
      }
    }
  };

  const handleAddLink = () => {
    if (selectedText.blockIndex !== null && selectedText.text) {
      setLinkDialog({ isOpen: true, url: '', isEdit: false, linkText: selectedText.text });
      setContextMenu(null);
    }
  };

  // Normalize URL to ensure it has a protocol
  const normalizeUrl = (url) => {
    if (!url || !url.trim()) return url;
    
    const trimmedUrl = url.trim();
    
    // If it already has a protocol, return as is
    if (trimmedUrl.match(/^https?:\/\//i)) {
      return trimmedUrl;
    }
    
    // If it starts with //, add https:
    if (trimmedUrl.startsWith('//')) {
      return `https:${trimmedUrl}`;
    }
    
    // If it looks like a domain (contains a dot and no spaces), add https://
    if (trimmedUrl.includes('.') && !trimmedUrl.includes(' ')) {
      return `https://${trimmedUrl}`;
    }
    
    // Otherwise, assume it's a relative URL and return as is
    return trimmedUrl;
  };

  const handleSaveLink = () => {
    if (!linkDialog.url.trim()) {
      alert('Please enter a URL');
      return;
    }

    const { blockIndex, text, linkElement } = selectedText;
    const block = content[blockIndex];
    const editableDiv = contentEditableRefs.current[`${block.type}-${blockIndex}`];
    
    if (!editableDiv) return;
    
    // Normalize the URL to ensure it has a protocol
    const normalizedUrl = normalizeUrl(linkDialog.url);
    const linkText = linkDialog.linkText || text;
    
    if (linkDialog.isEdit && linkElement) {
      // Editing existing link
      linkElement.setAttribute('data-link-url', normalizedUrl);
      linkElement.setAttribute('href', normalizedUrl);
      linkElement.textContent = linkText;
    } else {
      // Adding new link
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Check if range is within the editable div
        if (editableDiv.contains(range.commonAncestorContainer) || editableDiv === range.commonAncestorContainer) {
          range.deleteContents();
          
          const link = document.createElement('a');
          link.href = normalizedUrl;
          link.setAttribute('data-link-url', normalizedUrl);
          link.setAttribute('data-link-text', linkText);
          link.className = 'underline cursor-pointer';
          link.style.textDecoration = 'underline';
          link.style.color = '#025545';
          link.contentEditable = 'false';
          link.textContent = linkText;
          link.onclick = (e) => {
            e.preventDefault();
            return false;
          };
          
          range.insertNode(link);
          
          // Move cursor after the link
          range.setStartAfter(link);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
    
    // Convert HTML back to markdown and update block
    const htmlContent = editableDiv.innerHTML;
    const markdownContent = htmlToMarkdown(htmlContent);
    
    updateBlock(blockIndex, {
      ...block,
      content: markdownContent
    });
    
    setLinkDialog({ isOpen: false, url: '', isEdit: false, linkText: '' });
    setSelectedText({ blockIndex: null, text: '', start: 0, end: 0 });
  };

  const handleRemoveLink = () => {
    const { blockIndex, linkElement } = selectedText;
    const block = content[blockIndex];
    const editableDiv = contentEditableRefs.current[`${block.type}-${blockIndex}`];
    
    if (!editableDiv) return;
    
    // If we have the link element reference, use it
    if (linkElement && linkElement.parentNode) {
      // Replace the link element with just its text content
      const linkText = linkElement.textContent || linkElement.innerText;
      const textNode = document.createTextNode(linkText);
      linkElement.parentNode.replaceChild(textNode, linkElement);
    } else {
      // Fallback: find the link by URL in the editable div (check all links with href)
      const linkUrl = normalizeUrl(linkDialog.url);
      const links = editableDiv.querySelectorAll('a[href]');
      links.forEach(link => {
        const linkDataUrl = link.getAttribute('data-link-url');
        const linkHref = link.getAttribute('href') || link.href;
        if (linkDataUrl === linkUrl || linkHref === linkUrl || linkHref.includes(linkUrl) || linkUrl.includes(linkHref)) {
          const linkText = link.textContent || link.innerText;
          const textNode = document.createTextNode(linkText);
          if (link.parentNode) {
            link.parentNode.replaceChild(textNode, link);
          }
        }
      });
    }
    
    // Convert HTML back to markdown and update block
    const htmlContent = editableDiv.innerHTML;
    const markdownContent = htmlToMarkdown(htmlContent);
    
    updateBlock(blockIndex, {
      ...block,
      content: markdownContent
    });
    
    setLinkDialog({ isOpen: false, url: '', isEdit: false, linkText: '' });
    setSelectedText({ blockIndex: null, text: '', start: 0, end: 0 });
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };
    
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // Close context menu on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setLinkDialog({ isOpen: false, url: '' });
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const renderBlockEditor = (block, index) => {
    return (
      <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4 bg-white">
        {/* Block Controls */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-gray-500 uppercase">
              {block.type.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            {(block.type === 'heading' || block.type === 'textBox') && (
              <select
                value={block.level}
                onChange={(e) => updateBlock(index, { ...block, level: parseInt(e.target.value) })}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              >
                <option value={1}>H1</option>
                <option value={2}>H2</option>
                <option value={3}>H3</option>
                <option value={4}>H4</option>
                <option value={5}>H5</option>
                <option value={6}>H6</option>
              </select>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => moveBlock(index, 'up')}
              disabled={index === 0}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveBlock(index, 'down')}
              disabled={index === content.length - 1}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => deleteBlock(index)}
              className="p-1 text-red-400 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Block Content Editor */}
        {block.type === 'paragraph' && (
          <div className="space-y-3">
            <ContentEditableBlock
              ref={(el) => { contentEditableRefs.current[`paragraph-${index}`] = el; }}
              blockIndex={index}
              block={block}
              onUpdate={(markdownContent) => updateBlock(index, { ...block, content: markdownContent })}
              onSelect={handleContentEditableSelection}
              onContextMenu={handleContextMenu}
              markdownToHtml={markdownToHtml}
              htmlToMarkdown={htmlToMarkdown}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px] outline-none"
              placeholder="Enter paragraph content..."
            />
            {renderStyleControls(block.style, index)}
            <div className="text-xs text-gray-500">
              <p className="mb-2">💡 <strong>Tip:</strong> Select text and right-click to add/edit a link. Links appear underlined.</p>
            </div>
          </div>
        )}

        {block.type === 'heading' && (
          <div className="space-y-2">
            <ContentEditableBlock
              ref={(el) => { contentEditableRefs.current[`heading-${index}`] = el; }}
              blockIndex={index}
              block={block}
              onUpdate={(markdownContent) => updateBlock(index, { ...block, content: markdownContent })}
              onSelect={handleContentEditableSelection}
              onContextMenu={handleContextMenu}
              markdownToHtml={markdownToHtml}
              htmlToMarkdown={htmlToMarkdown}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold outline-none"
              placeholder={`Enter H${block.level} heading...`}
            />
            {renderStyleControls(block.style, index)}
            <div className="text-xs text-gray-500">
              <p>💡 <strong>Tip:</strong> Select text and right-click to add/edit a link. Right-click on a link to edit it.</p>
            </div>
          </div>
        )}
        {block.type === 'heading' && (
          <div className="mt-2">
            {renderStyleControls(block.style, index)}
          </div>
        )}

        {block.type === 'textBox' && (
          <div className="space-y-3">
            <input
              type="text"
              value={block.title}
              onChange={(e) => updateBlock(index, { ...block, title: e.target.value })}
              placeholder={`Enter H${block.level || 3} heading...`}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
            />
            {renderStyleControls(block.titleStyle, index, 'titleStyle')}
            <textarea
              value={block.content}
              onChange={(e) => updateBlock(index, { ...block, content: e.target.value })}
              placeholder="Add supporting paragraph text..."
              rows="4"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {renderStyleControls(block.bodyStyle, index, 'bodyStyle')}
          </div>
        )}

        {block.type === 'image' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) handleImageUpload(file, index);
                }}
                className="hidden"
                id={`image-upload-${index}`}
              />
              <label
                htmlFor={`image-upload-${index}`}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
              </label>
              <span className="text-gray-500 text-sm">or</span>
              <input
                type="url"
                value={block.src}
                onChange={(e) => updateBlock(index, { ...block, src: e.target.value })}
                placeholder="Paste image URL..."
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {block.src && (
              <div className="space-y-2">
                <img
                  src={block.src}
                  alt="Preview"
                  className="max-w-full h-32 object-cover rounded-lg border border-gray-200"
                />
                <input
                  type="text"
                  value={block.alt}
                  onChange={(e) => updateBlock(index, { ...block, alt: e.target.value })}
                  placeholder="Alt text (for accessibility and SEO)"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 <strong>SEO Tip:</strong> Include your focus keyword in alt text when relevant
                </p>
                <input
                  type="text"
                  value={block.caption}
                  onChange={(e) => updateBlock(index, { ...block, caption: e.target.value })}
                  placeholder="Image caption (optional)"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>
        )}

        {block.type === 'bulletList' && (
          <div className="space-y-2">
            {block.items.map((item, itemIndex) => (
              <div key={itemIndex} className="flex items-center space-x-2">
                <span className="text-gray-500">•</span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newItems = [...block.items];
                    newItems[itemIndex] = e.target.value;
                    updateBlock(index, { ...block, items: newItems });
                  }}
                  placeholder="List item..."
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newItems = block.items.filter((_, i) => i !== itemIndex);
                    updateBlock(index, { ...block, items: newItems });
                  }}
                  className="p-1 text-red-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                updateBlock(index, { ...block, items: [...block.items, ''] });
              }}
              className="text-sm"
              style={{ color: '#025545' }}
              onMouseEnter={(e) => e.target.style.color = '#012f23'}
              onMouseLeave={(e) => e.target.style.color = '#025545'}
            >
              + Add item
            </button>
          </div>
        )}

        {block.type === 'numberedList' && (
          <div className="space-y-2">
            {block.items.map((item, itemIndex) => (
              <div key={itemIndex} className="flex items-center space-x-2">
                <span className="text-gray-500 w-6">{itemIndex + 1}.</span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newItems = [...block.items];
                    newItems[itemIndex] = e.target.value;
                    updateBlock(index, { ...block, items: newItems });
                  }}
                  placeholder="List item..."
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newItems = block.items.filter((_, i) => i !== itemIndex);
                    updateBlock(index, { ...block, items: newItems });
                  }}
                  className="p-1 text-red-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                updateBlock(index, { ...block, items: [...block.items, ''] });
              }}
              className="text-sm"
              style={{ color: '#025545' }}
              onMouseEnter={(e) => e.target.style.color = '#012f23'}
              onMouseLeave={(e) => e.target.style.color = '#025545'}
            >
              + Add item
            </button>
          </div>
        )}

        {block.type === 'quote' && (
          <div className="space-y-2">
            <textarea
              value={block.content}
              onChange={(e) => updateBlock(index, { ...block, content: e.target.value })}
              placeholder="Quote content..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="3"
            />
            <input
              type="text"
              value={block.author}
              onChange={(e) => updateBlock(index, { ...block, author: e.target.value })}
              placeholder="Quote author (optional)"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {block.type === 'spacer' && (
          <div className="py-4 text-center text-gray-400 text-sm border-2 border-dashed border-gray-300 rounded-lg">
            <Minus className="h-4 w-4 mx-auto mb-1" />
            <p>Spacer (1 line gap)</p>
          </div>
        )}
      </div>
    );
  };

  const renderPreview = () => {
    return (
      <div className="space-y-4">
        {content.map((block, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            {block.type === 'paragraph' && (
              <p className={`text-gray-700 leading-relaxed ${getTextStyleClasses(block.style)}`}>
                {(() => {
                  const parts = parseInlineLinks(block.content);
                  return parts.map((part, partIndex) => {
                    if (part.type === 'link') {
                      return (
                        <a
                          key={partIndex}
                          href={part.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-medium"
                          style={{ color: '#025545' }}
                          onMouseEnter={(e) => e.target.style.color = '#012f23'}
                          onMouseLeave={(e) => e.target.style.color = '#025545'}
                        >
                          {part.text}
                        </a>
                      );
                    }
                    return <span key={partIndex}>{part.content}</span>;
                  });
                })()}
              </p>
            )}
            
            {block.type === 'heading' && (() => {
              const HeadingTag = `h${block.level}`;
              const parts = parseInlineLinks(block.content);
              return (
                <HeadingTag className={`text-gray-900 font-semibold ${getTextStyleClasses(block.style)}`}>
                  {parts.map((part, partIndex) => {
                    if (part.type === 'link') {
                      return (
                        <a
                          key={partIndex}
                          href={part.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-medium"
                          style={{ color: '#025545' }}
                          onMouseEnter={(e) => e.target.style.color = '#012f23'}
                          onMouseLeave={(e) => e.target.style.color = '#025545'}
                        >
                          {part.text}
                        </a>
                      );
                    }
                    return <span key={partIndex}>{part.content}</span>;
                  })}
                </HeadingTag>
              );
            })()}
            
            {block.type === 'image' && block.src && (
              <div className="space-y-2">
                <img
                  src={block.src}
                  alt={block.alt}
                  className="w-full rounded-lg"
                />
                {block.caption && (
                  <p className="text-sm text-gray-600 italic text-center">{block.caption}</p>
                )}
              </div>
            )}
            
            {block.type === 'bulletList' && (
              <ul className="list-disc list-inside space-y-1">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="text-gray-700">{item}</li>
                ))}
              </ul>
            )}
            
            {block.type === 'numberedList' && (
              <ol className="list-decimal list-inside space-y-1">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="text-gray-700">{item}</li>
                ))}
              </ol>
            )}
            
            {block.type === 'quote' && (
              <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700">
                <p>"{block.content}"</p>
                {block.author && (
                  <cite className="text-sm text-gray-500 not-italic">— {block.author}</cite>
                )}
              </blockquote>
            )}

            {block.type === 'textBox' && (() => {
              const HeadingTag = `h${block.level || 3}`;
              const rawBody = parseInlineLinks(block.content || '');
              const bodyParts = Array.isArray(rawBody)
                ? rawBody
                : [{ type: 'text', content: rawBody || '' }];
              return (
                <div className="space-y-2">
                  {block.title && (
                    <HeadingTag className={`text-gray-900 font-semibold ${getTextStyleClasses(block.titleStyle)}`}>
                      {block.title}
                    </HeadingTag>
                  )}
                  <p className={`text-gray-700 leading-relaxed ${getTextStyleClasses(block.bodyStyle)}`}>
                    {bodyParts.map((part, partIndex) => {
                      if (part.type === 'link') {
                        return (
                          <a
                            key={partIndex}
                            href={part.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-medium"
                            style={{ color: '#025545' }}
                            onMouseEnter={(e) => e.target.style.color = '#012f23'}
                            onMouseLeave={(e) => e.target.style.color = '#025545'}
                          >
                            {part.text}
                          </a>
                        );
                      }
                      return <span key={partIndex}>{part.content}</span>;
                    })}
                  </p>
                </div>
              );
            })()}

            {block.type === 'spacer' && (
              <div className="h-6"></div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4 lg:flex lg:items-start lg:gap-6 relative">
      <style dangerouslySetInnerHTML={{
        __html: `
          [contenteditable][data-placeholder]:empty:before {
            content: attr(data-placeholder);
            color: #9ca3af;
            pointer-events: none;
          }
          [contenteditable] a[data-link-url] {
            text-decoration: underline !important;
            color: #025545 !important;
            cursor: pointer;
          }
          [contenteditable] a[data-link-url]:hover {
            color: #012f23 !important;
          }
        `
      }} />
      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-300 rounded-lg shadow-lg z-50 py-1"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleAddLink}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <Link className="h-4 w-4" />
            Add Link
          </button>
        </div>
      )}

      {/* Link Dialog */}
      {linkDialog.isOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {linkDialog.isEdit ? 'Edit Link' : 'Add Link'}
            </h3>
            <div className="space-y-4">
              {!linkDialog.isEdit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selected Text
                  </label>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded border">
                    {selectedText.text}
                  </p>
                </div>
              )}
              {linkDialog.isEdit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link Text
                  </label>
                  <input
                    type="text"
                    value={linkDialog.linkText}
                    onChange={(e) => setLinkDialog({ ...linkDialog, linkText: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <input
                  type="text"
                  value={linkDialog.url}
                  onChange={(e) => setLinkDialog({ ...linkDialog, url: e.target.value })}
                  placeholder="https://example.com or example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveLink();
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter full URL (e.g., https://google.com) or domain (e.g., google.com)
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center mt-6">
              {linkDialog.isEdit && (
                <button
                  type="button"
                  onClick={handleRemoveLink}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Remove Link
                </button>
              )}
              <div className="flex justify-end gap-3 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setLinkDialog({ isOpen: false, url: '', isEdit: false, linkText: '' });
                    setSelectedText({ blockIndex: null, text: '', start: 0, end: 0 });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveLink}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  {linkDialog.isEdit ? 'Update Link' : 'Add Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="lg:sticky lg:top-24 lg:self-start w-full lg:w-[72px] flex flex-col items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex flex-col items-center gap-2 w-full">
          <button
            type="button"
            onClick={() => addBlock('paragraph')}
            className={TOOLBAR_BUTTON_BASE}
            title="Paragraph"
          >
            <Type className="h-5 w-5" aria-hidden />
          </button>
          
          <button
            type="button"
            onClick={() => addBlock('heading')}
            className={TOOLBAR_BUTTON_BASE}
            title="Heading"
          >
            <Heading className="h-5 w-5" aria-hidden />
          </button>
          
          <button
            type="button"
            onClick={() => addBlock('image')}
            className={TOOLBAR_BUTTON_BASE}
            title="Image"
          >
            <Image className="h-5 w-5" aria-hidden />
          </button>
          
          <button
            type="button"
            onClick={() => addBlock('bulletList')}
            className={TOOLBAR_BUTTON_BASE}
            title="Bullet list"
          >
            <List className="h-5 w-5" aria-hidden />
          </button>
          
          <button
            type="button"
            onClick={() => addBlock('numberedList')}
            className={TOOLBAR_BUTTON_BASE}
            title="Numbered list"
          >
            <List className="h-5 w-5" aria-hidden />
          </button>
          
          <button
            type="button"
            onClick={() => addBlock('quote')}
            className={TOOLBAR_BUTTON_BASE}
            title="Quote"
          >
            <Quote className="h-5 w-5" aria-hidden />
          </button>
          
          <button
            type="button"
            onClick={() => addBlock('textBox')}
            className={TOOLBAR_BUTTON_BASE}
            title="Text box"
          >
            <FileText className="h-5 w-5" aria-hidden />
          </button>
          
          <button
            type="button"
            onClick={() => addBlock('spacer')}
            className={TOOLBAR_BUTTON_BASE}
            title="Add space (1 line gap)"
          >
            <Minus className="h-5 w-5" aria-hidden />
          </button>
        </div>
        
        <div className="flex justify-end w-full">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={TOOLBAR_BUTTON_PRIMARY}
            title={showPreview ? 'Switch to edit mode' : 'Switch to preview mode'}
          >
            {showPreview ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[500px] flex-1">
        {showPreview ? renderPreview() : (
          <div className="space-y-4">
            {content.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg mb-2">No content blocks yet</p>
                <p className="text-sm">Click the buttons above to add content blocks</p>
              </div>
            ) : (
              content.map((block, index) => renderBlockEditor(block, index))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StructuredContentEditor;
