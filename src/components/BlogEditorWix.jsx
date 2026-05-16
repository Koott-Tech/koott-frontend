'use client';

import { useState, useRef, useMemo, useEffect, useLayoutEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import {
  Settings,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  CheckSquare,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  IndentIncrease,
  IndentDecrease,
  Undo2,
  Redo2,
  Minus,
  Smile,
} from 'lucide-react';
import DocumentStyleEditor, { getDefaultToolbarState } from '@/components/DocumentStyleEditor';
import { normalizeImageUrl } from '@/utils/urlNormalizer';
import styles from './BlogEditorWix.module.css';

const generateSlug = (title) => {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

const BLOCK_TYPES = [
  { value: 'p', label: 'Paragraph' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'h4', label: 'Heading 4' },
  { value: 'quote', label: 'Quote' },
  { value: 'code', label: 'Code Block' },
];

const ACCEPT_IMAGE = 'image/jpeg,image/jpg,image/png,image/webp';

// Toolbar button: prevent default so editor keeps focus/selection (Google Docs style), then run command
const toolbarCmd = (e, fn) => {
  e.preventDefault();
  e.stopPropagation();
  fn();
};

const BlogEditorWix = forwardRef(function BlogEditorWix({
  blog,
  onChange,
  onFeaturedImageUpload,
  onContentImageUpload,
  uploadProgress = false,
  defaultAuthorName = '',
  featuredImagePreview = null,
  showSidebar = false,
  /** Merged with formatting toolbar into one chrome (back, save, …) */
  headerLeft = null,
  headerRight = null,
}, ref) {
  const editorRef = useRef(null);
  const titleTextareaRef = useRef(null);

  const adjustTitleTextareaHeight = useCallback(() => {
    const el = titleTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useLayoutEffect(() => {
    adjustTitleTextareaHeight();
  }, [blog.title, adjustTitleTextareaHeight]);

  useImperativeHandle(ref, () => ({
    getContent: () => editorRef.current?.getContent?.() ?? ''
  }), []);

  const [sidebarTab, setSidebarTab] = useState('settings');
  const [seoPreviewOpen, setSeoPreviewOpen] = useState(true);
  const [toolbarState, setToolbarState] = useState(() => getDefaultToolbarState());
  const [blockTypeDropdownOpen, setBlockTypeDropdownOpen] = useState(false);
  const blockTypeDropdownRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (blockTypeDropdownRef.current && !blockTypeDropdownRef.current.contains(e.target)) setBlockTypeDropdownOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const autoSlug = useMemo(() => generateSlug(blog.title || ''), [blog.title]);
  const displaySlug = blog.slug || autoSlug;

  const handleImageUpload = useCallback(async (file) => {
    if (!onContentImageUpload || !file) return { success: false, error: 'No file provided' };
    try {
      const formData = new FormData();
      formData.append('images', file);
      formData.append('blogTitle', blog.title || 'untitled');
      const result = await onContentImageUpload(formData);
      const d = result?.data;
      if (result?.success && d) {
        if (d.uploadedImages?.[0]) {
          const first = d.uploadedImages[0];
          return { success: true, data: { imageUrl: first.imageUrl || first.url || first } };
        }
        if (Array.isArray(d) && d[0]) {
          const first = d[0];
          return { success: true, data: { imageUrl: first.imageUrl || first.url || first } };
        }
        if (d?.imageUrl) return result;
        if (typeof d === 'string') return { success: true, data: { imageUrl: d } };
      }
      return result;
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  }, [onContentImageUpload, blog.title]);

  const addTag = () => {
    const input = document.getElementById('bec-tag-input');
    const v = input?.value?.trim();
    if (v && !(blog.tags || []).includes(v)) {
      onChange({ ...blog, tags: [...(blog.tags || []), v] });
      if (input) input.value = '';
    }
  };
  const removeTag = (t) => onChange({ ...blog, tags: (blog.tags || []).filter((x) => x !== t) });

  const addCategory = () => {
    const input = document.getElementById('bec-category-input');
    const v = input?.value?.trim();
    if (v && !(blog.categories || []).includes(v)) {
      onChange({ ...blog, categories: [...(blog.categories || []), v] });
      if (input) input.value = '';
    }
  };
  const removeCategory = (c) => onChange({ ...blog, categories: (blog.categories || []).filter((x) => x !== c) });

  const addMetaKeyword = () => {
    const input = document.getElementById('bec-meta-keyword-input');
    const v = input?.value?.trim();
    if (v && !(blog.meta_keywords || []).includes(v)) {
      onChange({ ...blog, meta_keywords: [...(blog.meta_keywords || []), v] });
      if (input) input.value = '';
    }
  };
  const removeMetaKeyword = (k) => onChange({ ...blog, meta_keywords: (blog.meta_keywords || []).filter((x) => x !== k) });

  const wordCount = useMemo(() => {
    const html = blog.content ?? '';
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? text.split(/\s+/).length : 0;
  }, [blog.content]);

  const readingTime = useMemo(() => {
    const w = wordCount || 0;
    return Math.max(1, Math.ceil(w / 200));
  }, [wordCount]);

  return (
    <div className={`${styles.root} ${!showSidebar ? styles.rootExpanded : ''}`}>
      <div className={styles.layout}>
        <div className={styles.layoutRow}>
          {/* Left sidebar: Settings / SEO */}
          {showSidebar && (
          <aside className={styles.sidebar}>
            <nav className={styles.sidebarNav}>
              <button
                type="button"
                className={sidebarTab === 'settings' ? `${styles.sidebarNavBtn} ${styles.sidebarNavBtnActive}` : styles.sidebarNavBtn}
                onClick={() => setSidebarTab('settings')}
                title="Settings"
                aria-label="Settings"
              >
                <Settings size={20} />
              </button>
              <button
                type="button"
                className={sidebarTab === 'seo' ? `${styles.sidebarNavBtn} ${styles.sidebarNavBtnActive}` : styles.sidebarNavBtn}
                onClick={() => setSidebarTab('seo')}
                title="SEO"
                aria-label="SEO"
              >
                <Search size={20} />
              </button>
            </nav>

            <div className={styles.sidebarPanel}>
              {sidebarTab === 'settings' && (
                <>
                  <span className={styles.sidebarPanelTitle} role="heading" aria-level={2}>Settings</span>
                  <div className={styles.settingsSection}>
                    <label className={styles.settingsLabel}>Featured image</label>
                    <label className={styles.featuredImageUpload}>
                      {uploadProgress ? 'Uploading…' : 'Click to upload'}
                      <input
                        type="file"
                        accept={ACCEPT_IMAGE}
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFeaturedImageUpload?.(f); }}
                        disabled={uploadProgress}
                      />
                    </label>
                    {(blog.featured_image_url || featuredImagePreview) && (
                      <div className={styles.featuredImagePreview}>
                        <img src={featuredImagePreview || blog.featured_image_url} alt="Featured" />
                        <button type="button" onClick={() => onChange({ ...blog, featured_image_url: '' })} className={styles.featuredImageRemove}><X size={14} /></button>
                      </div>
                    )}
                  </div>
                  <div className={styles.settingsSection}>
                    <label className={styles.settingsLabel}>Author</label>
                    <input
                      type="text"
                      className={styles.settingsInput}
                      value={blog.author_name ?? defaultAuthorName}
                      onChange={(e) => onChange({ ...blog, author_name: e.target.value })}
                      placeholder="Author name"
                    />
                  </div>
                  <div className={styles.settingsSection}>
                    <label className={styles.settingsLabel}>Status</label>
                    <select
                      className={styles.settingsInput}
                      value={blog.status ?? 'draft'}
                      onChange={(e) => onChange({ ...blog, status: e.target.value })}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div className={styles.settingsSection}>
                    <label className={styles.settingsLabel}>Read time (min)</label>
                    <input
                      type="number"
                      min={1}
                      className={styles.settingsInput}
                      value={blog.read_time_minutes ?? 5}
                      onChange={(e) => onChange({ ...blog, read_time_minutes: parseInt(e.target.value, 10) || 5 })}
                    />
                  </div>
                  <div className={styles.settingsSection}>
                    <label className={styles.settingsLabel}>Category</label>
                    <input
                      id="bec-category-input"
                      type="text"
                      className={styles.settingsInput}
                      placeholder="Add category"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                    />
                    <button type="button" onClick={addCategory} className={styles.addBtn}>Add</button>
                    <div className={styles.tagChipWrap}>
                      {(blog.categories || []).map((cat) => (
                        <span key={cat} className={styles.tagChip}>
                          {cat}
                          <button type="button" onClick={() => removeCategory(cat)} className={styles.tagChipRemove}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className={styles.settingsSection}>
                    <label className={styles.settingsLabel}>Tags</label>
                    <input
                      id="bec-tag-input"
                      type="text"
                      className={styles.settingsInput}
                      placeholder="Add tag (Enter to add)"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <button type="button" onClick={addTag} className={styles.addBtn}>Add</button>
                    <div className={styles.tagChipWrap}>
                      {(blog.tags || []).map((tag) => (
                        <span key={tag} className={styles.tagChip}>
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)} className={styles.tagChipRemove}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {sidebarTab === 'seo' && (
                <>
                  <span className={styles.sidebarPanelTitle} role="heading" aria-level={2}>SEO</span>
                  <button type="button" onClick={() => setSeoPreviewOpen((o) => !o)} className={styles.seoToggleBtn}>
                    <span>Google Preview</span>
                    {seoPreviewOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {seoPreviewOpen && (
                    <div className={styles.seoPreviewBox}>
                      <p className={styles.seoPreviewUrl}>{displaySlug ? `www.example.com/blog/${displaySlug}` : '…'}</p>
                      <p className={styles.seoPreviewTitle}>{(blog.seo_title || blog.title || 'Your title').slice(0, 60)}</p>
                      <p className={styles.seoPreviewDesc}>{(blog.seo_description || blog.excerpt || 'Meta description…').slice(0, 160)}</p>
                      <div className={styles.seoPreviewStats}>
                        <span className={(blog.seo_title || blog.title || '').length <= 60 && (blog.seo_title || blog.title || '').length >= 30 ? 'text-green-600' : ''}>Title: {(blog.seo_title || blog.title || '').length}/60</span>
                        <span className={(blog.seo_description || blog.excerpt || '').length <= 160 && (blog.seo_description || blog.excerpt || '').length >= 120 ? 'text-green-600' : ''}>Desc: {(blog.seo_description || blog.excerpt || '').length}/160</span>
                      </div>
                    </div>
                  )}
                  <div className={styles.settingsSection}>
                    <label className={styles.settingsLabel}>URL Slug</label>
                    <input
                      type="text"
                      className={styles.settingsInput}
                      value={displaySlug}
                      onChange={(e) => onChange({ ...blog, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-') })}
                      placeholder="auto-from-title"
                    />
                  </div>
                  <div className={styles.settingsSection}>
                    <label className={styles.settingsLabel}>Meta title (≤60)</label>
                    <input
                      type="text"
                      className={styles.settingsInput}
                      value={blog.seo_title ?? ''}
                      onChange={(e) => onChange({ ...blog, seo_title: e.target.value.slice(0, 60) })}
                      placeholder={blog.title || 'SEO title'}
                      maxLength={60}
                    />
                  </div>
                  <div className={styles.settingsSection}>
                    <label className={styles.settingsLabel}>Meta description (≤160)</label>
                    <textarea
                      className={styles.settingsInput}
                      value={blog.seo_description ?? ''}
                      onChange={(e) => onChange({ ...blog, seo_description: e.target.value.slice(0, 160) })}
                      placeholder={blog.excerpt || 'Meta description'}
                      maxLength={160}
                      rows={3}
                    />
                  </div>
                  <div className={styles.settingsSection}>
                    <label className={styles.settingsLabel}>Focus keyword</label>
                    <input
                      type="text"
                      className={styles.settingsInput}
                      value={blog.focus_keyword ?? ''}
                      onChange={(e) => onChange({ ...blog, focus_keyword: e.target.value })}
                      placeholder="e.g. child psychology"
                    />
                  </div>
                  <div className={styles.settingsSection}>
                    <label className={styles.settingsLabel}>Meta keywords (SEO)</label>
                    <input
                      id="bec-meta-keyword-input"
                      type="text"
                      className={styles.settingsInput}
                      placeholder="Add keyword (Enter to add)"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMetaKeyword())}
                    />
                    <button type="button" onClick={addMetaKeyword} className={styles.addBtn}>Add</button>
                    <div className={styles.tagChipWrap}>
                      {(blog.meta_keywords || []).map((kw) => (
                        <span key={kw} className={styles.tagChip}>
                          {kw}
                          <button type="button" onClick={() => removeMetaKeyword(kw)} className={styles.tagChipRemove}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className={styles.settingsSection}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={blog.no_index !== true}
                        onChange={(e) => onChange({ ...blog, no_index: !e.target.checked })}
                      />
                      <span className={styles.settingsLabel} style={{ margin: 0 }}>Index in search engines</span>
                    </label>
                  </div>
                </>
              )}
            </div>
          </aside>
          )}

          {/* Main: unified chrome (nav + formatting) + editor */}
          <div className={styles.mainWrap}>
            <header className={styles.unifiedTop}>
              <div className={styles.unifiedHeaderBar}>
                <div className={styles.unifiedHeaderLeft}>{headerLeft}</div>
                <div
                  className={styles.unifiedToolbarMiddle}
                  onMouseDownCapture={() => editorRef.current?.saveSelection?.()}
                >
              <div className={styles.toolbarGroup} ref={blockTypeDropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  type="button"
                  className={styles.toolbarSelect}
                  title="Block type — paragraph, heading, quote, or code"
                  aria-label="Block type — paragraph, heading, quote, or code"
                  style={{ minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editorRef.current?.saveSelection?.();
                    setBlockTypeDropdownOpen((open) => !open);
                  }}
                >
                  <span>{(BLOCK_TYPES.find((o) => o.value === toolbarState.blockType) || BLOCK_TYPES[0]).label}</span>
                  <ChevronDown size={14} style={{ flexShrink: 0 }} />
                </button>
                {blockTypeDropdownOpen && (
                  <div className={styles.blockTypeDropdownMenu} role="listbox">
                    {BLOCK_TYPES.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        role="option"
                        title={o.label}
                        aria-label={o.label}
                        aria-selected={toolbarState.blockType === o.value}
                        className={`${styles.blockTypeDropdownItem} ${toolbarState.blockType === o.value ? styles.toolbarBtnActive : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setBlockTypeDropdownOpen(false);
                          // Save selection right before setBlockType – ensure we have it before any re-render
                          editorRef.current?.saveSelection?.();
                          editorRef.current?.setBlockType?.(o.value);
                          editorRef.current?.focus?.();
                        }}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.unifiedToolbarScroll}>
              <div className={styles.toolbarDivider} />
              <div className={styles.toolbarGroup}>
                <button type="button" className={`${styles.toolbarBtn} ${toolbarState.bold ? styles.toolbarBtnActive : ''}`} onMouseDown={(e) => toolbarCmd(e, () => { editorRef.current?.focus?.(); editorRef.current?.formatText?.('bold'); })} title="Bold" aria-label="Bold"><Bold size={18} /></button>
                <button type="button" className={`${styles.toolbarBtn} ${toolbarState.italic ? styles.toolbarBtnActive : ''}`} onMouseDown={(e) => toolbarCmd(e, () => { editorRef.current?.focus?.(); editorRef.current?.formatText?.('italic'); })} title="Italic" aria-label="Italic"><Italic size={18} /></button>
                <button type="button" className={`${styles.toolbarBtn} ${toolbarState.underline ? styles.toolbarBtnActive : ''}`} onMouseDown={(e) => toolbarCmd(e, () => { editorRef.current?.focus?.(); editorRef.current?.formatText?.('underline'); })} title="Underline" aria-label="Underline"><Underline size={18} /></button>
                <button type="button" className={`${styles.toolbarBtn} ${toolbarState.strike ? styles.toolbarBtnActive : ''}`} onMouseDown={(e) => toolbarCmd(e, () => { editorRef.current?.focus?.(); editorRef.current?.formatText?.('strikeThrough'); })} title="Strikethrough" aria-label="Strikethrough"><Strikethrough size={18} /></button>
              </div>
              <div className={styles.toolbarDivider} />
              <div className={styles.toolbarGroup}>
                <button type="button" className={`${styles.toolbarBtn} ${toolbarState.listType === 'ul' ? styles.toolbarBtnActive : ''}`} onMouseDown={(e) => toolbarCmd(e, () => { editorRef.current?.focus?.(); editorRef.current?.runWithSelection?.(() => document.execCommand('insertUnorderedList')); })} title="Bullet list" aria-label="Bullet list"><List size={18} /></button>
                <button type="button" className={`${styles.toolbarBtn} ${toolbarState.listType === 'ol' ? styles.toolbarBtnActive : ''}`} onMouseDown={(e) => toolbarCmd(e, () => { editorRef.current?.focus?.(); editorRef.current?.runWithSelection?.(() => document.execCommand('insertOrderedList')); })} title="Numbered list" aria-label="Numbered list"><ListOrdered size={18} /></button>
                <button type="button" className={styles.toolbarBtn} onMouseDown={(e) => toolbarCmd(e, () => { editorRef.current?.focus?.(); editorRef.current?.insertChecklist?.(); })} title="Checklist" aria-label="Checklist"><CheckSquare size={18} /></button>
              </div>
              <div className={styles.toolbarDivider} />
              <div className={styles.toolbarGroup}>
                <button type="button" className={`${styles.toolbarBtn} ${toolbarState.alignment === 'left' ? styles.toolbarBtnActive : ''}`} onMouseDown={(e) => toolbarCmd(e, () => { editorRef.current?.focus?.(); editorRef.current?.setAlignment?.('left'); })} title="Align left" aria-label="Align left"><AlignLeft size={18} /></button>
                <button type="button" className={`${styles.toolbarBtn} ${toolbarState.alignment === 'center' ? styles.toolbarBtnActive : ''}`} onMouseDown={(e) => toolbarCmd(e, () => { editorRef.current?.focus?.(); editorRef.current?.setAlignment?.('center'); })} title="Align center" aria-label="Align center"><AlignCenter size={18} /></button>
                <button type="button" className={`${styles.toolbarBtn} ${toolbarState.alignment === 'right' ? styles.toolbarBtnActive : ''}`} onMouseDown={(e) => toolbarCmd(e, () => { editorRef.current?.focus?.(); editorRef.current?.setAlignment?.('right'); })} title="Align right" aria-label="Align right"><AlignRight size={18} /></button>
                <button type="button" className={`${styles.toolbarBtn} ${(!toolbarState.alignment || toolbarState.alignment === 'justify') ? styles.toolbarBtnActive : ''}`} onMouseDown={(e) => toolbarCmd(e, () => { editorRef.current?.focus?.(); editorRef.current?.setAlignment?.('justify'); })} title="Justify" aria-label="Justify"><AlignJustify size={18} /></button>
              </div>
              <div className={styles.toolbarDivider} />
              <div className={styles.toolbarGroup}>
                <button type="button" className={styles.toolbarBtn} onMouseDown={(e) => toolbarCmd(e, () => { editorRef.current?.focus?.(); editorRef.current?.runWithSelection?.(() => document.execCommand('outdent')); })} title="Decrease indent" aria-label="Decrease indent"><IndentDecrease size={18} /></button>
                <button type="button" className={styles.toolbarBtn} onMouseDown={(e) => toolbarCmd(e, () => { editorRef.current?.focus?.(); editorRef.current?.runWithSelection?.(() => document.execCommand('indent')); })} title="Increase indent" aria-label="Increase indent"><IndentIncrease size={18} /></button>
              </div>
              <div className={styles.toolbarDivider} />
              <div className={styles.toolbarGroup}>
                <button type="button" className={styles.toolbarBtn} onMouseDown={(e) => toolbarCmd(e, () => editorRef.current?.undo?.())} title="Undo" aria-label="Undo"><Undo2 size={18} /></button>
                <button type="button" className={styles.toolbarBtn} onMouseDown={(e) => toolbarCmd(e, () => editorRef.current?.redo?.())} title="Redo" aria-label="Redo"><Redo2 size={18} /></button>
                <button type="button" className={styles.toolbarBtn} onMouseDown={(e) => toolbarCmd(e, () => { editorRef.current?.focus?.(); editorRef.current?.insertDivider?.(); })} title="Horizontal divider" aria-label="Horizontal divider"><Minus size={18} /></button>
                <button type="button" className={styles.toolbarBtn} onMouseDown={(e) => toolbarCmd(e, () => { editorRef.current?.focus?.(); editorRef.current?.runWithSelection?.(() => document.execCommand('insertText', false, '😊')); })} title="Insert emoji" aria-label="Insert emoji"><Smile size={18} /></button>
              </div>
              </div>
                </div>
                <div className={styles.unifiedHeaderRight}>{headerRight}</div>
              </div>
            </header>

            {/* Scrollable editor area, centered max-width 800px */}
            <div className={styles.editorScroll}>
              <div className={styles.editorInner}>
                <textarea
                  ref={titleTextareaRef}
                  required
                  rows={1}
                  className={styles.editorTitle}
                  value={blog.title ?? ''}
                  onChange={(e) => onChange({ ...blog, title: e.target.value })}
                  placeholder="Post title"
                  aria-label="Post title"
                  spellCheck
                />
                <textarea
                  className={styles.editorExcerpt}
                  value={blog.excerpt ?? ''}
                  onChange={(e) => onChange({ ...blog, excerpt: e.target.value })}
                  placeholder="Brief description (excerpt)"
                  rows={2}
                />
                {/* Same placement + framing as public BlogPost (below header, above body) */}
                {(blog.featured_image_url || featuredImagePreview) && (
                  <div className={styles.editorFeaturedImage}>
                    <div className={styles.editorFeaturedImageFrame}>
                      <img
                        src={normalizeImageUrl(featuredImagePreview || blog.featured_image_url || '')}
                        alt={blog.title?.trim() ? blog.title : 'Featured image'}
                        className={styles.editorFeaturedImageImg}
                      />
                    </div>
                  </div>
                )}
                <div className={styles.becDocumentEditorWrap} data-blog-cms-editor>
                  <DocumentStyleEditor
                    ref={editorRef}
                    content={blog.content || ''}
                    onChange={(html) => onChange({ ...blog, content: html })}
                    onImageUpload={handleImageUpload}
                    onToolbarStateChange={setToolbarState}
                    placeholder="Start writing... Type / for blocks"
                    hideInsertImageBar
                    scopeSelector="[data-blog-cms-editor]"
                  />
                </div>
                <div className={styles.statsBar}>
                  <span>{wordCount} words</span>
                  <span>~{readingTime} min read</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default BlogEditorWix;
