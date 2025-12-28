# Component Patterns

## Chakra UI Component Architecture

### Basic Component Structure

```tsx
// src/components/common/Card.tsx
import { Box, BoxProps } from '@chakra-ui/react'
import { forwardRef } from 'react'

interface CardProps extends BoxProps {
  variant?: 'elevated' | 'outline' | 'filled'
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'elevated', children, ...props }, ref) => {
    return (
      <Box
        ref={ref}
        bg="white"
        borderRadius="lg"
        boxShadow={variant === 'elevated' ? 'md' : 'none'}
        border={variant === 'outline' ? '1px solid' : 'none'}
        borderColor="gray.200"
        p={4}
        {...props}
      >
        {children}
      </Box>
    )
  }
)

Card.displayName = 'Card'
```

### Compound Components Pattern

Use for complex components with multiple related parts:

```tsx
// src/components/features/DataTable/index.tsx
import { DataTableRoot } from './DataTableRoot'
import { DataTableHeader } from './DataTableHeader'
import { DataTableBody } from './DataTableBody'
import { DataTableRow } from './DataTableRow'

export const DataTable = {
  Root: DataTableRoot,
  Header: DataTableHeader,
  Body: DataTableBody,
  Row: DataTableRow,
}

// Usage:
// <DataTable.Root>
//   <DataTable.Header columns={columns} />
//   <DataTable.Body data={data} />
// </DataTable.Root>
```

### Custom Hooks for Component Logic

Extract complex logic from components:

```tsx
// src/hooks/useDisclosureWithCallback.ts
import { useDisclosure, UseDisclosureReturn } from '@chakra-ui/react'
import { useCallback } from 'react'

export function useDisclosureWithCallback(
  onOpenCallback?: () => void,
  onCloseCallback?: () => void
): UseDisclosureReturn {
  const disclosure = useDisclosure()

  const onOpen = useCallback(() => {
    onOpenCallback?.()
    disclosure.onOpen()
  }, [disclosure, onOpenCallback])

  const onClose = useCallback(() => {
    onCloseCallback?.()
    disclosure.onClose()
  }, [disclosure, onCloseCallback])

  return { ...disclosure, onOpen, onClose }
}
```

## Chakra UI Best Practices

### Use Semantic HTML with `as` Prop

```tsx
// Good - semantic HTML
<Box as="article" role="article">
  <Heading as="h2">Title</Heading>
  <Text as="p">Content</Text>
</Box>

// Avoid - div soup
<Box>
  <Box fontWeight="bold">Title</Box>
  <Box>Content</Box>
</Box>
```

### Responsive Props

```tsx
<Box
  display="flex"
  flexDirection={{ base: 'column', md: 'row' }}
  gap={{ base: 4, md: 8 }}
  p={{ base: 4, sm: 6, lg: 8 }}
>
```

### Use Theme Tokens

```tsx
// Good - uses theme tokens
<Box bg="brand.500" color="gray.100" borderRadius="md" />

// Avoid - hardcoded values
<Box bg="#3182CE" color="#F7FAFC" borderRadius="8px" />
```

### Component Variants via Theme

Define variants in theme instead of props:

```tsx
// theme/components/Button.ts
export const Button = {
  variants: {
    primary: {
      bg: 'brand.500',
      color: 'white',
      _hover: { bg: 'brand.600' },
    },
    ghost: {
      bg: 'transparent',
      _hover: { bg: 'gray.100' },
    },
  },
  defaultProps: {
    variant: 'primary',
  },
}
```

## File Organization

```
src/components/
├── common/                  # Shared across features
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   └── index.ts
│   ├── Card/
│   ├── Modal/
│   └── index.ts             # Barrel export
├── features/                # Feature-specific
│   ├── Auth/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── index.ts
│   └── Dashboard/
└── layouts/                 # Page layouts
    ├── MainLayout.tsx
    ├── AuthLayout.tsx
    └── index.ts
```

## Testing Components

```tsx
// src/components/common/Button/Button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChakraProvider } from '@chakra-ui/react'
import { Button } from './Button'

const renderWithChakra = (ui: React.ReactElement) => {
  return render(<ChakraProvider>{ui}</ChakraProvider>)
}

describe('Button', () => {
  it('renders children correctly', () => {
    renderWithChakra(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    renderWithChakra(<Button onClick={onClick}>Click</Button>)
    
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
```
