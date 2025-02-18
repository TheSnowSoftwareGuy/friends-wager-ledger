import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#2C3E50', // Deep blue-gray
      light: '#34495E',
      dark: '#1A252F',
    },
    secondary: {
      main: '#E74C3C', // Vibrant red
      light: '#EC7063',
      dark: '#C0392B',
    },
    success: {
      main: '#27AE60', // Emerald green
      light: '#2ECC71',
      dark: '#219A52',
    },
    error: {
      main: '#C0392B', // Dark red
      light: '#E74C3C',
      dark: '#962D22',
    },
    warning: {
      main: '#F39C12', // Orange
      light: '#F1C40F',
      dark: '#D68910',
    },
    background: {
      default: '#ECF0F1', // Light gray
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
      letterSpacing: '-0.5px',
    },
    h4: {
      fontWeight: 600,
      letterSpacing: '-0.5px',
    },
    h6: {
      fontWeight: 500,
      letterSpacing: '0.5px',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          padding: '8px 24px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: '#F8FAFC',
        },
      },
    },
  },
}); 