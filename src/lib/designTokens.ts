// ─── HomeschoolReady Design Tokens ───────────────────────────────────────────
// Single source of truth for all UI values.
// Every page should import from here — never hardcode colors, fonts, or radii.

export const colors = {
    // Brand
    purple:       '#7c3aed',
    purpleDark:   '#5b21b6',
    purpleLight:  '#a855f7',
    purpleFaint:  '#f5f3ff',
    purpleBorder: '#ede9fe',
    pink:         '#ec4899',
    yellow:       '#fbbf24',
  
    // Neutrals
    white:        '#ffffff',
    gray50:       '#f9fafb',
    gray100:      '#f3f4f6',
    gray200:      '#e5e7eb',
    gray400:      '#9ca3af',
    gray500:      '#6b7280',
    gray700:      '#374151',
    gray900:      '#111827',
  
    // Semantic — these use CSS variables so dark mode works automatically
    pageBackground: 'var(--hr-bg-page)',
    cardBackground: 'var(--hr-bg-card)',
    textPrimary:    'var(--hr-text-primary)',
    textSecondary:  'var(--hr-text-secondary)',
    textMuted:      'var(--hr-text-muted)',
  
    // Status
    green:        '#10b981',
    greenLight:   '#34d399',
    greenFaint:   '#d1fae5',
    red:          '#ef4444',
    amber:        '#f59e0b',
  }
  
  export const gradients = {
    header:   'linear-gradient(135deg, #5b21b6 0%, #7c3aed 45%, #a855f7 75%, #ec4899 100%)',
    purple:   'linear-gradient(135deg, #7c3aed, #a855f7)',
    purplePink: 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)',
    progress: 'linear-gradient(90deg, #7c3aed, #a855f7, #ec4899)',
    done:     'linear-gradient(90deg, #10b981, #34d399)',
  }
  
  export const typography = {
    fontFamily: 'var(--font-dm-sans), var(--font-nunito), sans-serif',
    sizes: {
      xs:   11,
      sm:   12,
      base: 13.5,
      md:   15,
      lg:   17,
      xl:   20,
    },
    weights: {
      normal:    400,
      medium:    500,
      semibold:  600,
      bold:      700,
      extrabold: 800,
      black:     900,
    },
    label: {   // ALL-CAPS section labels
      fontSize: 11,
      fontWeight: 800,
      color: '#9ca3af',
      letterSpacing: 1,
      marginBottom: 14,
      marginTop: 8,
    } as React.CSSProperties,
  }
  
  export const layout = {
    maxWidth:       1100,
    headerHeight:   58,
    mainPadding:    '24px 24px 48px',
    cardRadius:     14,
    cardBorder:     '1.5px solid',
    cardGap:        16,
    gridCols3:      'repeat(3, 1fr)',
  }
  
  // ─── Shared Page Shells ───────────────────────────────────────────────────────
  // Reusable CSS objects for page-level layout — import and spread into your css objects
  
  export const pageShell: Record<string, React.CSSProperties> = {
    root: {
      fontFamily: typography.fontFamily,
      background: colors.pageBackground,
      minHeight: '100vh',
    },
    topBar: {
      background: gradients.header,
      padding: '0 24px',
      height: layout.headerHeight,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 50,
    },
    topBarLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flex: 1,
    },
    topBarRight: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    },
    logo: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 1,
    },
    logoMain: {
      color: '#fff',
      fontWeight: 900,
      fontSize: 17,
      letterSpacing: -0.3,
    },
    logoAccent: {
      color: colors.yellow,
      fontWeight: 900,
      fontSize: 17,
    },
    pageTitle: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 13.5,
      fontWeight: 700,
    },
    headerBtn: {
      background: 'rgba(255,255,255,0.15)',
      border: '1px solid rgba(255,255,255,0.25)',
      borderRadius: 8,
      color: '#fff',
      fontSize: 12.5,
      fontWeight: 600,
      padding: '6px 14px',
      cursor: 'pointer',
    },
    main: {
      maxWidth: layout.maxWidth,
      margin: '0 auto',
      padding: layout.mainPadding,
    },
    card: {
      background: colors.cardBackground,
      borderRadius: layout.cardRadius,
      border: `${layout.cardBorder} ${colors.purpleBorder}`,
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(124,58,237,0.08)',
    },
    cardHead: {
      padding: '13px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: gradients.purple,
    },
    cardTitle: {
      color: '#fff',
      fontWeight: 900,
      fontSize: 15,
      flex: 1,
      letterSpacing: 0.1,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: 800,
      color: colors.textMuted,
      letterSpacing: 1,
      marginBottom: 14,
      marginTop: 8,
    },
  }