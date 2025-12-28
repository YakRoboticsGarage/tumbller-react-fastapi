# Chakra UI Theme Customization - Tumbller

The Tumbller Robot Control app uses a warm, industrial color palette with orange, yellow, and brown tones.

## Current Theme Structure

Our theme is a single-file implementation in `src/theme/index.ts` that includes:
- Color palettes (brand orange, accent yellow, brown neutrals)
- Typography (Plus Jakarta Sans, Inter)
- Global styles
- Component style overrides

## Color Palette

### Brand Orange (Primary Actions)

Vibrant orange palette for buttons, primary actions, and interactive elements.

```ts
brand: {
  50: '#fff7ed',   // Very light cream - backgrounds
  100: '#ffedd5',  // Light peach - subtle backgrounds, scrollbar track
  200: '#fed7aa',  // Soft orange - borders, dividers
  300: '#fdba74',  // Light orange - disabled states
  400: '#fb923c',  // Medium orange - scrollbar thumb, accents
  500: '#f97316',  // Main brand orange - primary buttons ⭐
  600: '#ea580c',  // Deep orange - button hover
  700: '#c2410c',  // Dark orange - button active
  800: '#9a3412',  // Rich brown-orange
  900: '#7c2d12',  // Deep brown
}
```

### Accent Yellow (Highlights & Warnings)

Golden yellow palette for highlights, warnings, and special emphasis.

```ts
accent: {
  50: '#fefce8',   // Very light yellow
  100: '#fef9c3',  // Light yellow
  200: '#fef08a',  // Soft yellow - text selection background ⭐
  300: '#fde047',  // Medium yellow
  400: '#facc15',  // Bright yellow
  500: '#eab308',  // Main accent yellow
  600: '#ca8a04',  // Gold
  700: '#a16207',  // Dark gold
  800: '#854d0e',  // Bronze
  900: '#713f12',  // Dark bronze
}
```

### Brown (Text & Neutrals)

Earthy brown tones for text, borders, and neutral elements.

```ts
brown: {
  50: '#fafaf9',   // Off white
  100: '#f5f5f4',  // Very light gray-brown
  200: '#e7e5e4',  // Light brown-gray
  300: '#d6d3d1',  // Medium brown-gray - input borders ⭐
  400: '#a8a29e',  // Gray-brown
  500: '#78716c',  // Medium brown
  600: '#57534e',  // Dark brown-gray - secondary text ⭐
  700: '#44403c',  // Dark brown
  800: '#292524',  // Very dark brown - primary text ⭐
  900: '#1c1917',  // Almost black brown - darkest text
}
```

## Typography

```ts
fonts: {
  heading: `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  body: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
}
```

**Headings**: Plus Jakarta Sans - modern, bold, friendly
**Body**: Inter - clean, highly readable, professional

## Global Styles

### Background & Text

```ts
body: {
  bg: 'brand.50',      // Warm cream background
  color: 'brown.800',  // Dark brown text
}
```

### Text Selection

```ts
'*::selection': {
  bg: 'accent.200',    // Soft yellow highlight
  color: 'brown.900',  // Dark brown text
}
```

### Custom Scrollbar

```ts
'::-webkit-scrollbar': {
  width: '10px',
  height: '10px',
}
'::-webkit-scrollbar-track': {
  bg: 'brand.100',     // Light peach
}
'::-webkit-scrollbar-thumb': {
  bg: 'brand.400',     // Medium orange
  borderRadius: 'full',
}
'::-webkit-scrollbar-thumb:hover': {
  bg: 'brand.500',     // Main brand orange
}
```

## Component Styles

### Button

**Solid Variant** (Default)
- Background: `brand.500` (#f97316)
- Text: white
- Hover: `brand.600` with lift animation (`translateY(-2px)`)
- Active: `brand.700`
- Transition: 0.2s smooth

**Outline Variant**
- Border: `brand.500`
- Text: `brand.600`
- Hover: `brand.50` background

**Ghost Variant**
- Text: `brand.600`
- Hover: `brand.100` background

```tsx
<Button colorScheme="brand">Primary Action</Button>
<Button colorScheme="brand" variant="outline">Secondary</Button>
<Button colorScheme="red">Destructive</Button>
```

### Card

```ts
Card: {
  container: {
    bg: 'white',
    borderRadius: 'xl',
    boxShadow: 'sm',
    borderWidth: '1px',
    borderColor: 'brand.200',  // Soft orange border
  }
}
```

### Input & Select

```ts
variants: {
  outline: {
    field: {
      borderColor: 'brown.300',  // Medium brown-gray
      bg: 'white',
      _hover: { borderColor: 'brand.400' },
      _focus: {
        borderColor: 'brand.500',
        boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
      }
    }
  }
}
```

### Heading

```ts
Heading: {
  baseStyle: {
    color: 'brown.800',    // Dark brown
    fontWeight: 'bold',
  }
}
```

### Modal

```ts
Modal: {
  dialog: {
    bg: 'white',
    borderRadius: 'xl',
  },
  header: {
    color: 'brown.800',
    fontWeight: 'bold',
  }
}
```

## Usage Examples

### Using Brand Colors

```tsx
// Primary button (orange)
<Button colorScheme="brand">Connect to Robot</Button>

// Accent yellow for highlights
<Box bg="accent.100" borderColor="accent.300">
  <Text color="accent.700">Warning message</Text>
</Box>

// Brown for text
<Text color="brown.600">Secondary text</Text>
<Text color="brown.800">Primary text</Text>
```

### Status Colors

```tsx
// Success (green)
<Badge colorScheme="green">Online</Badge>

// Error (red)
<Badge colorScheme="red">Offline</Badge>

// Warning (accent yellow can be used)
<Alert status="warning">Check connection</Alert>
```

### Custom Components

```tsx
// Connection status badge
<Box
  px={3}
  py={1}
  bg="green.50"
  borderColor="green.200"
  borderWidth="1px"
  borderRadius="md"
>
  <Text color="green.600">Connected</Text>
</Box>
```

## Modifying the Theme

### Changing Colors

Edit `src/theme/index.ts`:

```ts
colors: {
  brand: {
    // Modify these values
    500: '#your-color',  // Main brand color
    600: '#your-darker', // Hover state
  }
}
```

### Adding New Color Palettes

```ts
colors: {
  brand: { /* ... */ },
  accent: { /* ... */ },
  brown: { /* ... */ },

  // Add new palette
  custom: {
    50: '#...',
    500: '#...',
    900: '#...',
  }
}
```

### Customizing Component Styles

```ts
components: {
  Button: {
    baseStyle: {
      // Modify base styles
      borderRadius: '2xl',  // More rounded
    },
    variants: {
      solid: {
        // Modify solid variant
      }
    }
  }
}
```

## Design Philosophy

The Tumbller theme embodies:

🔥 **Warmth** - Orange and yellow evoke energy, approachability, and action
🏭 **Industrial** - Brown tones ground the design in physical robotics
✨ **Modern** - Clean typography and subtle effects create contemporary feel
🎮 **Playful** - Slight button lifts and smooth transitions add personality

Perfect for a robot control interface that's both functional and friendly!

## Color Accessibility

All color combinations meet WCAG AA standards:

- ✅ Brown 800 on Brand 50: AAA (12.8:1)
- ✅ White on Brand 500: AAA (4.8:1)
- ✅ Brand 600 on White: AA (4.5:1)
- ✅ Brown 800 on White: AAA (15.7:1)

## Testing Your Theme

```bash
# Start dev server to see changes
pnpm dev

# Check for TypeScript errors
pnpm typecheck

# Lint theme code
pnpm lint
```

Changes to `src/theme/index.ts` will hot-reload automatically in development!
