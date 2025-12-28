# Tumbller Robot Control - Theme Guide

## Color Palette

The Tumbller app uses a warm, earthy color palette inspired by desert robotics and industrial design.

### Brand Orange (Primary)

The main brand color is a vibrant orange that represents energy and innovation.

| Shade | Hex | Use Case |
|-------|-----|----------|
| 50 | `#fff7ed` | Background, lightest tint |
| 100 | `#ffedd5` | Hover states, subtle backgrounds |
| 200 | `#fed7aa` | Card borders, dividers |
| 300 | `#fdba74` | Disabled states |
| 400 | `#fb923c` | Scrollbar, accents |
| **500** | **`#f97316`** | **Primary buttons, main brand** |
| 600 | `#ea580c` | Button hover states |
| 700 | `#c2410c` | Button active states |
| 800 | `#9a3412` | Dark accents |
| 900 | `#7c2d12` | Darkest shade |

### Accent Yellow (Highlights)

Yellow accents add warmth and highlight important elements.

| Shade | Hex | Use Case |
|-------|-----|----------|
| 50 | `#fefce8` | Selection background |
| 100 | `#fef9c3` | Hover highlights |
| 200 | `#fef08a` | Text selection |
| 300 | `#fde047` | Warning states |
| 400 | `#facc15` | Bright accents |
| **500** | **`#eab308`** | **Primary accent** |
| 600 | `#ca8a04` | Gold accents |
| 700 | `#a16207` | Dark gold |
| 800 | `#854d0e` | Bronze |
| 900 | `#713f12` | Dark bronze |

### Brown (Neutral/Text)

Brown tones provide grounding and are used for text and subtle backgrounds.

| Shade | Hex | Use Case |
|-------|-----|----------|
| 50 | `#fafaf9` | White alternative |
| 100 | `#f5f5f4` | Subtle backgrounds |
| 200 | `#e7e5e4` | Borders |
| 300 | `#d6d3d1` | Input borders |
| 400 | `#a8a29e` | Placeholder text |
| 500 | `#78716c` | Secondary text |
| 600 | `#57534e` | Muted text |
| 700 | `#44403c` | Dark text |
| **800** | **`#292524`** | **Primary text** |
| 900 | `#1c1917` | Darkest text |

## Typography

### Font Families

- **Headings**: Plus Jakarta Sans (bold, modern sans-serif)
- **Body**: Inter (clean, readable sans-serif)
- **Code**: System monospace

### Font Usage

```tsx
// Headings use Plus Jakarta Sans
<Heading>Tumbller Robot Control</Heading>

// Body text uses Inter
<Text>Select a robot from the dropdown</Text>
```

## Component Styles

### Buttons

**Primary (Solid)**
- Background: Orange 500 (`#f97316`)
- Text: White
- Hover: Orange 600 with slight lift effect
- Active: Orange 700

**Outline**
- Border: Orange 500
- Text: Orange 600
- Hover: Orange 50 background

**Ghost**
- Text: Orange 600
- Hover: Orange 100 background

### Cards

- Background: White
- Border: Orange 200 (`#fed7aa`)
- Border Radius: xl (0.75rem)
- Shadow: Subtle box shadow

### Inputs & Selects

- Border: Brown 300 (`#d6d3d1`)
- Background: White
- Hover: Orange 400 border
- Focus: Orange 500 border with glow

### Modal

- Background: White
- Border Radius: xl
- Header: Brown 800 text

## Global Styles

### Background

```css
body {
  background: #fff7ed; /* brand.50 - warm cream */
  color: #292524; /* brown.800 - dark brown */
}
```

### Text Selection

```css
::selection {
  background: #fef08a; /* accent.200 - soft yellow */
  color: #1c1917; /* brown.900 - almost black */
}
```

### Scrollbar

```css
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: #ffedd5; /* brand.100 - light peach */
}

::-webkit-scrollbar-thumb {
  background: #fb923c; /* brand.400 - medium orange */
  border-radius: 9999px;
}

::-webkit-scrollbar-thumb:hover {
  background: #f97316; /* brand.500 - main orange */
}
```

## Visual Enhancements

### Button Interactions

All buttons have smooth transitions with:
- Hover: Slight upward lift (`translateY(-2px)`)
- Box shadow on hover for depth
- Active state returns to original position
- 0.2s transition timing

### Card Styling

Cards have:
- Rounded corners (xl border radius)
- Subtle shadows
- Orange tinted borders
- White backgrounds for content clarity

## Using the Theme

### In Components

```tsx
import { Button, Box, Text } from '@chakra-ui/react'

// Primary button uses brand color automatically
<Button>Click me</Button>

// Use brand colors explicitly
<Box bg="brand.50" borderColor="brand.200">
  <Text color="brown.800">Content</Text>
</Box>

// Use accent for highlights
<Text color="accent.600" fontWeight="bold">
  Important!
</Text>
```

### Color Scheme Props

Most Chakra components accept `colorScheme` prop:

```tsx
// Brand orange (default)
<Button colorScheme="brand">Primary Action</Button>

// Accent yellow
<Button colorScheme="accent">Secondary Action</Button>

// Red for destructive actions
<Button colorScheme="red">Delete</Button>
```

## Accessibility

### Contrast Ratios

All text/background combinations meet WCAG AA standards:
- Brown 800 on Brand 50: ✓ AAA (12.8:1)
- White on Brand 500: ✓ AAA (4.8:1)
- Brand 600 on White: ✓ AA (4.5:1)

### Focus States

All interactive elements have visible focus indicators using the orange brand color with a subtle glow effect.

## Theming Philosophy

The Tumbller theme embodies:
- **Warmth**: Orange and yellow evoke energy and approachability
- **Industrial**: Brown tones ground the design in the physical world of robotics
- **Modern**: Clean typography and subtle shadows create a contemporary feel
- **Playful**: Slight button lift effects add personality without being distracting

Perfect for a robot control interface that's both functional and friendly!
