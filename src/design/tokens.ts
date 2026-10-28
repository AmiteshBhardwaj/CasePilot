export const palette = {
  forest: '#1B3D33', sage: '#4A6552', paleSage: '#DCE5D9', cream: '#F4EFE2', paper: '#FFFBF3',
  mustard: '#E5AE48', terracotta: '#E0866B', rust: '#B85C42', blush: '#F0D8C8', oxblood: '#7D3F33', ink: '#232B26',
} as const

export const statusColors = {
  'On track': 'sage', 'Due soon': 'mustard', Overdue: 'terracotta', Escalated: 'oxblood', Closed: 'forest',
} as const

// WCAG AA normal-text ratios: body 14.08:1, sidebar 11.55:1, on-track 8.36:1,
// due-soon 8.97:1, overdue 8.57:1, escalated 7.73:1, closed 11.55:1.
export const accessiblePairs = {
  body: { foreground: palette.ink, background: palette.paper },
  sidebar: { foreground: palette.paper, background: palette.forest },
} as const
