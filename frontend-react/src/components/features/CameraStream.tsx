import { Box, Text, VStack, Button, HStack } from '@chakra-ui/react'
import { useState, useEffect, useCallback } from 'react'
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons'
import { robotApi } from '../../services/robotApi'
import { useWallet } from '../../hooks/useWallet'

/**
 * Camera stream component that fetches frames through the backend API
 * Requires an active session (wallet connected with valid session)
 * Camera must be manually connected via button - no automatic polling
 */
export function CameraStream() {
  const { address } = useWallet()
  const [isConnected, setIsConnected] = useState(false)
  const [imageUrl, setImageUrl] = useState<string>('')
  const [hasError, setHasError] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  // Cleanup function for object URLs
  const cleanupImageUrl = useCallback(() => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl)
      setImageUrl('')
    }
  }, [imageUrl])

  const handleConnect = () => {
    setIsConnecting(true)
    setHasError(false)
    setIsConnected(true)
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    cleanupImageUrl()
    setHasError(false)
  }

  // Polling effect - only runs when connected
  useEffect(() => {
    if (!isConnected || !address) {
      return
    }

    let currentObjectUrl: string | null = null
    let failCount = 0
    const maxFails = 5

    const fetchImage = async () => {
      try {
        const blob = await robotApi.getCameraFrame(address)

        if (blob) {
          // Revoke previous URL to prevent memory leak
          if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl)
          }
          currentObjectUrl = URL.createObjectURL(blob)
          setImageUrl(currentObjectUrl)
          setIsConnecting(false)
          failCount = 0
          setHasError(false)
        } else {
          failCount++
          if (failCount >= maxFails) {
            setHasError(true)
            setIsConnecting(false)
          }
        }
      } catch {
        failCount++
        if (failCount >= maxFails) {
          setHasError(true)
          setIsConnecting(false)
        }
      }
    }

    // Fetch first image immediately
    void fetchImage()

    // Poll every second
    const interval = setInterval(() => { void fetchImage(); }, 1000)

    return () => {
      clearInterval(interval)
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl)
      }
    }
  }, [isConnected, address])

  if (!address) {
    return (
      <VStack spacing={2} p={4} bg="gray.100" borderRadius="md" justify="center">
        <Text fontSize="sm" color="gray.500">
          Camera requires wallet connection
        </Text>
      </VStack>
    )
  }

  // Not connected - show connect button
  if (!isConnected) {
    return (
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Text fontSize={{ base: "md", md: "lg" }} fontWeight="semibold">
            Camera Feed
          </Text>
          <Button
            size="sm"
            colorScheme="brand"
            leftIcon={<ViewIcon />}
            onClick={handleConnect}
          >
            Connect Camera
          </Button>
        </HStack>
        <Box p={4} bg="gray.100" borderRadius="md" textAlign="center">
          <Text fontSize="sm" color="gray.500">
            Click "Connect Camera" to start the video stream
          </Text>
        </Box>
      </VStack>
    )
  }

  // Connected but error
  if (hasError) {
    return (
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Text fontSize={{ base: "md", md: "lg" }} fontWeight="semibold">
            Camera Feed
          </Text>
          <Button
            size="sm"
            colorScheme="red"
            variant="outline"
            leftIcon={<ViewOffIcon />}
            onClick={handleDisconnect}
          >
            Disconnect
          </Button>
        </HStack>
        <VStack spacing={2} p={6} bg="red.50" borderRadius="md" justify="center">
          <Text fontSize="md" fontWeight="semibold" color="red.600">
            Camera Unavailable
          </Text>
          <Text fontSize="sm" color="red.500">
            Unable to get camera stream from robot
          </Text>
          <Button
            size="sm"
            colorScheme="brand"
            mt={2}
            onClick={handleConnect}
          >
            Retry
          </Button>
        </VStack>
      </VStack>
    )
  }

  // Connected and loading
  if (isConnecting || !imageUrl) {
    return (
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Text fontSize={{ base: "md", md: "lg" }} fontWeight="semibold">
            Camera Feed
          </Text>
          <Button
            size="sm"
            colorScheme="red"
            variant="outline"
            leftIcon={<ViewOffIcon />}
            onClick={handleDisconnect}
          >
            Disconnect
          </Button>
        </HStack>
        <Box
          width="100%"
          maxW="800px"
          minH="200px"
          bg="gray.200"
          borderRadius="md"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Text color="gray.500">Connecting to camera...</Text>
        </Box>
      </VStack>
    )
  }

  // Connected and streaming
  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between">
        <Text fontSize={{ base: "md", md: "lg" }} fontWeight="semibold">
          Camera Feed
        </Text>
        <Button
          size="sm"
          colorScheme="red"
          variant="outline"
          leftIcon={<ViewOffIcon />}
          onClick={handleDisconnect}
        >
          Disconnect
        </Button>
      </HStack>
      <Box display="flex" justifyContent="center" width="100%">
        <Box
          position="relative"
          maxW="800px"
          bg="black"
          borderRadius="md"
          overflow="hidden"
        >
          <Box
            as="img"
            src={imageUrl}
            alt="Robot camera stream"
            width="100%"
            height="auto"
            display="block"
          />
        </Box>
      </Box>
    </VStack>
  )
}
