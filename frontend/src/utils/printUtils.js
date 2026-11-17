/**
 * Utility for isolated element printing (e.g. Student ID Cards).
 * By rendering the target element inside a temporary hidden iframe and copying all
 * stylesheets and fonts, only the specific card is presented to the browser's
 * print and 'Save as PDF' dialog—preventing full-page profile, navigation,
 * or background admin tables from appearing.
 *
 * @param {string} elementId - The DOM ID of the element to print/save
 * @param {string} documentTitle - Document title for the print job / saved PDF filename
 */
export const printElementById = (elementId, documentTitle = 'Student_ID_Card') => {
  const targetElement = document.getElementById(elementId);
  if (!targetElement) {
    console.warn(`[printUtils] Element with id "${elementId}" not found. Falling back to window.print()`);
    window.print();
    return;
  }

  // Remove existing print iframes if any
  const existingFrame = document.getElementById('isolated-print-frame');
  if (existingFrame) {
    existingFrame.remove();
  }

  // Create isolated invisible iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'isolated-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '100vw';
  iframe.style.height = '100vh';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow.document;

  // Extract all stylesheets and in-memory css rules to ensure Tailwind & fonts are preserved
  let combinedStyles = '';
  try {
    for (const sheet of document.styleSheets) {
      try {
        if (sheet.cssRules) {
          for (const rule of sheet.cssRules) {
            combinedStyles += rule.cssText + '\n';
          }
        }
      } catch {
        // Cross-origin stylesheet, fallback to copying outerHTML node
        if (sheet.ownerNode) {
          combinedStyles += sheet.ownerNode.outerHTML;
        }
      }
    }
  } catch (err) {
    console.warn('[printUtils] Could not read cssRules directly:', err);
  }

  let headLinks = '';
  document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    headLinks += link.outerHTML;
  });

  const cardHtml = targetElement.outerHTML;

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${documentTitle}</title>
        ${headLinks}
        <style>
          ${combinedStyles}
        </style>
        <style>
          @page {
            size: auto;
            margin: 12mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-sizing: border-box;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 100% !important;
            min-height: 100vh !important;
          }
          body {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            padding: 20px !important;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          }
          .isolated-print-container {
            width: 100% !important;
            max-width: 440px !important;
            margin: 0 auto !important;
          }
          /* Hide interactive copy buttons or extraneous screen chrome */
          button,
          .no-print {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div class="isolated-print-container">
          ${cardHtml}
        </div>
      </body>
    </html>
  `);
  iframeDoc.close();

  // Allow time for fonts, graphics, and styles to settle
  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.error('[printUtils] Print via iframe failed, falling back to window.print():', err);
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          iframe.remove();
        }
      }, 2000);
    }
  }, 300);
};

export default printElementById;
