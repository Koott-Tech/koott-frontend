/**
 * Typography + spacing for `.blog-content` / `.document-editor`.
 * Public post page uses {@link getBlogPostPageTypographyCss}; CMS uses {@link getBlogDocumentEditorTypographyCss}.
 *
 * @param {string} sel – CSS selector prefix, e.g. `[data-blog-cms-editor] .document-editor`
 */
export function getBlogDocumentEditorTypographyCss(sel) {
  return `
          ${sel} {
            font-family: 'Work Sans', Arial, Helvetica, sans-serif !important;
            letter-spacing: -0.7px !important;
            color: #171717 !important;
            text-align: justify !important;
          }
          ${sel} p {
            display: block !important;
            margin-top: 0 !important;
            margin-bottom: 1rem !important;
            font-size: 1rem !important;
            line-height: 24px !important;
            font-weight: 400 !important;
          }
          ${sel} p:empty,
          ${sel} p:has(> br:only-child) {
            min-height: 1em !important;
            margin-bottom: 0 !important;
          }
          /* Margins match BlogPost .blog-content .document-editor headings (more specific than .blog-content h*) */
          ${sel} h1 {
            font-family: 'DM Sans', Arial, Helvetica, sans-serif !important;
            font-size: 2.5rem !important;
            line-height: 60px !important;
            font-weight: 700 !important;
            letter-spacing: -0.7px !important;
            margin-top: 1.5rem !important;
            margin-bottom: 1rem !important;
            display: block !important;
          }
          ${sel} h2 {
            font-family: 'DM Sans', Arial, Helvetica, sans-serif !important;
            font-size: 2rem !important;
            line-height: 1.25 !important;
            font-weight: 700 !important;
            letter-spacing: -0.7px !important;
            margin-top: 1.25rem !important;
            margin-bottom: 0.75rem !important;
            display: block !important;
          }
          ${sel} h3 {
            font-family: 'DM Sans', Arial, Helvetica, sans-serif !important;
            font-size: 1.75rem !important;
            line-height: 1.25 !important;
            font-weight: 600 !important;
            letter-spacing: -0.7px !important;
            margin-top: 1rem !important;
            margin-bottom: 0.5rem !important;
            display: block !important;
          }
          ${sel} h4 {
            font-family: 'DM Sans', Arial, Helvetica, sans-serif !important;
            font-size: 1.5rem !important;
            line-height: 1.25 !important;
            font-weight: 600 !important;
            letter-spacing: -0.7px !important;
            margin-top: 0.75rem !important;
            margin-bottom: 0.5rem !important;
            display: block !important;
          }
          ${sel} h5 {
            font-family: 'DM Sans', Arial, Helvetica, sans-serif !important;
            font-size: 1.25rem !important;
            line-height: 1.25 !important;
            font-weight: 600 !important;
            letter-spacing: -0.7px !important;
            margin-top: 0.75rem !important;
            margin-bottom: 0.5rem !important;
            display: block !important;
          }
          ${sel} h6 {
            font-family: 'DM Sans', Arial, Helvetica, sans-serif !important;
            font-size: 1.125rem !important;
            line-height: 1.25 !important;
            font-weight: 600 !important;
            letter-spacing: -0.7px !important;
            margin-top: 0.75rem !important;
            margin-bottom: 0.5rem !important;
            display: block !important;
          }
          ${sel} h1 br,
          ${sel} h2 br,
          ${sel} h3 br,
          ${sel} h4 br,
          ${sel} h5 br,
          ${sel} h6 br {
            display: block !important;
            font-size: 1rem !important;
            line-height: 24px !important;
            height: 24px !important;
            margin: 0 !important;
          }
          ${sel} > *:first-child { margin-top: 0 !important; }
          ${sel} > *:last-child { margin-bottom: 0 !important; }
          ${sel} ul,
          ${sel} ol {
            list-style-position: outside !important;
            padding-left: 1.25rem !important;
            margin: 0.75rem 0 !important;
            margin-left: 1.5rem !important;
            display: block !important;
          }
          ${sel} ul { list-style-type: disc !important; }
          ${sel} ol { list-style-type: decimal !important; }
          ${sel} li {
            display: list-item !important;
            margin: 0 0 0.5rem 0 !important;
            padding-left: 0.25rem !important;
            line-height: 20px !important;
            font-size: 1rem !important;
            list-style-position: outside !important;
          }
          ${sel} ul li[style],
          ${sel} ol li[style] {
            margin: 0 0 0.5rem 0 !important;
          }
          ${sel} li p,
          ${sel} li div {
            margin: 0 !important;
            padding: 0 !important;
          }
          ${sel} li > p {
            display: block !important;
            margin-top: 0 !important;
            margin-bottom: 0.5rem !important;
            line-height: 24px !important;
          }
          ${sel} li > h2,
          ${sel} li > h3,
          ${sel} li > h4,
          ${sel} li > h5,
          ${sel} li > h6 {
            margin-top: 0 !important;
            margin-bottom: 0.25rem !important;
            line-height: 1.25 !important;
            display: block !important;
          }
          ${sel} li > h1 {
            margin-top: 0 !important;
            margin-bottom: 0.25rem !important;
            line-height: 60px !important;
            display: block !important;
          }
          ${sel} li > h4 {
            font-size: 1.1rem !important;
            font-weight: 600 !important;
          }
          ${sel} li > blockquote {
            margin: 0.35rem 0 !important;
          }
          ${sel} blockquote {
            display: block !important;
            margin: 1rem 0 !important;
            line-height: 24px !important;
            font-size: 1rem !important;
          }
          ${sel} pre {
            display: block !important;
            margin: 1rem 0 !important;
          }
          ${sel} div:not(.doc-editor-img-block):not(.document-editor-image-wrapper) {
            display: block !important;
            margin-top: 0 !important;
            margin-bottom: 1rem !important;
            line-height: 24px !important;
          }
          ${sel} br {
            display: block !important;
            margin-bottom: 0.25em !important;
          }
          ${sel} p br {
            display: block !important;
            margin-bottom: 0.25em !important;
          }
          ${sel} ul ul,
          ${sel} ol ul,
          ${sel} ul ol,
          ${sel} ol ol {
            margin: 0.5rem 0 !important;
          }
  `.trim();
}

/**
 * Injected on the public blog post (`BlogPost.jsx`) — single source for article surface + `.document-editor`.
 * @param {string} blogBodyImageMaxWidth – e.g. `'92%'`, must match `BLOG_BODY_IMAGE_MAX_WIDTH`
 */
export function getBlogPostPageTypographyCss(blogBodyImageMaxWidth) {
  return `
    .blog-content,
    .blog-content-html {
      letter-spacing: -0.7px !important;
      text-align: justify !important;
    }
    ${getBlogDocumentEditorTypographyCss('.blog-content .document-editor')}
    .blog-content p,
    .blog-content-html p {
      display: block !important;
      margin-bottom: 1rem !important;
      line-height: 24px !important;
      margin-left: 0 !important;
      padding-left: 0 !important;
    }
    .blog-content blockquote,
    .blog-content-html blockquote,
    .blog-content-html pre {
      display: block !important;
      margin-bottom: 1rem !important;
      margin-left: 0 !important;
      padding-left: 0 !important;
    }
    .blog-content div,
    .blog-content h1,
    .blog-content h2,
    .blog-content h3,
    .blog-content h4,
    .blog-content h5,
    .blog-content h6,
    .blog-content-html div,
    .blog-content-html h1,
    .blog-content-html h2,
    .blog-content-html h3,
    .blog-content-html h4,
    .blog-content-html h5,
    .blog-content-html h6 {
      display: block !important;
      margin-bottom: 1rem !important;
      margin-left: 0 !important;
      padding-left: 0 !important;
    }
    .blog-content > p,
    .blog-content > div,
    .blog-content > h1,
    .blog-content > h2,
    .blog-content > h3,
    .blog-content > h4,
    .blog-content > h5,
    .blog-content > h6,
    .blog-content > blockquote {
      margin-left: 0 !important;
      padding-left: 0 !important;
    }
    .blog-content p:last-child,
    .blog-content div:last-child,
    .blog-content-html p:last-of-type,
    .blog-content-html div:last-of-type,
    .blog-content-html > *:last-child {
      margin-bottom: 0 !important;
    }
    .blog-content br {
      display: block !important;
      margin-bottom: 0.25em !important;
    }
    .blog-content ul,
    .blog-content ol {
      display: block !important;
      margin: 1rem 0 !important;
      margin-left: 1.5rem !important;
      padding-left: 1.25rem !important;
      list-style-position: outside !important;
    }
    .blog-content ul {
      list-style-type: disc !important;
    }
    .blog-content ol {
      list-style-type: decimal !important;
    }
    .blog-content li {
      display: list-item !important;
      margin-bottom: 0.5rem !important;
      line-height: 20px !important;
      font-size: 1rem !important;
      list-style-position: outside !important;
      padding-left: 0.25rem !important;
    }
    .blog-content li > h2,
    .blog-content li > h3,
    .blog-content li > h4,
    .blog-content li > h5,
    .blog-content li > h6,
    .blog-content-html li > h2,
    .blog-content-html li > h3,
    .blog-content-html li > h4,
    .blog-content-html li > h5,
    .blog-content-html li > h6 {
      display: block !important;
      margin-top: 0 !important;
      margin-bottom: 0.25rem !important;
      line-height: 1.25 !important;
    }
    .blog-content li > h1,
    .blog-content-html li > h1 {
      display: block !important;
      margin-top: 0 !important;
      margin-bottom: 0.25rem !important;
      line-height: 60px !important;
    }
    .blog-content li > h4,
    .blog-content-html li > h4 {
      font-size: 1.1rem !important;
      font-weight: 600 !important;
    }
    .blog-content li > p,
    .blog-content-html li > p {
      display: block !important;
      margin-top: 0 !important;
      margin-bottom: 0.5rem !important;
      line-height: 24px !important;
    }
    .blog-content li > blockquote,
    .blog-content-html li > blockquote {
      margin: 0.35rem 0 !important;
    }
    .blog-content ul ul,
    .blog-content ol ul,
    .blog-content ul ol,
    .blog-content ol ol {
      margin: 0.5rem 0 !important;
    }
    .blog-content h1,
    .blog-content-html h1 {
      font-size: 2.5rem !important;
      line-height: 60px !important;
      font-weight: 700 !important;
      letter-spacing: -0.7px !important;
      text-align: left !important;
      margin-top: 2rem !important;
      margin-bottom: 1rem !important;
      overflow: visible !important;
      visibility: visible !important;
    }
    .blog-content h2,
    .blog-content-html h2 {
      font-size: 2rem !important;
      line-height: 1.25 !important;
      font-weight: 700 !important;
      letter-spacing: -0.7px !important;
      text-align: left !important;
      margin-top: 1.75rem !important;
      margin-bottom: 0.875rem !important;
      overflow: visible !important;
      visibility: visible !important;
    }
    .blog-content h3,
    .blog-content-html h3 {
      font-size: 1.75rem !important;
      line-height: 1.25 !important;
      font-weight: 600 !important;
      letter-spacing: -0.7px !important;
      text-align: left !important;
      margin-top: 1.5rem !important;
      margin-bottom: 0.75rem !important;
      overflow: visible !important;
      visibility: visible !important;
    }
    .blog-content h4,
    .blog-content-html h4 {
      font-size: 1.5rem !important;
      line-height: 1.25 !important;
      font-weight: 600 !important;
      letter-spacing: -0.7px !important;
      margin-top: 1.25rem !important;
      margin-bottom: 0.625rem !important;
      overflow: visible !important;
      visibility: visible !important;
    }
    .blog-content h5,
    .blog-content-html h5 {
      font-size: 1.25rem !important;
      line-height: 1.25 !important;
      font-weight: 600 !important;
      letter-spacing: -0.7px !important;
      margin-top: 1rem !important;
      margin-bottom: 0.5rem !important;
      overflow: visible !important;
      visibility: visible !important;
    }
    .blog-content h6,
    .blog-content-html h6 {
      font-size: 1.125rem !important;
      line-height: 1.25 !important;
      font-weight: 600 !important;
      letter-spacing: -0.7px !important;
      margin-top: 0.875rem !important;
      margin-bottom: 0.5rem !important;
      overflow: visible !important;
      visibility: visible !important;
    }
    .blog-content a {
      color: #3f2e73 !important;
      text-decoration: underline !important;
    }
    .blog-content a:hover {
      color: #1d1733 !important;
    }
    .blog-content .doc-editor-img-block,
    .blog-content .document-editor-image-wrapper {
      display: block !important;
      margin: 1rem auto !important;
      margin-left: auto !important;
      margin-right: auto !important;
      max-width: ${blogBodyImageMaxWidth} !important;
      width: 100% !important;
      overflow: visible !important;
      cursor: default !important;
    }
    .blog-content .doc-editor-img-drag-handle,
    .blog-content .doc-editor-img-overlay,
    .blog-content-html .doc-editor-img-drag-handle,
    .blog-content-html .doc-editor-img-overlay {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      overflow: hidden !important;
      position: absolute !important;
      pointer-events: none !important;
    }
    .blog-content .doc-editor-img-block img,
    .blog-content .document-editor-image-wrapper img {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      height: auto !important;
      max-height: none !important;
      object-fit: cover !important;
      border-radius: 0.5rem !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
    .blog-content img,
    .blog-content-html img {
      display: block !important;
      width: 100% !important;
      min-width: 0 !important;
      max-width: ${blogBodyImageMaxWidth} !important;
      height: auto !important;
      max-height: none !important;
      object-fit: cover !important;
      margin: 1rem auto !important;
      border-radius: 0.5rem !important;
    }
    @media (max-width: 767px) {
      /* Mobile: prevent justify-based stretch in post content blocks */
      .blog-content,
      .blog-content-html,
      .blog-content .document-editor,
      .blog-content [data-block-content="true"] {
        text-align: left !important;
        text-align-last: left !important;
        word-spacing: normal !important;
      }
      .blog-content .document-editor p {
        line-height: 24px !important;
      }
      .blog-content .document-editor div,
      .blog-content .document-editor blockquote {
        line-height: 24px !important;
      }
      /* Mobile: reduce list indentation (both bullets and numbered lists) */
      .blog-content ul,
      .blog-content ol,
      .blog-content-html ul,
      .blog-content-html ol {
        margin-left: 0.9rem !important;
        padding-left: 0.85rem !important;
      }
      .blog-content li,
      .blog-content-html li {
        padding-left: 0.1rem !important;
      }
      .blog-content h1,
      .blog-content-html h1 {
        font-size: 22px !important;
      }
      .blog-content h2,
      .blog-content-html h2 {
        font-size: 20px !important;
      }
      .blog-content h3,
      .blog-content-html h3 {
        font-size: 18px !important;
      }
      .blog-content h4,
      .blog-content-html h4 {
        font-size: 16px !important;
      }
      .blog-content h5,
      .blog-content-html h5 {
        font-size: 15px !important;
      }
      .blog-content h6,
      .blog-content-html h6 {
        font-size: 14px !important;
      }
      .blog-content h2,
      .blog-content h3,
      .blog-content-html h2,
      .blog-content-html h3 {
        line-height: 1.25 !important;
        letter-spacing: -0.65px !important;
        text-align: left !important;
        word-spacing: normal !important;
      }
      .blog-content h4,
      .blog-content h5,
      .blog-content h6,
      .blog-content-html h4,
      .blog-content-html h5,
      .blog-content-html h6 {
        line-height: 1.25 !important;
        letter-spacing: -0.7px !important;
      }
      .blog-content h1,
      .blog-content-html h1 {
        line-height: 60px !important;
        letter-spacing: -0.7px !important;
      }
      .blog-content p,
      .blog-content-html p {
        line-height: 24px !important;
        letter-spacing: -0.7px !important;
      }
      .blog-content div,
      .blog-content blockquote,
      .blog-content-html div,
      .blog-content-html blockquote {
        letter-spacing: -0.7px !important;
      }
    }
  `.trim();
}
