# API Integration Guide

## React Query Setup

### Query Client Configuration

```tsx
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30,   // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
```

### Provider Setup

```tsx
// src/App.tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/queryClient'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={theme}>
        <RouterProvider router={router} />
      </ChakraProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

## API Client Structure

### Base API Client

```tsx
// src/services/api.ts
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

interface ApiError {
  message: string
  code?: string
  details?: Record<string, string[]>
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error: ApiError = await response.json()
      throw new Error(error.message || 'API request failed')
    }

    return response.json()
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint)
  }

  post<T>(endpoint: string, data: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  put<T>(endpoint: string, data: unknown) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const api = new ApiClient(API_BASE)
```

### Service Functions

```tsx
// src/services/users.ts
import { api } from './api'
import type { User, CreateUserDto, UpdateUserDto } from '@/types/user'

export const usersService = {
  getAll: () => api.get<User[]>('/users'),
  
  getById: (id: string) => api.get<User>(`/users/${id}`),
  
  create: (data: CreateUserDto) => api.post<User>('/users', data),
  
  update: (id: string, data: UpdateUserDto) => 
    api.put<User>(`/users/${id}`, data),
  
  delete: (id: string) => api.delete<void>(`/users/${id}`),
}
```

## Query Hooks

### Custom Query Hook Pattern

```tsx
// src/hooks/queries/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersService } from '@/services/users'
import type { CreateUserDto, UpdateUserDto } from '@/types/user'

// Query keys factory
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: string) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
}

// Queries
export function useUsers() {
  return useQuery({
    queryKey: userKeys.lists(),
    queryFn: usersService.getAll,
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => usersService.getById(id),
    enabled: !!id,
  })
}

// Mutations
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateUserDto) => usersService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      usersService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => usersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}
```

## Usage in Components

```tsx
// src/pages/UsersPage.tsx
import { Box, Spinner, Alert, Button } from '@chakra-ui/react'
import { useUsers, useDeleteUser } from '@/hooks/queries/useUsers'
import { UserCard } from '@/components/features/Users/UserCard'

export function UsersPage() {
  const { data: users, isLoading, error } = useUsers()
  const deleteUser = useDeleteUser()

  if (isLoading) {
    return <Spinner />
  }

  if (error) {
    return <Alert status="error">{error.message}</Alert>
  }

  return (
    <Box>
      {users?.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          onDelete={() => deleteUser.mutate(user.id)}
          isDeleting={deleteUser.isPending}
        />
      ))}
    </Box>
  )
}
```

## Error Handling

### Global Error Handler

```tsx
// src/lib/queryClient.ts
import { toast } from '@chakra-ui/react'

export const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onError: (error) => {
        toast({
          title: 'Error',
          description: error.message,
          status: 'error',
          duration: 5000,
        })
      },
    },
  },
})
```

## Optimistic Updates

```tsx
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      usersService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: userKeys.detail(id) })
      
      const previousUser = queryClient.getQueryData(userKeys.detail(id))
      
      queryClient.setQueryData(userKeys.detail(id), (old: User) => ({
        ...old,
        ...data,
      }))

      return { previousUser }
    },
    onError: (_, { id }, context) => {
      queryClient.setQueryData(userKeys.detail(id), context?.previousUser)
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) })
    },
  })
}
```
