import { extendTheme, type ThemeConfig } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
}

export const theme = extendTheme({
  config,
  colors: {
    // Warm orange/brown palette inspired by robot/desert themes
    brand: {
      50: '#fff7ed',   // Very light cream
      100: '#ffedd5',  // Light peach
      200: '#fed7aa',  // Soft orange
      300: '#fdba74',  // Light orange
      400: '#fb923c',  // Medium orange
      500: '#f97316',  // Main brand orange
      600: '#ea580c',  // Deep orange
      700: '#c2410c',  // Dark orange
      800: '#9a3412',  // Rich brown-orange
      900: '#7c2d12',  // Deep brown
    },
    // Accent yellow for highlights
    accent: {
      50: '#fefce8',   // Very light yellow
      100: '#fef9c3',  // Light yellow
      200: '#fef08a',  // Soft yellow
      300: '#fde047',  // Medium yellow
      400: '#facc15',  // Bright yellow
      500: '#eab308',  // Main accent yellow
      600: '#ca8a04',  // Gold
      700: '#a16207',  // Dark gold
      800: '#854d0e',  // Bronze
      900: '#713f12',  // Dark bronze
    },
    // Brown palette for secondary elements
    brown: {
      50: '#fafaf9',   // Off white
      100: '#f5f5f4',  // Very light gray-brown
      200: '#e7e5e4',  // Light brown-gray
      300: '#d6d3d1',  // Medium brown-gray
      400: '#a8a29e',  // Gray-brown
      500: '#78716c',  // Medium brown
      600: '#57534e',  // Dark brown-gray
      700: '#44403c',  // Dark brown
      800: '#292524',  // Very dark brown
      900: '#1c1917',  // Almost black brown
    },
  },
  fonts: {
    heading: `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    body: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  },
  styles: {
    global: {
      body: {
        bg: 'brand.50',
        color: 'brown.800',
      },
      '*::selection': {
        bg: 'accent.200',
        color: 'brown.900',
      },
      '::-webkit-scrollbar': {
        width: '10px',
        height: '10px',
      },
      '::-webkit-scrollbar-track': {
        bg: 'brand.100',
      },
      '::-webkit-scrollbar-thumb': {
        bg: 'brand.400',
        borderRadius: 'full',
      },
      '::-webkit-scrollbar-thumb:hover': {
        bg: 'brand.500',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'semibold',
        borderRadius: 'lg',
      },
      variants: {
        solid: {
          bg: 'brand.500',
          color: 'white',
          _hover: {
            bg: 'brand.600',
            transform: 'translateY(-2px)',
            boxShadow: 'lg',
            _disabled: {
              bg: 'brand.500',
              transform: 'none',
            },
          },
          _active: {
            bg: 'brand.700',
            transform: 'translateY(0)',
          },
          transition: 'all 0.2s',
        },
        outline: {
          borderColor: 'brand.500',
          color: 'brand.600',
          _hover: {
            bg: 'brand.50',
            borderColor: 'brand.600',
          },
        },
        ghost: {
          color: 'brand.600',
          _hover: {
            bg: 'brand.100',
          },
        },
      },
      defaultProps: {
        colorScheme: 'brand',
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'white',
          borderRadius: 'xl',
          boxShadow: 'sm',
          borderWidth: '1px',
          borderColor: 'brand.200',
        },
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            borderColor: 'brown.300',
            bg: 'white',
            _hover: {
              borderColor: 'brand.400',
            },
            _focus: {
              borderColor: 'brand.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
            },
          },
        },
      },
    },
    Select: {
      variants: {
        outline: {
          field: {
            borderColor: 'brown.300',
            bg: 'white',
            _hover: {
              borderColor: 'brand.400',
            },
            _focus: {
              borderColor: 'brand.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
            },
          },
        },
      },
    },
    Heading: {
      baseStyle: {
        color: 'brown.800',
        fontWeight: 'bold',
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          bg: 'white',
          borderRadius: 'xl',
        },
        header: {
          color: 'brown.800',
          fontWeight: 'bold',
        },
      },
    },
  },
})
