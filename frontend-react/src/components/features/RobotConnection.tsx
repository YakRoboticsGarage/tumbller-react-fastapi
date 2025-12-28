import { Button, VStack, HStack, Text, Box, Spinner } from '@chakra-ui/react'
import { useState, useEffect, useRef } from 'react'
import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { robotApi } from '../../services/robotApi'
import { useRobotStore } from '../../stores/robotStore'
import { useWallet } from '../../hooks/useWallet'
import type { RobotState } from '../../types'

interface RobotConnectionProps {
  robot: RobotState
}

export function RobotConnection({ robot }: RobotConnectionProps) {
  const updateRobotStatus = useRobotStore((state) => state.updateRobotStatus)
  const { isConnected: isWalletConnected } = useWallet()
  const [isChecking, setIsChecking] = useState(false)
  const prevWalletConnected = useRef(isWalletConnected)

  // Disconnect robot when wallet disconnects (but not on initial mount)
  useEffect(() => {
    // Only act when wallet status changes from connected to disconnected
    if (prevWalletConnected.current && !isWalletConnected && robot.connectionStatus === 'online') {
      updateRobotStatus(robot.config.id, { connectionStatus: 'disconnected' })
    }
    prevWalletConnected.current = isWalletConnected
  }, [isWalletConnected, robot.connectionStatus, robot.config.id, updateRobotStatus])

  const handleConnect = () => {
    setIsChecking(true)
    updateRobotStatus(robot.config.id, { connectionStatus: 'connecting' })

    robotApi.checkRobotStatus(robot.config.motorIp)
      .then((status) => {
        if (status.motorOnline) {
          updateRobotStatus(robot.config.id, { connectionStatus: 'online' })
        } else {
          updateRobotStatus(robot.config.id, { connectionStatus: 'offline' })
        }
      })
      .catch(() => {
        updateRobotStatus(robot.config.id, { connectionStatus: 'offline' })
      })
      .finally(() => {
        setIsChecking(false)
      })
  }

  const handleDisconnect = () => {
    updateRobotStatus(robot.config.id, { connectionStatus: 'disconnected' })
  }

  const getStatusDisplay = () => {
    switch (robot.connectionStatus) {
      case 'online':
        return {
          icon: <CheckCircleIcon color="green.500" boxSize={5} />,
          text: 'Connected',
          color: 'green.600',
          bg: 'green.50',
          borderColor: 'green.200',
        }
      case 'offline':
        return {
          icon: <WarningIcon color="red.500" boxSize={5} />,
          text: 'Offline',
          color: 'red.600',
          bg: 'red.50',
          borderColor: 'red.200',
        }
      case 'connecting':
        return {
          icon: <Spinner size="sm" color="blue.500" />,
          text: 'Connecting...',
          color: 'blue.600',
          bg: 'blue.50',
          borderColor: 'blue.200',
        }
      case 'disconnected':
      default:
        return {
          icon: null,
          text: 'Not Connected',
          color: 'gray.600',
          bg: 'gray.50',
          borderColor: 'gray.200',
        }
    }
  }

  const status = getStatusDisplay()

  return (
    <VStack spacing={4} align="stretch">
      <VStack spacing={3} align="stretch">
        <HStack spacing={2} flexWrap="wrap">
          <Text fontSize={{ base: "md", md: "lg" }} fontWeight="semibold">
            Robot Status
          </Text>
          <Box
            px={{ base: 2, md: 3 }}
            py={1}
            borderRadius="md"
            bg={status.bg}
            borderWidth="1px"
            borderColor={status.borderColor}
          >
            <HStack spacing={2}>
              {status.icon}
              <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" color={status.color}>
                {status.text}
              </Text>
            </HStack>
          </Box>
        </HStack>

        <Box width={{ base: "full", md: "auto" }}>
          {robot.connectionStatus === 'online' ? (
            <Button
              colorScheme="red"
              variant="outline"
              size={{ base: "sm", md: "md" }}
              onClick={handleDisconnect}
              width={{ base: "full", md: "auto" }}
            >
              Disconnect
            </Button>
          ) : robot.connectionStatus === 'connecting' ? (
            <Button
              colorScheme="brand"
              size={{ base: "sm", md: "md" }}
              isLoading={true}
              loadingText="Connecting..."
              width={{ base: "full", md: "auto" }}
            >
              Connecting...
            </Button>
          ) : (
            <Button
              colorScheme="brand"
              size={{ base: "sm", md: "md" }}
              onClick={handleConnect}
              isLoading={isChecking}
              isDisabled={!isWalletConnected}
              loadingText="Checking..."
              width={{ base: "full", md: "auto" }}
            >
              {robot.connectionStatus === 'offline' ? 'Retry Connection' : 'Connect to Robot'}
            </Button>
          )}
        </Box>

        {!isWalletConnected && robot.connectionStatus !== 'online' && (
          <Text fontSize="xs" color="orange.500">
            Connect wallet first to control robot
          </Text>
        )}
      </VStack>

      {robot.connectionStatus === 'offline' && (
        <Box p={4} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
          <VStack spacing={2} align="start">
            <Text fontSize="sm" fontWeight="semibold" color="red.700">
              Unable to connect to robot
            </Text>
            <Text fontSize="sm" color="red.600">
              Motor Controller IP: {robot.config.motorIp}
            </Text>
            <Text fontSize="xs" color="red.600" mt={1}>
              Please check:
            </Text>
            <VStack spacing={0.5} fontSize="xs" color="red.600" align="start" pl={2}>
              <Text>• Robot is powered on</Text>
              <Text>• ESP32S3 is connected to the network</Text>
              <Text>• IP address is correct</Text>
              <Text>• You are on the same network</Text>
            </VStack>
          </VStack>
        </Box>
      )}
    </VStack>
  )
}
