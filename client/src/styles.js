export const dashboardStyles = {
  statsCard: {
    p: 3,
    flex: 1,
    textAlign: 'center',
    transition: 'transform 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)',
    },
  },
  statsValue: {
    fontSize: '2rem',
    fontWeight: 600,
    color: 'primary.main',
  },
  statsLabel: {
    color: 'text.secondary',
    fontWeight: 500,
    mb: 2,
  },
  pageTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    mb: 4,
  },
  tableContainer: {
    '& .MuiTableRow-root:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
    },
  },
  actionButton: {
    minWidth: 120,
  },
  settlementDialog: {
    '& .MuiDialog-paper': {
      borderRadius: 16,
    },
  },
  settlementAmount: {
    fontWeight: 600,
    fontSize: '1.1rem',
  },
}; 