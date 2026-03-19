/**
 * Returns the HTML + CSS for the HomeschoolReady print header.
 * Call with window.location.origin so the mascot image resolves in popup windows.
 *
 * @param origin  e.g. window.location.origin
 * @param aiGenerated  true → adds a small AI-assistance footer note
 */
export function printHeader(origin: string, aiGenerated = false): string {
  const footer = aiGenerated
    ? `<div class="hr-print-footer">✨ Created with AI assistance · HomeschoolReady · homeschoolready.app</div>`
    : `<div class="hr-print-footer">HomeschoolReady · homeschoolready.app</div>`

  return `
<div class="hr-print-header">
  <img src="${origin}/Cardinal_Mascot.png" alt="HomeschoolReady" class="hr-print-logo-img" />
  <div class="hr-print-logo-text">
    <span class="hr-print-logo-name">Homeschool<strong>Ready</strong></span>
    <span class="hr-print-logo-domain">homeschoolready.app</span>
  </div>
</div>
${footer}
`
}

export function printHeaderCSS(): string {
  return `
  .hr-print-header {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 22px; padding-bottom: 14px;
    border-bottom: 2px solid #7c3aed;
  }
  .hr-print-logo-img { width: 46px; height: 46px; object-fit: contain; }
  .hr-print-logo-text { display: flex; flex-direction: column; gap: 1px; }
  .hr-print-logo-name {
    font-size: 18px; font-weight: 900; color: #1a1a2e;
    font-family: system-ui, sans-serif; line-height: 1.1;
  }
  .hr-print-logo-name strong { color: #7c3aed; }
  .hr-print-logo-domain {
    font-size: 11px; color: #9ca3af; font-family: system-ui, sans-serif;
  }
  .hr-print-footer {
    margin-top: 36px; padding-top: 12px;
    border-top: 1px solid #e5e7eb;
    font-size: 11px; color: #9ca3af;
    font-family: system-ui, sans-serif; text-align: center;
  }
`
}
