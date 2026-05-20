'use client';

import { BLOG_BODY_IMAGE_MAX_WIDTH } from '@/constants/heroTypography';
import { getBlogDocumentEditorTypographyCss } from '../constants/blogContentTypographyCss';
import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bold, 
  Italic, 
  Underline,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Image as ImageIcon,
  Quote,
  Type,
  X,
  Check,
  Trash2
} from 'lucide-react';

/**
 * Google Docs / Wix-style document editor
 * - Click anywhere to type
 * - Floating toolbar on text selection
 * - Type "/" to insert blocks
 * - Clean, minimal UI
 */
/** Toolbar state derived from current selection (Google Docs / Notion style) */
export const getDefaultToolbarState = () => ({
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  blockType: 'p',
  inLink: false,
  linkHref: '',
  textColor: null,
  highlight: null,
  fontSize: null,
  fontFamily: null,
  listType: null, // 'ul' | 'ol' | null
  alignment: 'justify', // default; 'left' | 'center' | 'right' | 'justify'
  hasSelection: false,
});

const DocumentStyleEditor = forwardRef(function DocumentStyleEditor({ 
  content = '', 
  onChange,
  onImageUpload,
  placeholder = 'Start writing...',
  hideInsertImageBar = false,
  onToolbarStateChange,
  /** When set (e.g. "[data-blog-cms-editor]"), all editor styles are scoped to this selector so the CMS does not rely on global CSS. */
  scopeSelector = '',
}, ref) {
  const sel = scopeSelector ? `${scopeSelector} .document-editor` : '.document-editor';
  const useScopedStylesOnly = Boolean(scopeSelector);
  const editorRef = useRef(null);
  const savedSelectionRef = useRef(null); // store last cursor/selection in editor so we can insert image there
  const selectionWhenToolbarShownRef = useRef(null);
  const toolbarBlockIndexRef = useRef(null); // index of selected block when toolbar opened (survives re-render)
  const skipContentSyncRef = useRef(false); // prevent useEffect from overwriting editor right after we insert image
  const linkRangeRef = useRef(null); // store range when opening link dialog so we can insert link after user fills URL
  const linkElementRef = useRef(null); // when editing existing link, store the <a> element
  const insertionMarkerRef = useRef(null); // marker for image insertion point (survives async upload)
  const toolbarRef = useRef(null);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0, visible: false });
  const [linkDialog, setLinkDialog] = useState({ visible: false, url: '', text: '', isEdit: false });
  const [linkDialogPosition, setLinkDialogPosition] = useState({ top: 0, left: 0 });
  const [slashMenu, setSlashMenu] = useState({ visible: false, position: { top: 0, left: 0 } });
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, onImage: false });
  const [selectedText, setSelectedText] = useState('');
  const [floatingBlockMenuOpen, setFloatingBlockMenuOpen] = useState(false);
  const [floatingSizeMenuOpen, setFloatingSizeMenuOpen] = useState(false);
  const contextMenuRef = useRef(null);
  const contextMenuImageWrapperRef = useRef(null);
  const draggedImageBlockRef = useRef(null);
  const lastToolbarStateRef = useRef(null);

  // Ensure Enter creates <p> tags for proper new lines on frontend
  useEffect(() => {
    if (editorRef.current && document.queryCommandSupported?.('defaultParagraphSeparator')) {
      try {
        document.execCommand('defaultParagraphSeparator', false, 'p');
      } catch (_) {}
    }
  }, []);

  // Normalize HTML: convert empty headings/blockquotes/divs to paragraphs (SEO + proper line gaps)
  const normalizeBlankBlocksToParagraphs = useCallback((html) => {
    if (!html || typeof html !== 'string') return html;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const sel = 'h1, h2, h3, h4, h5, h6, blockquote';
    doc.querySelectorAll?.(sel)?.forEach((el) => {
      const text = (el.textContent || '').trim();
      const onlyBr = el.querySelectorAll?.('br')?.length >= 1 && !text;
      if (!text && (onlyBr || el.childNodes.length === 0)) {
        const p = doc.createElement('p');
        p.innerHTML = '<br>';
        el.parentNode?.replaceChild(p, el);
      }
    });
    return doc.body?.innerHTML ?? html;
  }, []);

  // Initialize editor content (don't overwrite right after we inserted image - parent state may not have updated yet)
  useEffect(() => {
    if (skipContentSyncRef.current) return;
    if (editorRef.current) {
      if (content && content !== editorRef.current.innerHTML) {
        const normalized = normalizeBlankBlocksToParagraphs(content);
        editorRef.current.innerHTML = normalized || content;
      } else if (!content && !editorRef.current.innerHTML) {
        editorRef.current.innerHTML = '';
      }
      const editor = editorRef.current;
      editor.querySelectorAll?.('.doc-editor-img-block, .document-editor-image-wrapper').forEach((el) => {
        el.setAttribute('data-draggable-image', 'true');
        // Normalize legacy inline sizing; body images match public post (narrower than full column).
        el.style.setProperty('display', 'block', 'important');
        el.style.setProperty('width', '100%', 'important');
        el.style.setProperty('max-width', BLOG_BODY_IMAGE_MAX_WIDTH, 'important');
        el.style.setProperty('margin-left', 'auto', 'important');
        el.style.setProperty('margin-right', 'auto', 'important');
        const imgEl = el.querySelector('img');
        if (imgEl) {
          imgEl.removeAttribute('width');
          imgEl.removeAttribute('height');
          imgEl.style.setProperty('display', 'block', 'important');
          imgEl.style.setProperty('width', '100%', 'important');
          imgEl.style.setProperty('min-width', '0', 'important');
          imgEl.style.setProperty('max-width', '100%', 'important');
          imgEl.style.setProperty('height', 'auto', 'important');
          imgEl.style.setProperty('max-height', 'none', 'important');
          imgEl.style.setProperty('object-fit', 'cover', 'important');
        }
        if (!el.querySelector('.doc-editor-img-overlay')) {
          const overlay = document.createElement('div');
          overlay.className = 'doc-editor-img-overlay';
          overlay.setAttribute('draggable', 'true');
          overlay.setAttribute('contenteditable', 'false');
          const first = el.querySelector('img');
          if (first) first.after(overlay);
          else el.appendChild(overlay);
        }
        let handle = el.querySelector('.doc-editor-img-drag-handle');
        if (!handle) {
          handle = document.createElement('div');
          handle.className = 'doc-editor-img-drag-handle';
          handle.setAttribute('draggable', 'true');
          handle.setAttribute('contenteditable', 'false');
          handle.textContent = '⋮⋮ Drag to move';
          el.appendChild(handle);
        }
      });
    }
  }, [content, normalizeBlankBlocksToParagraphs]);

  // Handle content changes
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      if (html !== content) onChange?.(html);
    }
  }, [onChange, content]);

  // Compute toolbar state from current selection (context-aware like Google Docs / Notion)
  const computeToolbarState = useCallback(() => {
    const editor = editorRef.current;
    const state = getDefaultToolbarState();
    if (!editor) return state;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return state;
    const range = sel.getRangeAt(0);
    try {
      if (!editor.contains(range.commonAncestorContainer)) return state;
    } catch (_) {
      return state;
    }
    state.hasSelection = !range.collapsed;
    try {
      state.bold = document.queryCommandState('bold');
      state.italic = document.queryCommandState('italic');
      state.underline = document.queryCommandState('underline');
      state.strike = document.queryCommandState('strikeThrough');
    } catch (_) {}
    const blockSelector = 'p, h1, h2, h3, h4, h5, h6, div, blockquote, li';
    // Use startContainer so we get the block where the selection starts; then get innermost (leaf) block
    // so the toolbar shows the real block type (e.g. h4 after changing from p), not a wrapper div (which would show as p).
    let node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    let block = node?.nodeType === Node.ELEMENT_NODE ? node.closest?.(blockSelector) : null;
    if (block && editor.contains(block) && block !== editor) {
      let inner = block.querySelector(blockSelector);
      while (inner && inner !== block && block.contains(inner) && inner.contains(range.startContainer)) {
        block = inner;
        inner = block.querySelector(blockSelector);
      }
    }
    if (block && block !== editor) {
      const tag = block.tagName?.toLowerCase();
      if (tag === 'h1') state.blockType = 'h1';
      else if (tag === 'h2') state.blockType = 'h2';
      else if (tag === 'h3') state.blockType = 'h3';
      else if (tag === 'h4') state.blockType = 'h4';
      else if (tag === 'blockquote') state.blockType = 'quote';
      else if (tag === 'pre') state.blockType = 'code';
      else state.blockType = 'p';
      let align = (block.style?.textAlign || block.getAttribute?.('style')?.match(/text-align:\s*(\w+)/)?.[1] || '').trim();
      if (align === 'start') align = 'left';
      if (align === 'end') align = 'right';
      state.alignment = align || 'justify';
      if (tag === 'li') {
        const list = block.closest?.('ul');
        state.listType = list ? 'ul' : (block.closest?.('ol') ? 'ol' : null);
      }
    }
    const startEl = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer;
    const link = startEl?.closest?.('a');
    if (link && editor.contains(link)) {
      state.inLink = true;
      state.linkHref = link.getAttribute('href') || '';
    }
    const span = startEl?.closest?.('span');
    if (span?.style?.color) state.textColor = span.style.color;
    if (span?.style?.backgroundColor || span?.style?.background) state.highlight = span.style.backgroundColor || span.style.background;
    if (span?.style?.fontSize) state.fontSize = span.style.fontSize;
    if (span?.style?.fontFamily) state.fontFamily = span.style.fontFamily;
    return state;
  }, []);

  const syncToolbarState = useCallback(() => {
    const state = computeToolbarState();
    const prev = lastToolbarStateRef.current;
    if (prev && JSON.stringify(prev) === JSON.stringify(state)) return;
    lastToolbarStateRef.current = state;
    onToolbarStateChange?.(state);
  }, [computeToolbarState, onToolbarStateChange]);

  // Convert plain text to HTML - like Google Docs: bullets + text on same line, normal spacing
  const plainTextToHtml = useCallback((text) => {
    if (!text || typeof text !== 'string') return '';
    
    const blocks = text.split(/\n\n+/);
    const bulletChar = /^[\u2022\u2023\u25E6\u2043\u2219\-\*]\s*$/;  // bullet alone on line
    const bulletWithText = /^[\u2022\u2023\u25E6\u2043\u2219\-\*]\s+(.+)$/;  // • text
    const numberedWithText = /^(\d+)[\.\)]\s+(.+)$/;

    return blocks.map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '<p><br></p>';
      
      const lines = trimmed.split(/\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return '<p><br></p>';
      
      // Build list items: merge "bullet on own line" + "text on next line" into one item (like Google Docs)
      const bulletItems = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (bulletChar.test(line) && i + 1 < lines.length && !bulletChar.test(lines[i + 1]) && !/^[\u2022\u2023\u25E6\u2043\u2219\-\*]\s+/.test(lines[i + 1])) {
          bulletItems.push(lines[i + 1]);
          i++;
        } else if (bulletWithText.test(line)) {
          bulletItems.push(line.replace(bulletWithText, '$1'));
        } else if (bulletChar.test(line)) {
          // bullet alone with no next line - skip or add empty
          bulletItems.push('');
        }
      }
      
      if (bulletItems.length > 0) {
        const items = bulletItems.map(t => `<li>${t}</li>`).join('');
        return `<ul>${items}</ul>`;
      }
      
      // Numbered list: "1." on one line + text on next, or "1. text" on one line
      const numberedItems = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^\d+[\.\)]\s*$/.test(line) && i + 1 < lines.length) {
          numberedItems.push(lines[i + 1]);
          i++;
        } else {
          const m2 = line.match(numberedWithText);
          if (m2) numberedItems.push(m2[2]);
        }
      }
      if (numberedItems.length >= 2) {
        const items = numberedItems.map(t => `<li>${t}</li>`).join('');
        return `<ol>${items}</ol>`;
      }
      
      return '<p>' + trimmed.replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }, []);

  // Check if element is empty/blank (no meaningful content - good for line gaps)
  const isBlankBlock = (el) => {
    const text = (el.textContent || '').trim();
    const hasOnlyBr = el.querySelectorAll?.('br')?.length === el.childNodes?.length;
    return !text && (hasOnlyBr || el.childNodes.length === 0);
  };

  // Sanitize pasted HTML: allow safe block elements only. Strip inline formatting (bold, italic, etc.) so paste is plain.
  const sanitizePasteHtml = useCallback((html) => {
    if (!html || typeof html !== 'string') return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // Only structural tags - no inline formatting (strong, b, em, i, u, span)
    const allowedTags = ['p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'blockquote'];
    const headingOrQuote = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'];
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.cloneNode(true);
      if (node.nodeType !== Node.ELEMENT_NODE) return null;
      const tag = node.tagName?.toLowerCase();
      if (!tag || !allowedTags.includes(tag)) {
        // Unwrap: keep children but discard the tag (strips bold, italic, span, etc.)
        const frag = document.createDocumentFragment();
        [...node.childNodes].forEach((child) => {
          const c = walk(child);
          if (c) frag.appendChild(c);
        });
        return frag.childNodes.length ? frag : null;
      }
      // Empty headings, blockquotes -> paragraph (avoid SEO pollution, proper line gaps)
      const isBlank = isBlankBlock(node);
      const useTag = headingOrQuote.includes(tag) && isBlank ? 'p' : tag;
      const el = document.createElement(useTag);
      if (tag === 'a' && node.getAttribute('href') && useTag === 'a') el.setAttribute('href', node.getAttribute('href'));
      if (useTag === 'p' && isBlank) {
        el.innerHTML = '<br>';
        return el;
      }
      [...node.childNodes].forEach((child) => {
        const c = walk(child);
        if (c) el.appendChild(c);
      });
      return el;
    };
    const frag = document.createDocumentFragment();
    [...doc.body.childNodes].forEach((child) => {
      const c = walk(child);
      if (c) frag.appendChild(c);
    });
    const div = document.createElement('div');
    div.appendChild(frag);
    return div.innerHTML;
  }, []);

  const handlePaste = useCallback((e) => {
    const pastedHtml = e.clipboardData?.getData?.('text/html');
    const pastedText = e.clipboardData?.getData?.('text/plain') || '';
    if (!editorRef.current) return;

    e.preventDefault();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    let htmlToInsert = '';
    if (pastedHtml && pastedHtml.trim().length > 0 && /<(?:\w+)[^>]*>/i.test(pastedHtml)) {
      htmlToInsert = sanitizePasteHtml(pastedHtml);
      if (!htmlToInsert) htmlToInsert = plainTextToHtml(pastedText);
    } else {
      htmlToInsert = plainTextToHtml(pastedText);
    }

    if (!htmlToInsert) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const div = document.createElement('div');
    div.innerHTML = htmlToInsert;
    const frag = document.createDocumentFragment();
    while (div.firstChild) frag.appendChild(div.firstChild);
    range.insertNode(frag);
    selection.collapseToEnd();
    handleInput();
  }, [plainTextToHtml, sanitizePasteHtml, handleInput]);

  // Helper: is the node an image or inside an image block (floating toolbar / remove)
  const isImageOrInImageBlock = useCallback((node, editorEl) => {
    if (!node || !editorEl?.contains(node)) return false;
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!el) return false;
    if (el.tagName === 'IMG') return true;
    const block = el.closest?.('.doc-editor-img-block') || el.closest?.('.document-editor-image-wrapper');
    return !!(block && editorEl.contains(block));
  }, []);

  // Handle text selection for floating toolbar (also show when an image is selected so block-type works)
  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setToolbarPosition(prev => ({ ...prev, visible: false }));
      return;
    }

    const range = selection.getRangeAt(0);
    const editor = editorRef.current;
    const blockSelector = 'p, h1, h2, h3, h4, h5, h6, div, blockquote, li';

    if (range.collapsed) {
      setToolbarPosition(prev => ({ ...prev, visible: false }));
      return;
    }
    if (!editor?.contains(range.commonAncestorContainer)) {
      setToolbarPosition(prev => ({ ...prev, visible: false }));
      return;
    }

    const selectedText = selection.toString().trim();
    const anchorNode = selection.anchorNode;
    const imageSelected = !selectedText && (anchorNode && isImageOrInImageBlock(anchorNode, editor));

    if (!selectedText && !imageSelected) {
      setToolbarPosition(prev => ({ ...prev, visible: false }));
      return;
    }

    setSelectedText(selectedText || (imageSelected ? '[Image]' : ''));
    try {
      selectionWhenToolbarShownRef.current = range.cloneRange();
    } catch (_) {
      selectionWhenToolbarShownRef.current = null;
    }
    let startNode = range.startContainer;
    if (startNode.nodeType === Node.TEXT_NODE) startNode = startNode.parentNode;
    // When image is selected, startContainer may be the img; get the wrapper block (div)
    if (startNode?.nodeType === Node.ELEMENT_NODE && startNode.tagName === 'IMG') startNode = startNode.parentNode;
    let block = startNode?.nodeType === Node.ELEMENT_NODE ? startNode.closest?.(blockSelector) : null;
    if (block && editor?.contains(block) && block !== editor) {
      let inner = block.querySelector(blockSelector);
      while (inner && inner !== block && block.contains(inner) && inner.contains(range.startContainer)) {
        block = inner;
        inner = block.querySelector(blockSelector);
      }
      const leafBlocks = Array.from(editor.querySelectorAll(blockSelector)).filter((b) => {
        if (b.tagName === 'LI') return true; // Always include <li>
        return !b.querySelector(blockSelector);
      });
      const idx = leafBlocks.indexOf(block);
      toolbarBlockIndexRef.current = idx >= 0 ? idx : null;
    } else {
      toolbarBlockIndexRef.current = null;
    }
    const rect = range.getBoundingClientRect();
    const toolbarHeight = 48;
    const gap = 8;
    const minLeft = 280;
    const toolbarHalfWidth = 240;
    const minTop = 12;
    let left = rect.left + rect.width / 2;
    left = Math.max(minLeft, Math.min(left, typeof window !== 'undefined' ? window.innerWidth - toolbarHalfWidth : left));
    const topAbove = rect.top - toolbarHeight - gap;
    const top = typeof window !== 'undefined' && topAbove < minTop ? rect.bottom + gap : topAbove;
    setToolbarPosition({
      top,
      left,
      visible: true,
      above: topAbove >= minTop
    });
  }, []);

  // Restore saved selection and focus editor (so toolbar actions apply to selected text)
  const restoreSelection = useCallback(() => {
    const editor = editorRef.current;
    const saved = savedSelectionRef.current;
    if (!editor || !saved) return;
    try {
      const ancestor = saved.commonAncestorContainer;
      if (!ancestor || !editor.contains(ancestor)) return;
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(saved.cloneRange());
        editor.focus();
      }
    } catch (_) {}
  }, []);

  // Restore selection from when the floating toolbar was shown (so block-type change has a range)
  const restoreToolbarSelection = useCallback(() => {
    const editor = editorRef.current;
    const saved = selectionWhenToolbarShownRef.current;
    if (!editor || !saved) return;
    try {
      if (!saved.startContainer || !editor.contains(saved.startContainer)) return;
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(saved.cloneRange());
        editor.focus();
      }
    } catch (_) {}
  }, []);

  // Run a command with selection restored and editor focused (for toolbar – like Google Docs)
  // Use current selection if it's still in the editor; otherwise restore from saved (from toolbar mousedown capture)
  const runWithSelection = useCallback((fn) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    const hasSelectionInEditor = sel?.rangeCount > 0 && (() => {
      try {
        const range = sel.getRangeAt(0);
        return editor.contains(range.commonAncestorContainer);
      } catch (_) {
        return false;
      }
    })();
    if (!hasSelectionInEditor) restoreSelection();
    if (typeof fn === 'function') fn();
    handleInput();
    setToolbarPosition(prev => ({ ...prev, visible: false }));
    syncToolbarState();
  }, [handleInput, restoreSelection, syncToolbarState]);

  // Format text (restore selection first so it applies to selected text when called from top toolbar)
  const formatText = useCallback((command, value = null) => {
    runWithSelection(() => document.execCommand(command, false, value));
  }, [runWithSelection]);

  const applyInlineStyleToRangeText = useCallback((range, styleApplier) => {
    const editor = editorRef.current;
    if (!editor || !range || range.collapsed) return false;

    const textNodes = [];
    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node?.textContent?.trim()) return NodeFilter.FILTER_REJECT;
          try {
            return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          } catch (_) {
            return NodeFilter.FILTER_REJECT;
          }
        }
      }
    );

    let currentNode = walker.nextNode();
    while (currentNode) {
      textNodes.push(currentNode);
      currentNode = walker.nextNode();
    }
    if (textNodes.length === 0) return false;

    for (let i = textNodes.length - 1; i >= 0; i -= 1) {
      const textNode = textNodes[i];
      const fullText = textNode.textContent || '';
      let startOffset = 0;
      let endOffset = fullText.length;

      if (textNode === range.startContainer) startOffset = range.startOffset;
      if (textNode === range.endContainer) endOffset = range.endOffset;
      if (startOffset >= endOffset) continue;

      let selectedNode = textNode;
      if (endOffset < selectedNode.textContent.length) {
        selectedNode.splitText(endOffset);
      }
      if (startOffset > 0) {
        selectedNode = selectedNode.splitText(startOffset);
      }

      const span = document.createElement('span');
      styleApplier(span);
      selectedNode.parentNode?.insertBefore(span, selectedNode);
      span.appendChild(selectedNode);
    }

    return true;
  }, []);

  const getSelectedEditorBlocks = useCallback((range) => {
    const editor = editorRef.current;
    if (!editor || !range) return [];

    const blockSelector = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, div';
    const normalizeBlock = (node) => {
      if (!node) return null;
      const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      const block = el?.closest?.(blockSelector);
      return block && editor.contains(block) && block !== editor ? block : null;
    };

    const blocks = new Set();
    const startBlock = normalizeBlock(range.startContainer);
    const endBlock = normalizeBlock(range.endContainer);
    if (startBlock) blocks.add(startBlock);
    if (endBlock) blocks.add(endBlock);

    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          if (!(node instanceof Element)) return NodeFilter.FILTER_SKIP;
          if (!node.matches(blockSelector) || node === editor) return NodeFilter.FILTER_SKIP;
          try {
            return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
          } catch (_) {
            return NodeFilter.FILTER_SKIP;
          }
        }
      }
    );

    let currentNode = walker.nextNode();
    while (currentNode) {
      blocks.add(currentNode);
      currentNode = walker.nextNode();
    }

    return Array.from(blocks).filter((block) => (
      block instanceof Element
      && !block.classList.contains('doc-editor-img-block')
      && !block.classList.contains('document-editor-image-wrapper')
    ));
  }, []);

  const applyFontSizeToBlocks = useCallback((blocks, px) => {
    if (!Array.isArray(blocks) || blocks.length === 0) return false;

    const lineHeightByTag = (tagName) => {
      if (tagName === 'h1') return Math.round(px * 1.2);
      if (tagName === 'h2' || tagName === 'h3' || tagName === 'h4' || tagName === 'h5' || tagName === 'h6') {
        return Math.round(px * 1.25);
      }
      return Math.round(px * 1.5);
    };

    blocks.forEach((block) => {
      const tag = block.tagName.toLowerCase();
      block.style.setProperty('font-size', `${px}px`, 'important');
      block.style.setProperty('line-height', `${lineHeightByTag(tag)}px`, 'important');
    });

    return true;
  }, []);

  // Handle link: add new or edit existing (save range so it works after dialog steals focus)
  const handleAddLink = useCallback(() => {
    let selection = window.getSelection();
    const inEditor = selection?.rangeCount > 0 && editorRef.current?.contains(selection.getRangeAt(0).commonAncestorContainer);
    if (!inEditor || (selection.rangeCount > 0 && selection.isCollapsed)) {
      restoreSelection();
      selection = window.getSelection();
    }
    linkElementRef.current = null;
    const anchor = selection?.anchorNode && selection.anchorNode.nodeType === Node.ELEMENT_NODE
      ? selection.anchorNode
      : selection?.anchorNode?.parentElement;
    const existingLink = anchor?.closest?.('a');
    if (existingLink && editorRef.current?.contains(existingLink)) {
      linkElementRef.current = existingLink;
      const url = existingLink.getAttribute('href') || '';
      const text = existingLink.textContent || '';
      setLinkDialogPosition({ top: toolbarPosition.top, left: toolbarPosition.left });
      setLinkDialog({ visible: true, url, text, isEdit: true });
      return;
    }
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      try {
        linkRangeRef.current = selection.getRangeAt(0).cloneRange();
      } catch (_) {
        linkRangeRef.current = null;
      }
      setLinkDialogPosition({ top: toolbarPosition.top, left: toolbarPosition.left });
      setLinkDialog({ visible: true, url: '', text: selection.toString(), isEdit: false });
    }
  }, [toolbarPosition.top, toolbarPosition.left, restoreSelection]);

  const handleSaveLink = useCallback(() => {
    if (!linkDialog.url.trim()) return;
    const href = linkDialog.url.startsWith('http') ? linkDialog.url : `https://${linkDialog.url}`;
    const text = linkDialog.text?.trim() || linkDialog.url;

    if (linkElementRef.current && editorRef.current?.contains(linkElementRef.current)) {
      linkElementRef.current.href = href;
      linkElementRef.current.textContent = text;
      linkElementRef.current.className = 'document-editor-link underline';
      linkElementRef.current.target = '_blank';
      linkElementRef.current.rel = 'noopener noreferrer';
      linkElementRef.current = null;
      handleInput();
    } else if (linkRangeRef.current && editorRef.current?.contains(linkRangeRef.current.commonAncestorContainer)) {
      try {
        const range = linkRangeRef.current;
        const link = document.createElement('a');
        link.href = href;
        link.textContent = text;
        link.className = 'document-editor-link underline';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        range.deleteContents();
        range.insertNode(link);
        window.getSelection()?.removeAllRanges();
        handleInput();
      } catch (_) {}
      linkRangeRef.current = null;
    } else {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (!range.collapsed) {
          const link = document.createElement('a');
          link.href = href;
          link.textContent = text;
          link.className = 'document-editor-link underline';
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          range.deleteContents();
          range.insertNode(link);
          selection.removeAllRanges();
          handleInput();
        }
      }
      linkRangeRef.current = null;
    }
    setLinkDialog({ visible: false, url: '', text: '', isEdit: false });
    setToolbarPosition(prev => ({ ...prev, visible: false }));
  }, [linkDialog, handleInput]);

  // Save cursor/selection when user interacts with editor (so we can insert image at that position later)
  const saveSelection = useCallback(() => {
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (!editor || !sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!range || !editor.contains(range.commonAncestorContainer)) return;
    // When editor doesn't have focus (user clicked toolbar/dropdown), don't overwrite – preserve
    // so setBlockType applies to the right block (e.g. image block when image was selected).
    try {
      const editorHasFocus = document.activeElement === editor;
      const hadSaved = savedSelectionRef.current && editor.contains(savedSelectionRef.current.commonAncestorContainer);
      if (!editorHasFocus && hadSaved) return;
      savedSelectionRef.current = range.cloneRange();
      // Also save block index for setBlockType fallback when selection is lost
      const blockSelector = 'p, h1, h2, h3, h4, h5, h6, div, blockquote, li';
      let n = range.startContainer;
      if (n.nodeType === Node.TEXT_NODE) n = n.parentNode;
      if (n?.nodeType === Node.ELEMENT_NODE && n.tagName === 'IMG') n = n.parentNode;
      const block = n?.nodeType === Node.ELEMENT_NODE ? n.closest?.(blockSelector) : null;
      if (block && editor.contains(block) && block !== editor) {
        const leafBlocks = Array.from(editor.querySelectorAll(blockSelector)).filter((b) => {
          if (b.tagName === 'LI') return true; // Always include <li>
          return !b.querySelector(blockSelector);
        });
        const idx = leafBlocks.indexOf(block);
        toolbarBlockIndexRef.current = idx >= 0 ? idx : null;
      }
    } catch (_) {}
  }, []);

  // Listen to selection/cursor change: save selection, update floating toolbar, sync toolbar state
  useEffect(() => {
    const handleSelectionChange = () => {
      if (editorRef.current && !document.contains(editorRef.current)) return;
      saveSelection();
      handleSelection();
      syncToolbarState();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [saveSelection, handleSelection, syncToolbarState]);

  const handleContextMenu = useCallback((e) => {
    const target = e.target;
    if (!editorRef.current?.contains(target)) return;
    const link = target.closest?.('a');
    if (link && editorRef.current?.contains(link)) {
      e.preventDefault();
      linkElementRef.current = link;
      setLinkDialogPosition({ top: e.clientY - 10, left: e.clientX });
      setLinkDialog({
        visible: true,
        url: link.getAttribute('href') || '',
        text: link.textContent || '',
        isEdit: true
      });
      setContextMenu(prev => ({ ...prev, visible: false }));
      return;
    }
    let wrapper = null;
    if (target.tagName === 'IMG') wrapper = target.parentElement;
    else wrapper = target.closest?.('.doc-editor-img-block') || target.closest?.('.document-editor-image-wrapper');
    if (wrapper && (wrapper.classList?.contains('doc-editor-img-block') || wrapper.classList?.contains('document-editor-image-wrapper')) && wrapper.querySelector?.('img') && editorRef.current?.contains(wrapper)) {
      e.preventDefault();
      contextMenuImageWrapperRef.current = wrapper;
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY, onImage: true });
      return;
    }
    // Right-click elsewhere: show action context menu and save cursor so image/link insert here
    e.preventDefault();
    contextMenuImageWrapperRef.current = null;
    saveSelection();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, onImage: false });
  }, [saveSelection]);

  // Handle Enter/Backspace: list/heading behavior + slash menu.
  // - Enter: in list, empty bullet -> exit list and start normal paragraph.
  //          in heading/blockquote -> new line as paragraph (don't continue heading).
  // - Backspace: at start of bullet -> unwrap bullet into normal paragraph so it can be deleted/merged naturally.
  const handleKeyDown = useCallback((e) => {
    const editor = editorRef.current;
    if (!editor) return;

    // Custom Backspace behavior inside lists: allow deleting the bullet when caret is at start
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (!range.collapsed) return; // let browser handle range deletion
        const blockSelector = 'p, h1, h2, h3, h4, h5, h6, div, blockquote, li';
        let node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        const block = node?.nodeType === Node.ELEMENT_NODE ? node.closest?.(blockSelector) : null;
        const li = block?.tagName === 'LI' ? block : null;
        if (li && editor.contains(li)) {
          // If caret is at very start of the li, convert it to a normal paragraph so Backspace can remove/merge
          const atStart = range.startOffset === 0 && !li.previousSibling;
          if (atStart) {
            e.preventDefault();
            const p = document.createElement('p');
            p.innerHTML = li.innerHTML || '<br>';
            p.style.fontSize = '1rem';
            p.style.lineHeight = '1.75';
            p.style.fontWeight = 'normal';
            p.style.marginTop = '0';
            p.style.marginBottom = '1rem';
            const list = li.closest?.('ul') || li.closest?.('ol');
            if (list && list.parentNode) {
              if (list.previousSibling) {
                list.parentNode.insertBefore(p, list);
              } else {
                list.parentNode.insertBefore(p, list);
              }
            } else {
              editor.insertBefore(p, editor.firstChild);
            }
            li.remove();
            if (list && !list.querySelector('li')) list.remove();
            const r = document.createRange();
            r.setStart(p, 0);
            r.collapse(true);
            selection.removeAllRanges();
            selection.addRange(r);
            handleInput();
            return;
          }
        }
      }
    }

    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const blockSelector = 'p, h1, h2, h3, h4, h5, h6, div, blockquote, li';
        let node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        const block = node?.nodeType === Node.ELEMENT_NODE ? node.closest?.(blockSelector) : null;

        // In list: empty bullet -> exit to paragraph
        const li = block?.tagName === 'LI' ? block : null;
        if (li && editor.contains(li)) {
          const list = li.closest?.('ul') || li.closest?.('ol');
          const isEmpty = !li.textContent?.trim() || (li.childNodes.length === 1 && li.querySelector('br'));
          if (list && isEmpty) {
            e.preventDefault();
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            p.style.fontSize = '1rem';
            p.style.lineHeight = '1.75';
            p.style.fontWeight = 'normal';
            p.style.marginTop = '0';
            p.style.marginBottom = '1rem';
            // Insert after the list in its current parent so the cursor stays in place
            if (list.parentNode) {
              if (list.nextSibling) {
                list.parentNode.insertBefore(p, list.nextSibling);
              } else {
                list.parentNode.appendChild(p);
              }
            } else {
              editor.appendChild(p);
            }
            li.remove();
            if (!list.querySelector('li')) list.remove();
            const r = document.createRange();
            r.setStart(p, 0);
            r.collapse(true);
            selection.removeAllRanges();
            selection.addRange(r);
            handleInput();
            return;
          }
        }

        // In heading or blockquote: new line -> paragraph (don't continue as H1/H2/blockquote)
        if (block && editor.contains(block) && block !== editor) {
          const tag = block.tagName?.toLowerCase();
          if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6' || tag === 'blockquote') {
            e.preventDefault();
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            // Force paragraph-only cursor height (no heading size/gap)
            p.style.fontSize = '1rem';
            p.style.lineHeight = '1.75';
            p.style.fontWeight = 'normal';
            p.style.marginTop = '0';
            p.style.marginBottom = '1rem';
            // Insert after the heading/blockquote in its current parent so the cursor stays in place
            if (block.parentNode) {
              if (block.nextSibling) {
                block.parentNode.insertBefore(p, block.nextSibling);
              } else {
                block.parentNode.appendChild(p);
              }
            } else {
              editor.appendChild(p);
            }
            const r = document.createRange();
            r.setStart(p, 0);
            r.collapse(true);
            selection.removeAllRanges();
            selection.addRange(r);
            editor.focus();
            handleInput();
            return;
          }
        }
      }
    }

    if (e.key === '/' && editor) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const editorRect = editor.getBoundingClientRect();
        
        setSlashMenu({
          visible: true,
          position: {
            top: rect.top - editorRect.top + 20,
            left: rect.left - editorRect.left
          }
        });
      }
    }
  }, [handleInput]);

  // Create a simple image block: overlay + handle both draggable so image area shows grab and is grabbable.
  const createImageBlock = useCallback((imageUrl) => {
    const div = document.createElement('div');
    div.className = 'doc-editor-img-block';
    div.setAttribute('contenteditable', 'false');
    div.setAttribute('data-draggable-image', 'true');
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'Image';
    img.setAttribute('draggable', 'false');
    img.style.setProperty('display', 'block', 'important');
    img.style.setProperty('width', '100%', 'important');
    img.style.setProperty('min-width', '0', 'important');
    img.style.setProperty('max-width', '100%', 'important');
    img.style.setProperty('height', 'auto', 'important');
    img.style.setProperty('max-height', 'none', 'important');
    img.style.setProperty('object-fit', 'cover', 'important');
    div.appendChild(img);
    const overlay = document.createElement('div');
    overlay.className = 'doc-editor-img-overlay';
    overlay.setAttribute('draggable', 'true');
    overlay.setAttribute('contenteditable', 'false');
    div.appendChild(overlay);
    const handle = document.createElement('div');
    handle.className = 'doc-editor-img-drag-handle';
    handle.setAttribute('draggable', 'true');
    handle.setAttribute('contenteditable', 'false');
    handle.textContent = '⋮⋮ Drag to move';
    div.appendChild(handle);
    return div;
  }, []);

  const addParagraphAfterBlock = useCallback((block) => {
    const editor = editorRef.current;
    if (!editor || !block?.parentNode) return;
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    p.style.fontSize = '1rem';
    p.style.lineHeight = '1.75';
    p.style.fontWeight = 'normal';
    p.style.marginTop = '0';
    p.style.marginBottom = '1rem';
    if (block.nextSibling) editor.insertBefore(p, block.nextSibling);
    else editor.appendChild(p);
    const r = document.createRange();
    r.setStart(p, 0);
    r.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(r);
    handleInput();
  }, [handleInput]);

  const IMAGE_BLOCK_SELECTOR = '.doc-editor-img-block, .document-editor-image-wrapper';
  const DROP_BLOCK_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, blockquote, li, .doc-editor-img-block, .document-editor-image-wrapper';

  const handleImageDragStart = useCallback((e) => {
    const block = e.target.closest?.(IMAGE_BLOCK_SELECTOR);
    if (!block || !editorRef.current?.contains(block)) return;
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // required for Firefox
    draggedImageBlockRef.current = block;
    block.classList.add('doc-editor-img-dragging');
  }, []);

  const handleImageDragOver = useCallback((e) => {
    if (!draggedImageBlockRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleImageDrop = useCallback((e) => {
    const dragged = draggedImageBlockRef.current;
    const editor = editorRef.current;
    if (!dragged || !editor) return;
    e.preventDefault();

    // Compute insertion position based on mouse Y relative to all blocks,
    // so we can drop BETWEEN paragraphs/headings/images – not just top/bottom.
    const blocks = Array.from(
      editor.querySelectorAll(DROP_BLOCK_SELECTOR)
    ).filter((b) => b !== dragged && editor.contains(b));

    if (blocks.length === 0) {
      editor.appendChild(dragged);
    } else {
      const y = e.clientY;
      let insertBefore = null;
      for (const block of blocks) {
        const rect = block.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (y < mid) {
          insertBefore = block;
          break;
        }
      }
      if (insertBefore && insertBefore.parentNode) {
        insertBefore.parentNode.insertBefore(dragged, insertBefore);
      } else {
        editor.appendChild(dragged);
      }
    }

    dragged.classList.remove('doc-editor-img-dragging');
    draggedImageBlockRef.current = null;
    handleInput();
  }, [handleInput]);

  const handleImageDragEnd = useCallback((e) => {
    const block = e.target.closest?.(IMAGE_BLOCK_SELECTOR);
    if (block) block.classList.remove('doc-editor-img-dragging');
    draggedImageBlockRef.current = null;
  }, []);

  // Insert image at saved cursor/selection (file dialog – marker survives async upload)
  const insertImageAtSelection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !onImageUpload) return;

    const existingMarker = editor.querySelector('[data-insertion-marker]');
    if (existingMarker) existingMarker.remove();

    const sel = window.getSelection();
    let rangeToUse = null;
    if (sel?.rangeCount > 0) {
      const r = sel.getRangeAt(0);
      if (editor.contains(r?.commonAncestorContainer)) rangeToUse = r.cloneRange();
    }
    if (!rangeToUse && savedSelectionRef.current) {
      try {
        const saved = savedSelectionRef.current;
        if (saved && editor.contains(saved.commonAncestorContainer)) rangeToUse = saved.cloneRange();
      } catch (_) {}
    }

    if (rangeToUse) {
      try {
        rangeToUse.collapse(true);
        const blockSelector = 'p, h1, h2, h3, h4, h5, h6, li, blockquote';
        let node = rangeToUse.startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        const block = node?.nodeType === Node.ELEMENT_NODE ? node.closest?.(blockSelector) : null;
        if (block && editor.contains(block)) {
          rangeToUse.setStartAfter(block);
          rangeToUse.collapse(true);
        }
        const marker = document.createElement('span');
        marker.setAttribute('data-insertion-marker', 'true');
        marker.style.cssText = 'display:inline;width:0;height:0;overflow:hidden;position:absolute;pointer-events:none;';
        rangeToUse.insertNode(marker);
        insertionMarkerRef.current = marker;
      } catch (_) {}
    }

    skipContentSyncRef.current = true;
    const cancelCleanup = () => {
      const m = insertionMarkerRef.current;
      if (m?.parentNode) m.remove();
      insertionMarkerRef.current = null;
      skipContentSyncRef.current = false;
    };
    const cancelTimer = setTimeout(() => window.addEventListener('focus', cancelCleanup, { once: true }), 300);

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      window.clearTimeout(cancelTimer);
      window.removeEventListener('focus', cancelCleanup);
      const file = e.target.files?.[0];
      if (!file) { cancelCleanup(); return; }
      try {
        const result = await onImageUpload(file);
        if (!editorRef.current) { skipContentSyncRef.current = false; return; }
        const editorEl = editorRef.current;
        const imageUrl = result?.data?.imageUrl
          || (result?.data?.uploadedImages?.[0] && (result.data.uploadedImages[0].imageUrl || result.data.uploadedImages[0].url));
        if (result?.success && imageUrl) {
          const block = createImageBlock(imageUrl);
          const marker = editorEl.querySelector('[data-insertion-marker]');
          if (marker?.parentNode) {
            marker.parentNode.insertBefore(block, marker);
            marker.remove();
            insertionMarkerRef.current = null;
          } else {
            editorEl.appendChild(block);
          }
          addParagraphAfterBlock(block);
          setTimeout(() => {
            if (editorRef.current && editorRef.current.innerHTML !== content) onChange?.(editorRef.current.innerHTML);
            skipContentSyncRef.current = false;
          }, 0);
        } else {
          skipContentSyncRef.current = false;
        }
      } catch (err) {
        console.error(err);
        skipContentSyncRef.current = false;
      }
    };
    input.click();
  }, [onImageUpload, handleInput, content, onChange, createImageBlock, addParagraphAfterBlock]);

  // Insert image by URL at current/saved selection (e.g. sidebar upload)
  const insertImageByUrl = useCallback((imageUrl) => {
    const editor = editorRef.current;
    if (!editor || !imageUrl) return;
    const block = createImageBlock(imageUrl);

    const blockSelector = 'p, h1, h2, h3, h4, h5, h6, div, blockquote, li';
    const leafBlocks = () => Array.from(editor.querySelectorAll(blockSelector)).filter((b) => !b.querySelector(blockSelector));

    const sel = window.getSelection();
    let rangeToUse = null;
    if (sel?.rangeCount > 0) {
      try {
        const r = sel.getRangeAt(0);
        if (r && editor.contains(r.commonAncestorContainer)) rangeToUse = r.cloneRange();
      } catch (_) {}
    }
    if (!rangeToUse && savedSelectionRef.current) {
      try {
        const saved = savedSelectionRef.current;
        if (saved?.commonAncestorContainer && document.contains(saved.commonAncestorContainer) && editor.contains(saved.commonAncestorContainer)) {
          rangeToUse = saved.cloneRange();
        }
      } catch (_) {}
    }

    let inserted = false;
    if (rangeToUse) {
      try {
        rangeToUse.collapse(true);
        let node = rangeToUse.startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        const targetBlock = node?.nodeType === Node.ELEMENT_NODE ? node.closest?.(blockSelector) : null;
        if (targetBlock && editor.contains(targetBlock)) {
          rangeToUse.setStartAfter(targetBlock);
          rangeToUse.collapse(true);
        }
        rangeToUse.insertNode(block);
        inserted = true;
      } catch (_) {}
    }
    if (!inserted) {
      const idx = toolbarBlockIndexRef.current;
      const blocks = leafBlocks();
      const targetBlock = idx != null && idx >= 0 && idx < blocks.length ? blocks[idx] : null;
      if (targetBlock?.parentNode) {
        targetBlock.after(block);
        inserted = true;
      }
    }
    if (!inserted) editor.appendChild(block);

    addParagraphAfterBlock(block);
  }, [handleInput, createImageBlock, addParagraphAfterBlock]);

  // Remove the currently selected image (floating toolbar "Remove image" button)
  const removeSelectedImage = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    let range = null;
    const sel = window.getSelection();
    if (sel?.rangeCount > 0 && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      range = sel.getRangeAt(0);
    }
    if (!range && selectionWhenToolbarShownRef.current) {
      try {
        const saved = selectionWhenToolbarShownRef.current;
        if (saved?.startContainer && editor.contains(saved.startContainer)) range = saved;
      } catch (_) {}
    }
    if (!range && savedSelectionRef.current) {
      try {
        const saved = savedSelectionRef.current;
        if (saved?.commonAncestorContainer && editor.contains(saved.commonAncestorContainer)) range = saved;
      } catch (_) {}
    }
    if (!range) return;
    let node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    if (node?.nodeType === Node.ELEMENT_NODE && node.tagName === 'IMG') node = node.parentNode;
    const wrapper = node?.nodeType === Node.ELEMENT_NODE
      ? (node.closest?.('.doc-editor-img-block') || node.closest?.('.document-editor-image-wrapper'))
      : null;
    if (!wrapper || !wrapper.querySelector?.('img') || !editor.contains(wrapper)) return;
    const next = wrapper.nextSibling;
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    if (next) editor.insertBefore(p, next);
    else editor.appendChild(p);
    wrapper.remove();
    const r = document.createRange();
    r.setStart(p, 0);
    r.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(r);
    setToolbarPosition(prev => ({ ...prev, visible: false }));
    handleInput();
  }, [handleInput]);

  // Remove image by wrapper ref (used when "Remove image" is clicked from context menu)
  const removeImageByWrapperRef = useCallback(() => {
    const editor = editorRef.current;
    const wrapper = contextMenuImageWrapperRef.current;
    if (!editor || !wrapper || !wrapper.parentNode || !editor.contains(wrapper)) return;
    const next = wrapper.nextSibling;
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    if (next) editor.insertBefore(p, next);
    else editor.appendChild(p);
    wrapper.remove();
    contextMenuImageWrapperRef.current = null;
    const r = document.createRange();
    r.setStart(p, 0);
    r.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(r);
    handleInput();
  }, [handleInput]);

  // Add / edit / remove redirect link for image selected via context menu.
  const setImageLinkByWrapperRef = useCallback(() => {
    const editor = editorRef.current;
    const wrapper = contextMenuImageWrapperRef.current;
    if (!editor || !wrapper || !editor.contains(wrapper)) return;

    const img = wrapper.querySelector('img');
    if (!img) return;

    const currentAnchor = wrapper.querySelector('a[href]');
    const currentHref = currentAnchor?.getAttribute('href') || '';
    const input = window.prompt('Enter image link URL (leave empty to remove link)', currentHref);
    if (input === null) return;

    const raw = input.trim();
    if (!raw) {
      if (currentAnchor) {
        currentAnchor.replaceWith(img);
      }
      wrapper.removeAttribute('data-link-url');
      handleInput();
      return;
    }

    const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

    if (currentAnchor) {
      currentAnchor.setAttribute('href', href);
      currentAnchor.setAttribute('target', '_blank');
      currentAnchor.setAttribute('rel', 'noopener noreferrer');
      currentAnchor.className = 'document-editor-image-link';
    } else {
      const a = document.createElement('a');
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'document-editor-image-link';
      img.replaceWith(a);
      a.appendChild(img);
    }
    // Redundant persistence for frontend fallback click handling.
    wrapper.setAttribute('data-link-url', href);

    handleInput();
  }, [handleInput]);

  // Convert current block to new type (Google Docs style: Paragraph → Heading 1, etc.)
  const setBlockType = useCallback((type) => {
    const editor = editorRef.current;
    if (!editor) return;
    // CRITICAL: Capture saved selections BEFORE focus() - focus triggers selectionchange
    // which overwrites savedSelectionRef with the new cursor position (often wrong block)
    let savedRangeClone = null;
    let savedToolbarRangeClone = null;
    try {
      const saved = savedSelectionRef.current;
      if (saved && saved.commonAncestorContainer && document.contains(saved.commonAncestorContainer) && editor.contains(saved.commonAncestorContainer)) {
        savedRangeClone = saved.cloneRange();
      }
    } catch (_) {}
    try {
      const st = selectionWhenToolbarShownRef.current;
      if (st?.startContainer && document.contains(st.startContainer) && editor.contains(st.startContainer)) {
        savedToolbarRangeClone = st.cloneRange();
      }
    } catch (_) {}
    // Restore selection: prefer toolbar selection when valid so block-type from floating tooltip
    // always applies to the block that had the selection when the toolbar appeared (like the / menu).
    const rangeToRestore = savedToolbarRangeClone || savedRangeClone;
    if (rangeToRestore) {
      try {
        const sel = window.getSelection();
        if (sel && rangeToRestore.startContainer && document.contains(rangeToRestore.startContainer) && editor.contains(rangeToRestore.startContainer)) {
          sel.removeAllRanges();
          sel.addRange(rangeToRestore.cloneRange());
          editor.focus();
        }
      } catch (_) {}
    } else {
      restoreSelection();
    }
    let range = null;
    const sel = window.getSelection();
    if (sel?.rangeCount > 0) {
      try {
        const r = sel.getRangeAt(0);
        if (editor.contains(r.commonAncestorContainer)) range = r;
      } catch (_) {}
    }
    const blockSelector = 'p, h1, h2, h3, h4, h5, h6, div, blockquote, li';
    // For leaf blocks, include <li> even if it contains block children (we handle list items specially)
    const leafBlocks = Array.from(editor.querySelectorAll(blockSelector)).filter((b) => {
      if (b.tagName === 'LI') return true; // Always include <li> - we handle them specially
      return !b.querySelector(blockSelector);
    });
    const isBlockEmpty = (el) => !(el.textContent || '').trim() && (el.innerHTML.replace(/<br\s*\/?>/gi, '').replace(/\s/g, '').length === 0);
    let blockToReplace = null;
    // When we restored the toolbar selection (floating tooltip), use block index so only that block changes (like / menu).
    const fromFloatingToolbar = !!savedToolbarRangeClone;
    if (fromFloatingToolbar && toolbarBlockIndexRef.current != null && leafBlocks.length > 0) {
      const idx = toolbarBlockIndexRef.current;
      if (idx >= 0 && idx < leafBlocks.length) {
        blockToReplace = leafBlocks[idx];
        if (isBlockEmpty(blockToReplace)) {
          const nonEmpty = leafBlocks.filter((b) => !isBlockEmpty(b));
          blockToReplace = nonEmpty[0] ?? blockToReplace;
        }
      }
    }
    if (!blockToReplace && range) {
      // Resolve from current selection (e.g. when called from top toolbar or when image selected)
      let n = range.startContainer;
      if (n.nodeType === Node.TEXT_NODE) n = n.parentNode;
      if (n?.nodeType === Node.ELEMENT_NODE && n.tagName === 'IMG') n = n.parentNode;
      let startBlock = n?.nodeType === Node.ELEMENT_NODE ? n.closest?.(blockSelector) : null;
      if (startBlock && editor.contains(startBlock) && startBlock !== editor) {
        let inner = startBlock.querySelector(blockSelector);
        while (inner && inner !== startBlock && startBlock.contains(inner) && inner.contains(range.startContainer)) {
          startBlock = inner;
          inner = startBlock.querySelector(blockSelector);
        }
        blockToReplace = startBlock;
      }
      if (blockToReplace && isBlockEmpty(blockToReplace)) {
        const allBlocks = leafBlocks;
        const nonEmpty = allBlocks.filter((b) => !isBlockEmpty(b));
        const idx = allBlocks.indexOf(blockToReplace);
        if (nonEmpty.length > 0) {
          const nextNonEmpty = nonEmpty.find((b) => allBlocks.indexOf(b) >= idx) || nonEmpty[nonEmpty.length - 1];
          const prevNonEmpty = [...nonEmpty].reverse().find((b) => allBlocks.indexOf(b) <= idx) || nonEmpty[0];
          blockToReplace = prevNonEmpty || nextNonEmpty;
        }
      }
      if (!blockToReplace && range) {
        let node = range.commonAncestorContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        const block = node?.nodeType === Node.ELEMENT_NODE ? node.closest?.(blockSelector) : null;
        if (block && editor.contains(block) && block !== editor) blockToReplace = block;
      }
    }
    if (!blockToReplace && leafBlocks.length > 0) {
      blockToReplace = leafBlocks.find((b) => !isBlockEmpty(b)) ?? leafBlocks[0];
    }
    if (!blockToReplace || blockToReplace === editor) return;

    // Inside a list item: never replace <li> with a heading/paragraph block (breaks the list).
    // Wrap only the selection (or all children) so one bullet can contain e.g. <h4> + text.
    const applyBlockStyles = (el, blockType) => {
      el.style.marginTop = '0.35em';
      el.style.marginBottom = '0.35em';
      el.style.lineHeight = '1.45';
      if (blockType === 'h1') {
        el.style.fontSize = '1.875rem';
        el.style.fontWeight = '700';
      } else if (blockType === 'h2') {
        el.style.fontSize = '1.5rem';
        el.style.fontWeight = '600';
      } else if (blockType === 'h3') {
        el.style.fontSize = '1.25rem';
        el.style.fontWeight = '600';
      } else if (blockType === 'h4') {
        el.style.fontSize = '1.125rem';
        el.style.fontWeight = '600';
      } else if (blockType === 'quote') {
        el.style.borderLeft = '4px solid #d1d5db';
        el.style.paddingLeft = '1rem';
        el.style.fontStyle = 'italic';
        el.style.color = '#4b5563';
      } else if (blockType === 'code') {
        el.style.background = '#f3f4f6';
        el.style.padding = '1rem';
        el.style.borderRadius = '6px';
        el.style.overflowX = 'auto';
        el.style.fontFamily = 'ui-monospace, monospace';
        el.style.fontSize = '0.875rem';
      }
    };

    // Always use manual DOM replace – formatBlock/execCommand is unreliable across browsers/content
    const tag = type === 'p' ? 'p' : type === 'quote' ? 'blockquote' : type === 'code' ? 'pre' : type;
    const currentTag = blockToReplace.tagName.toLowerCase();
    const currentBlockType = currentTag === 'blockquote' ? 'quote' : currentTag === 'pre' ? 'code' : currentTag === 'p' ? 'p' : currentTag;

    // Check if we're inside a list item (either blockToReplace IS an <li>, or it's inside one)
    // This works for both <ul> (bullet) and <ol> (numbered) lists
    const parentLi = blockToReplace.tagName === 'LI' ? blockToReplace : blockToReplace.closest?.('li');
    const isInsideList = parentLi && editor.contains(parentLi);

    if (isInsideList && tag !== 'ul' && tag !== 'ol') {
      // Inside a list: wrap only the selected text in the new tag, keeping everything in the same <li>
      try {
        // Try to get a valid range - prefer savedToolbarRangeClone for floating toolbar actions
        // Clone ranges to avoid mutation issues
        let activeRange = null;
        if (savedToolbarRangeClone && !savedToolbarRangeClone.collapsed) {
          try {
            if (parentLi.contains(savedToolbarRangeClone.commonAncestorContainer)) {
              activeRange = savedToolbarRangeClone.cloneRange();
            }
          } catch (_) {}
        }
        if (!activeRange && savedRangeClone && !savedRangeClone.collapsed) {
          try {
            if (parentLi.contains(savedRangeClone.commonAncestorContainer)) {
              activeRange = savedRangeClone.cloneRange();
            }
          } catch (_) {}
        }
        if (!activeRange && range && !range.collapsed) {
          try {
            if (parentLi.contains(range.commonAncestorContainer)) {
              activeRange = range.cloneRange();
            }
          } catch (_) {}
        }
        
        const hasValidSelection = activeRange && !activeRange.collapsed;
        
        if (hasValidSelection) {
          // User selected specific text - wrap only that selection
          const selectedFragment = activeRange.extractContents();
          const newEl = document.createElement(tag);
          applyBlockStyles(newEl, type);
          if (tag === 'pre') {
            const code = document.createElement('code');
            while (selectedFragment.firstChild) code.appendChild(selectedFragment.firstChild);
            newEl.appendChild(code);
          } else {
            while (selectedFragment.firstChild) newEl.appendChild(selectedFragment.firstChild);
          }
          activeRange.insertNode(newEl);
          // Place cursor after the new element
          const newRange = document.createRange();
          newRange.setStartAfter(newEl);
          newRange.collapse(true);
          window.getSelection()?.removeAllRanges();
          window.getSelection()?.addRange(newRange);
        } else if (blockToReplace.tagName !== 'LI') {
          // Cursor is inside an existing block element (h4, p, etc.) inside the <li>
          // Replace that element's tag while keeping it inside the <li>
          const newEl = document.createElement(tag);
          applyBlockStyles(newEl, type);
          if (tag === 'pre') {
            const code = document.createElement('code');
            code.innerHTML = blockToReplace.innerHTML;
            newEl.appendChild(code);
          } else {
            newEl.innerHTML = blockToReplace.innerHTML;
          }
          blockToReplace.parentNode?.replaceChild(newEl, blockToReplace);
        } else {
          // blockToReplace IS the <li> and no selection - wrap all content in new tag
          const newEl = document.createElement(tag);
          applyBlockStyles(newEl, type);
          if (tag === 'pre') {
            const code = document.createElement('code');
            while (parentLi.firstChild) code.appendChild(parentLi.firstChild);
            newEl.appendChild(code);
          } else {
            while (parentLi.firstChild) newEl.appendChild(parentLi.firstChild);
          }
          parentLi.appendChild(newEl);
        }
        skipContentSyncRef.current = true;
        handleInput();
        setTimeout(() => {
          skipContentSyncRef.current = false;
        }, 0);
        return;
      } catch (err) {
        console.error('List item block type change failed:', err);
        /* fall through to normal block replace */
      }
    }

    // Check if selection covers only part of the block (then we split; only selected part gets new type)
    // Collapsed cursor = replace whole block; only multi-character selection can trigger split
    let selectionCoversWholeBlock = true;
    if (range && !range.collapsed && blockToReplace.contains(range.commonAncestorContainer)) {
      try {
        const blockRange = document.createRange();
        blockRange.selectNodeContents(blockToReplace);
        const startSame = range.compareBoundaryPoints(Range.START_TO_START, blockRange) <= 0;
        const endSame = range.compareBoundaryPoints(Range.END_TO_END, blockRange) >= 0;
        selectionCoversWholeBlock = startSame && endSame;
      } catch (_) {}
    }

    if (selectionCoversWholeBlock) {
      // Replace entire block (existing behavior)
      const newBlock = document.createElement(tag === 'pre' ? 'pre' : tag);
      applyBlockStyles(newBlock, type);
      if (tag === 'pre') {
        const code = document.createElement('code');
        code.innerHTML = blockToReplace.innerHTML;
        newBlock.appendChild(code);
      } else {
        newBlock.innerHTML = blockToReplace.innerHTML;
      }
      blockToReplace.parentNode?.replaceChild(newBlock, blockToReplace);
    } else {
      // Only selected part gets new type: split block into [before][selected as new type][after]
      try {
        const selectedFragment = range.extractContents();
        const blockRange = document.createRange();
        blockRange.selectNodeContents(blockToReplace);
        const beforeRange = document.createRange();
        beforeRange.setStart(blockRange.startContainer, blockRange.startOffset);
        beforeRange.setEnd(range.startContainer, range.startOffset);
        const afterRange = document.createRange();
        afterRange.setStart(range.endContainer, range.endOffset);
        afterRange.setEnd(blockRange.endContainer, blockRange.endOffset);
        const afterFragment = afterRange.extractContents();
        const beforeFragment = beforeRange.extractContents();

        const parent = blockToReplace.parentNode;
        const insertBeforeNode = blockToReplace.nextSibling;

        const newBlock = document.createElement(tag === 'pre' ? 'pre' : tag);
        applyBlockStyles(newBlock, type);
        if (tag === 'pre') {
          const code = document.createElement('code');
          while (selectedFragment.firstChild) code.appendChild(selectedFragment.firstChild);
          newBlock.appendChild(code);
        } else {
          while (selectedFragment.firstChild) newBlock.appendChild(selectedFragment.firstChild);
        }

        const blocksToInsert = [];
        if (beforeFragment.firstChild) {
          const beforeBlock = document.createElement(blockToReplace.tagName.toLowerCase() === 'pre' ? 'pre' : blockToReplace.tagName.toLowerCase());
          applyBlockStyles(beforeBlock, currentBlockType);
          if (beforeBlock.tagName.toLowerCase() === 'pre') {
            const code = document.createElement('code');
            while (beforeFragment.firstChild) code.appendChild(beforeFragment.firstChild);
            beforeBlock.appendChild(code);
          } else {
            while (beforeFragment.firstChild) beforeBlock.appendChild(beforeFragment.firstChild);
          }
          blocksToInsert.push(beforeBlock);
        }
        blocksToInsert.push(newBlock);
        if (afterFragment.firstChild) {
          const afterBlock = document.createElement(blockToReplace.tagName.toLowerCase() === 'pre' ? 'pre' : blockToReplace.tagName.toLowerCase());
          applyBlockStyles(afterBlock, currentBlockType);
          if (afterBlock.tagName.toLowerCase() === 'pre') {
            const code = document.createElement('code');
            while (afterFragment.firstChild) code.appendChild(afterFragment.firstChild);
            afterBlock.appendChild(code);
          } else {
            while (afterFragment.firstChild) afterBlock.appendChild(afterFragment.firstChild);
          }
          blocksToInsert.push(afterBlock);
        }

        parent.removeChild(blockToReplace);
        for (let i = blocksToInsert.length - 1; i >= 0; i--) {
          parent.insertBefore(blocksToInsert[i], insertBeforeNode);
        }
      } catch (splitErr) {
        // Fallback: replace whole block
        const newBlock = document.createElement(tag === 'pre' ? 'pre' : tag);
        applyBlockStyles(newBlock, type);
        if (tag === 'pre') {
          const code = document.createElement('code');
          code.innerHTML = blockToReplace.innerHTML;
          newBlock.appendChild(code);
        } else {
          newBlock.innerHTML = blockToReplace.innerHTML;
        }
        blockToReplace.parentNode?.replaceChild(newBlock, blockToReplace);
      }
    }
    skipContentSyncRef.current = true;
    handleInput();
    setTimeout(() => { skipContentSyncRef.current = false; }, 0);
  }, [restoreSelection, handleInput]);

  // Apply font size to selection (wrap in span; works for heading and paragraph)
  // Use same line-height as font-size so selection highlight height matches the reduced text
  const applyFontSize = useCallback((px) => {
    runWithSelection(() => {
      const editor = editorRef.current;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      let range = sel.getRangeAt(0);
      if ((range.collapsed || !editor?.contains(range.commonAncestorContainer)) && selectionWhenToolbarShownRef.current) {
        try {
          const savedRange = selectionWhenToolbarShownRef.current;
          if (savedRange?.startContainer && editor?.contains(savedRange.startContainer)) {
            sel.removeAllRanges();
            sel.addRange(savedRange.cloneRange());
            range = sel.getRangeAt(0);
          }
        } catch (_) {}
      }
      if (range.collapsed) return;
      const selectedBlocks = getSelectedEditorBlocks(range);
      const blockApplied = applyFontSizeToBlocks(selectedBlocks, px);
      if (blockApplied) {
        handleInput();
        return;
      }

      const applied = applyInlineStyleToRangeText(range, (span) => {
        span.style.setProperty('font-size', `${px}px`, 'important');
        span.style.setProperty('line-height', `${Math.round(px * 1.4)}px`, 'important');
      });
      if (applied) {
        try {
          sel.removeAllRanges();
          sel.addRange(range.cloneRange());
        } catch (_) {}
      }
    });
  }, [applyFontSizeToBlocks, applyInlineStyleToRangeText, getSelectedEditorBlocks, handleInput, runWithSelection]);

  // Apply font family to selection
  const applyFontFamily = useCallback((font) => {
    runWithSelection(() => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (range.collapsed) return;
      const span = document.createElement('span');
      span.style.fontFamily = font;
      try {
        range.surroundContents(span);
      } catch (_) {}
    });
  }, [runWithSelection]);

  // Apply text color to selection (inline)
  const applyTextColor = useCallback((color) => {
    runWithSelection(() => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (range.collapsed) return;
      const span = document.createElement('span');
      span.style.color = color;
      try {
        range.surroundContents(span);
      } catch (_) {}
    });
  }, [runWithSelection]);

  // Apply highlight (background) to selection
  const applyHighlight = useCallback((color) => {
    runWithSelection(() => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (range.collapsed) return;
      const span = document.createElement('span');
      span.style.backgroundColor = color;
      try {
        range.surroundContents(span);
      } catch (_) {}
    });
  }, [runWithSelection]);

  // Apply alignment to current block (block-level, like Google Docs)
  const setAlignment = useCallback((align) => {
    runWithSelection(() => {
      const editor = editorRef.current;
      if (!editor) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      let node = range.commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
      const blockSelector = 'p, h1, h2, h3, h4, h5, h6, div, blockquote, li';
      const block = node?.nodeType === Node.ELEMENT_NODE ? node.closest?.(blockSelector) : null;
      if (block && editor.contains(block) && block !== editor) {
        block.style.textAlign = align;
      }
    });
  }, [runWithSelection]);

  // Insert checklist (list with checkbox-style bullets)
  const insertChecklist = useCallback(() => {
    runWithSelection(() => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const ul = document.createElement('ul');
      ul.className = 'document-editor-checklist';
      ul.setAttribute('data-type', 'checklist');
      const li = document.createElement('li');
      li.innerHTML = '☐ ';
      li.contentEditable = 'true';
      ul.appendChild(li);
      range.deleteContents();
      range.insertNode(ul);
      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStart(li, 0);
      newRange.collapse(true);
      sel.addRange(newRange);
    });
  }, [runWithSelection]);

  // Insert block from slash menu (same flow: use current selection, delete contents, insert new block)
  const insertBlock = useCallback((type) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const block = document.createElement('div');
      block.className = 'my-4';
      
      switch (type) {
        case 'p':
          block.innerHTML = '<p>Paragraph</p>';
          break;
        case 'h1':
          block.innerHTML = '<h1 class="text-4xl font-bold mb-4">Heading 1</h1>';
          break;
        case 'h2':
          block.innerHTML = '<h2 class="text-3xl font-semibold mb-3">Heading 2</h2>';
          break;
        case 'h3':
          block.innerHTML = '<h3 class="text-2xl font-semibold mb-2">Heading 3</h3>';
          break;
        case 'h4':
          block.innerHTML = '<h4 class="text-xl font-semibold mb-2">Heading 4</h4>';
          break;
        case 'ul':
          block.innerHTML = '<ul><li>List item</li></ul>';
          break;
        case 'ol':
          block.innerHTML = '<ol><li>List item</li></ol>';
          break;
        case 'quote':
          block.innerHTML = '<blockquote class="border-l-4 border-gray-300 pl-4 italic my-4">Quote</blockquote>';
          break;
        case 'code':
          block.innerHTML = '<pre class="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4"><code>Code block</code></pre>';
          break;
        case 'image':
          setSlashMenu({ visible: false, position: { top: 0, left: 0 } });
          insertImageAtSelection();
          return;
        default:
          block.innerHTML = '<p>Paragraph</p>';
      }
      
      range.deleteContents();
      range.insertNode(block);
      selection.removeAllRanges();
      handleInput();
    }
    setSlashMenu({ visible: false, position: { top: 0, left: 0 } });
  }, [insertImageAtSelection, handleInput]);

  // Tooltip block type: same DOM logic as setBlockType (restores toolbar selection first), including
  // wrapping only the selected words inside a bullet instead of replacing the whole <li>.
  const setBlockTypeFromTooltip = useCallback((type) => {
    if (!editorRef.current) {
      setFloatingBlockMenuOpen(false);
      return;
    }
    setBlockType(type);
    setToolbarPosition((prev) => ({ ...prev, visible: false }));
    setFloatingBlockMenuOpen(false);
  }, [setBlockType]);

  // Get the <ol> that contains the toolbar selection (for "Start at" control)
  const getOlContainingToolbarSelection = useCallback(() => {
    const editor = editorRef.current;
    const saved = selectionWhenToolbarShownRef.current;
    if (!editor || !saved) return null;
    try {
      let node = saved.startContainer;
      if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode;
      const ol = node?.closest?.('ol');
      return ol && editor.contains(ol) ? ol : null;
    } catch (_) {
      return null;
    }
  }, []);

  // Set the start number of the ordered list containing the toolbar selection
  const setOrderedListStart = useCallback((startNum) => {
    const ol = getOlContainingToolbarSelection();
    if (!ol) return;
    const n = Math.max(1, parseInt(startNum, 10) || 1);
    ol.setAttribute('start', String(n));
    handleInput();
  }, [getOlContainingToolbarSelection, handleInput]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target) && 
          editorRef.current && !editorRef.current.contains(e.target)) {
        setToolbarPosition(prev => ({ ...prev, visible: false }));
        setFloatingBlockMenuOpen(false);
        setFloatingSizeMenuOpen(false);
      }
      if (!e.target.closest('.slash-menu')) {
        setSlashMenu(prev => ({ ...prev, visible: false }));
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target) && contextMenu.visible) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu.visible]);

  const undo = useCallback(() => {
    document.execCommand('undo', false, null);
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  const redo = useCallback(() => {
    document.execCommand('redo', false, null);
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  const insertDivider = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const hr = document.createElement('hr');
      hr.className = 'document-editor-hr';
      hr.style.cssText = 'border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0;';
      range.deleteContents();
      range.insertNode(hr);
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      hr.parentNode?.insertBefore(p, hr.nextSibling);
      selection.removeAllRanges();
      handleInput();
    }
  }, [handleInput]);

  useImperativeHandle(ref, () => ({
    getContent: () => editorRef.current?.innerHTML ?? '',
    getToolbarState: computeToolbarState,
    formatText,
    runWithSelection,
    setBlockType,
    setAlignment,
    applyFontSize,
    applyFontFamily,
    applyTextColor,
    applyHighlight,
    insertChecklist,
    insertBlock,
    insertImageAtSelection,
    insertImageByUrl,
    undo,
    redo,
    insertDivider,
    handleAddLink,
    saveSelection,
    restoreSelection,
    focus: () => editorRef.current?.focus()
  }), [computeToolbarState, formatText, runWithSelection, setBlockType, setAlignment, applyFontSize, applyFontFamily, applyTextColor, applyHighlight, insertChecklist, insertBlock, insertImageAtSelection, insertImageByUrl, undo, redo, insertDivider, handleAddLink, saveSelection, restoreSelection]);

  const blockOptions = [
    { type: 'p', label: 'Paragraph', icon: Type },
    { type: 'h1', label: 'Heading 1', icon: Heading1 },
    { type: 'h2', label: 'Heading 2', icon: Heading2 },
    { type: 'h3', label: 'Heading 3', icon: Heading3 },
    { type: 'h4', label: 'Heading 4', icon: Type },
    { type: 'ul', label: 'Bullet list', icon: List },
    { type: 'ol', label: 'Numbered list', icon: ListOrdered },
    { type: 'quote', label: 'Quote', icon: Quote },
    { type: 'code', label: 'Code Block', icon: Type },
    { type: 'image', label: 'Image', icon: ImageIcon },
  ];

  const blockTypeLabels = { '': 'Paragraph', p: 'Paragraph', h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', h4: 'Heading 4', quote: 'Quote', code: 'Code' };
  const blockTypeOptions = ['', 'h1', 'h2', 'h3', 'h4', 'quote', 'code'];
  const fontSizeOptions = [12, 14, 16, 18, 20, 24, 32];

  const floatingToolbarEl = toolbarPosition.visible && (
    <div
      ref={toolbarRef}
      style={{
        position: 'fixed',
        top: `${toolbarPosition.top}px`,
        left: `${toolbarPosition.left}px`,
        transform: toolbarPosition.above !== false ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
        zIndex: 9999,
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
        padding: 8,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 4,
        maxWidth: '95vw'
      }}
    >
      {/* Block type – custom dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          style={{
            height: 32,
            padding: '0 8px',
            fontSize: 14,
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            cursor: 'pointer',
            background: '#fff',
            minWidth: 100,
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 4
          }}
          title="Block type"
          onMouseDown={(e) => { e.preventDefault(); setFloatingSizeMenuOpen(false); setFloatingBlockMenuOpen(prev => !prev); }}
        >
          <span>{blockTypeLabels[lastToolbarStateRef.current?.blockType ?? 'p'] ?? 'Paragraph'}</span>
          <span style={{ color: '#9ca3af', fontSize: 10 }}>▾</span>
        </button>
        {floatingBlockMenuOpen && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '100%',
              marginTop: 4,
              padding: '4px 0',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              zIndex: 10001,
              minWidth: 120
            }}
          >
            {blockTypeOptions.map((v) => (
              <button
                key={v || 'p'}
                type="button"
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  textAlign: 'left',
                  fontSize: 14,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer'
                }}
                onMouseDown={(e) => { e.preventDefault(); setBlockTypeFromTooltip(v || 'p'); }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {blockTypeLabels[v] ?? 'Paragraph'}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Numbered list start – only when block type is ol */}
      {lastToolbarStateRef.current?.blockType === 'ol' && (() => {
        let listStart = 1;
        const ol = getOlContainingToolbarSelection();
        if (ol) listStart = Math.max(1, parseInt(ol.getAttribute('start'), 10) || 1);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Start:</span>
            <input
              type="number"
              min={1}
              value={listStart}
              onChange={(e) => setOrderedListStart(e.target.value)}
              onMouseDown={(e) => e.preventDefault()}
              style={{
                width: 48,
                padding: '4px 6px',
                fontSize: 13,
                border: '1px solid #e5e7eb',
                borderRadius: 6
              }}
              title="List start number"
            />
          </div>
        );
      })()}
      {/* Font size – custom dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          style={{
            height: 32,
            padding: '0 8px',
            fontSize: 14,
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            cursor: 'pointer',
            background: '#fff',
            width: 64,
            textAlign: 'left'
          }}
          title="Font size"
          onMouseDown={(e) => { e.preventDefault(); setFloatingBlockMenuOpen(false); setFloatingSizeMenuOpen(prev => !prev); }}
        >
          Size ▾
        </button>
        {floatingSizeMenuOpen && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '100%',
              marginTop: 4,
              padding: '4px 0',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              zIndex: 10001,
              minWidth: 80
            }}
          >
            {fontSizeOptions.map((px) => (
              <button
                key={px}
                type="button"
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  textAlign: 'left',
                  fontSize: 14,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer'
                }}
                onMouseDown={(e) => { e.preventDefault(); applyFontSize(px); setFloatingSizeMenuOpen(false); }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {px}px
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ width: 1, height: 24, background: '#e5e7eb', margin: '0 2px' }} />
      <button
        type="button"
        onClick={() => formatText('bold')}
        style={{ padding: 8, background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        title="Bold"
      ><Bold size={16} /></button>
      <button
        type="button"
        onClick={() => formatText('italic')}
        style={{ padding: 8, background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        title="Italic"
      ><Italic size={16} /></button>
      <button
        type="button"
        onClick={() => formatText('underline')}
        style={{ padding: 8, background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        title="Underline"
      ><Underline size={16} /></button>
      <div style={{ width: 1, height: 24, background: '#e5e7eb', margin: '0 2px' }} />
      <button
        type="button"
        onClick={handleAddLink}
        style={{ padding: 8, background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        title="Link"
      ><LinkIcon size={16} /></button>
      <input
        type="color"
        style={{ width: 32, height: 32, padding: 0, border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer' }}
        title="Text color"
        onMouseDown={(e) => e.preventDefault()}
        onChange={(e) => applyTextColor(e.target.value)}
      />
      <input
        type="color"
        style={{ width: 32, height: 32, padding: 0, border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer' }}
        title="Highlight"
        defaultValue="#fde047"
        onMouseDown={(e) => e.preventDefault()}
        onChange={(e) => applyHighlight(e.target.value)}
      />
      <div style={{ width: 1, height: 24, background: '#e5e7eb', margin: '0 2px' }} />
      <button
        type="button"
        onClick={() => { setToolbarPosition(prev => ({ ...prev, visible: false })); insertImageAtSelection(); }}
        style={{ padding: 8, background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        title="Insert image"
      ><ImageIcon size={16} /></button>
      {selectedText === '[Image]' && (
        <>
          <div style={{ width: 1, height: 24, background: '#e5e7eb', margin: '0 2px' }} />
          <button
            type="button"
            onClick={() => removeSelectedImage()}
            style={{ padding: 8, background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#dc2626' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#dc2626'; }}
            title="Remove image"
          >
            <Trash2 size={16} />
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="relative w-full">
      {/* Floating Toolbar - portaled to body so it stays on top of sidebar and doesn't clip */}
      {typeof document !== 'undefined' && floatingToolbarEl && createPortal(floatingToolbarEl, document.body)}

      {/* Insert image bar - hidden when parent provides its own (e.g. blog sidebar) */}
      {!hideInsertImageBar && (
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
          <button
            type="button"
            onClick={insertImageAtSelection}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
            title="Insert image at cursor"
          >
            <ImageIcon className="h-4 w-4" />
            <span>Insert image</span>
          </button>
          <span className="text-xs text-gray-400">or type / and choose Image</span>
        </div>
      )}

      {/* Right-click context menu: Add link, Insert image, Remove image (when on image) */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="fixed z-[100] bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.onImage && (
            <>
              <button
                type="button"
                onClick={() => {
                  setContextMenu(prev => ({ ...prev, visible: false }));
                  setImageLinkByWrapperRef();
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                <LinkIcon className="h-4 w-4 text-gray-600" />
                Add / edit image link
              </button>
              <button
                type="button"
                onClick={() => {
                  setContextMenu(prev => ({ ...prev, visible: false }));
                  removeImageByWrapperRef();
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
                Remove image
              </button>
            </>
          )}
          {contextMenu.onImage && <div className="border-t border-gray-100 my-1" />}
          <button
            type="button"
            onClick={() => {
              setContextMenu(prev => ({ ...prev, visible: false }));
              handleAddLink();
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            <LinkIcon className="h-4 w-4 text-gray-600" />
            Add link
          </button>
          <button
            type="button"
            onClick={() => {
              setContextMenu(prev => ({ ...prev, visible: false }));
              insertImageAtSelection();
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            <ImageIcon className="h-4 w-4 text-gray-600" />
            Insert image
          </button>
        </div>
      )}

      {/* Link Dialog - portaled so it stays on top when opened from floating toolbar */}
      {linkDialog.visible && typeof document !== 'undefined' && createPortal(
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4"
          style={{
            position: 'fixed',
            top: `${linkDialogPosition.top}px`,
            left: `${linkDialogPosition.left}px`,
            transform: 'translate(-50%, 0)',
            minWidth: '300px',
            zIndex: 10000
          }}
        >
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Link text"
              value={linkDialog.text}
              onChange={(e) => setLinkDialog(prev => ({ ...prev, text: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
            />
            <input
              type="text"
              placeholder="URL"
              value={linkDialog.url}
              onChange={(e) => setLinkDialog(prev => ({ ...prev, url: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveLink()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  linkElementRef.current = null;
                  linkRangeRef.current = null;
                  setLinkDialog({ visible: false, url: '', text: '', isEdit: false });
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLink}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {linkDialog.isEdit ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Slash Menu */}
      {slashMenu.visible && (
        <div
          className="slash-menu absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          style={{
            top: `${slashMenu.position.top}px`,
            left: `${slashMenu.position.left}px`
          }}
        >
          {blockOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.type}
                type="button"
                onClick={() => insertBlock(option.type)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
              >
                <Icon className="h-4 w-4 text-gray-600" />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Editor Styles – scoped when scopeSelector set (blog CMS uses no global CSS) */}
      <style dangerouslySetInnerHTML={{
        __html: `
          ${getBlogDocumentEditorTypographyCss(sel)}
          ${sel} a,
          ${sel} .document-editor-link {
            color: #025545 !important;
            text-decoration: underline !important;
          }
          ${sel} a:hover,
          ${sel} .document-editor-link:hover {
            color: #012f23 !important;
          }
          ${sel} .doc-editor-img-block,
          ${sel} .document-editor-image-wrapper {
            display: block !important;
            position: relative !important;
            margin: 1rem auto !important;
            margin-left: auto !important;
            margin-right: auto !important;
            padding: 0 !important;
            max-width: ${BLOG_BODY_IMAGE_MAX_WIDTH} !important;
            width: 100% !important;
            overflow: visible !important;
            box-sizing: border-box !important;
            cursor: grab !important;
          }
          ${sel} .doc-editor-img-block:active,
          ${sel} .document-editor-image-wrapper:active {
            cursor: grabbing !important;
          }
          ${sel} .doc-editor-img-block img,
          ${sel} .document-editor-image-wrapper img {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            height: auto !important;
            max-height: none !important;
            object-fit: cover !important;
            border-radius: 0.5rem !important;
            pointer-events: none !important;
          }
          ${sel} img {
            display: block !important;
            width: 100% !important;
            min-width: 0 !important;
            max-width: ${BLOG_BODY_IMAGE_MAX_WIDTH} !important;
            height: auto !important;
            max-height: none !important;
            object-fit: cover !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
          ${sel} .doc-editor-img-overlay {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 32px !important;
            cursor: grab !important;
            z-index: 1 !important;
          }
          ${sel} .doc-editor-img-drag-handle {
            position: absolute !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            z-index: 2 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 6px 10px !important;
            margin: 0 !important;
            font-size: 12px !important;
            color: #374151 !important;
            background: rgba(243, 244, 246, 0.95) !important;
            border-top: 1px solid #e5e7eb !important;
            cursor: grab !important;
            user-select: none !important;
            -webkit-user-select: none !important;
          }
          ${sel} .doc-editor-img-block.doc-editor-img-dragging,
          ${sel} .document-editor-image-wrapper.doc-editor-img-dragging {
            opacity: 0.6 !important;
          }
          ${sel} ul.document-editor-checklist {
            list-style: none !important;
            padding-left: 0 !important;
          }
          ${sel} ul.document-editor-checklist li {
            list-style: none !important;
            padding-left: 1.5rem !important;
            position: relative !important;
          }
          ${sel} ul.document-editor-checklist li::before {
            content: '☐';
            position: absolute;
            left: 0;
          }
          ${useScopedStylesOnly ? `
          ${sel} blockquote {
            border-left: 4px solid #d1d5db !important;
            padding-left: 1rem !important;
            font-style: italic !important;
            margin: 1rem 0 !important;
            color: #374151 !important;
          }
          ${sel} img {
            margin-top: 1rem !important;
            margin-bottom: 1rem !important;
          }
          ${sel}:empty::before {
            content: attr(data-placeholder);
            color: #9ca3af;
            pointer-events: none;
          }
          ` : ''}
        `
      }} />

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onMouseUp={(e) => { saveSelection(); handleSelection(e); }}
        onKeyUp={(e) => { saveSelection(); handleSelection(e); }}
        onFocus={() => { saveSelection(); syncToolbarState(); }}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        onDragStart={handleImageDragStart}
        onDragOver={handleImageDragOver}
        onDrop={handleImageDrop}
        onDragEnd={handleImageDragEnd}
        className={`document-editor w-full text-gray-800 focus:outline-none ${
          useScopedStylesOnly
            ? 'min-h-[8rem] p-0'
            : `min-h-[500px] p-8 [&_p]:mb-4 [&_p]:leading-relaxed [&_p]:text-base
          [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4 [&_blockquote]:text-gray-700
          [&_a]:underline [&_a]:cursor-pointer
          [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-4 [&_img]:shadow-sm
          [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-400 [&:empty]:before:pointer-events-none`
        }`}
        data-placeholder={placeholder}
        style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          ...(useScopedStylesOnly ? {} : { lineHeight: '1.75' }),
        }}
      />
    </div>
  );
});

export default DocumentStyleEditor;
