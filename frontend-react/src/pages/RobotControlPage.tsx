import { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
  HStack,
  Card,
  CardBody,
  Button,
  Text,
  Select,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Divider,
  Collapse,
  IconButton,
} from '@chakra-ui/react'
import { AddIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import { useEffect } from 'react'
import { AddRobotForm } from '../components/features/AddRobotForm'
import { CameraStream } from '../components/features/CameraStream'
import { MotorControls } from '../components/features/MotorControls'
import { RobotConnection } from '../components/features/RobotConnection'
import { LogoutButton } from '../components/common/LogoutButton'
import { UserProfile } from '../components/common/UserProfile'
import { WalletButton } from '../components/common/WalletButton'
import { SessionStatus } from '../components/common/SessionStatus'
import { PurchaseAccess } from '../components/common/PurchaseAccess'
import { useRobotStore } from '../stores/robotStore'
import { useAuthEnabled } from '../hooks/useAuth'
import { useSession } from '../hooks/useSession'
import { useWallet } from '../hooks/useWallet'

export function RobotControlPage() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [showRobotDetails, setShowRobotDetails] = useState(false)
  const robots = useRobotStore((state) => state.robots)
  const activeRobotId = useRobotStore((state) => state.activeRobotId)
  const setActiveRobot = useRobotStore((state) => state.setActiveRobot)
  const removeRobot = useRobotStore((state) => state.removeRobot)
  const initializeDefaultRobot = useRobotStore((state) => state.initializeDefaultRobot)
  // Get active robot directly from store to ensure reactivity
  const activeRobot = useRobotStore((state) =>
    state.activeRobotId ? state.robots.get(state.activeRobotId) : undefined
  )

  const isAuthEnabled = useAuthEnabled()
  const { hasActiveSession, isLoading: isSessionLoading } = useSession()
  const { isConnected: isWalletConnected } = useWallet()

  // Initialize default robot from .env on first load
  useEffect(() => {
    initializeDefaultRobot()
  }, [initializeDefaultRobot])

  const robotList = Array.from(robots.values())

  const handleRobotChange = (robotId: string) => {
    setActiveRobot(robotId || null)
  }

  const handleRemoveRobot = () => {
    if (activeRobotId) {
      removeRobot(activeRobotId)
    }
  }

  return (
    <Container maxW="container.xl" py={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }}>
      <VStack spacing={6} align="stretch">
        <VStack spacing={4} align="stretch">
          <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
            <Heading size={{ base: "lg", md: "xl" }}>Tumbller Robot Control</Heading>
            <HStack spacing={2} flexWrap="wrap">
              <SessionStatus />
              <WalletButton />
            </HStack>
          </HStack>
          <HStack spacing={2} flexWrap="wrap" justify="flex-start">
            <Button
              leftIcon={<AddIcon />}
              colorScheme="brand"
              onClick={onOpen}
              size={{ base: "sm", md: "md" }}
              flexShrink={0}
            >
              Add Robot
            </Button>
            {isAuthEnabled && (
              <>
                <UserProfile />
                <LogoutButton />
              </>
            )}
          </HStack>
        </VStack>

        {robotList.length === 0 ? (
          <Card>
            <CardBody>
              <VStack spacing={4} py={8}>
                <Text fontSize="lg" color="gray.600">
                  No robots configured
                </Text>
                <Text color="gray.500">
                  Click "Add Robot" to configure your first Tumbller robot
                </Text>
              </VStack>
            </CardBody>
          </Card>
        ) : (
          <>
            <Card>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Box>
                    <Text mb={2} fontWeight="medium" fontSize={{ base: "sm", md: "md" }}>
                      Select Robot:
                    </Text>
                    <Select
                      value={activeRobotId || ''}
                      onChange={(e) => { handleRobotChange(e.target.value); }}
                      placeholder="Select a robot"
                      size={{ base: "md", md: "md" }}
                    >
                      {robotList.map((robot) => (
                        <option key={robot.config.id} value={robot.config.id}>
                          {robot.config.name}
                        </option>
                      ))}
                    </Select>
                  </Box>
                  {activeRobotId && (
                    <Button
                      colorScheme="red"
                      variant="outline"
                      onClick={handleRemoveRobot}
                      size={{ base: "sm", md: "md" }}
                      width={{ base: "full", md: "auto" }}
                    >
                      Remove Robot
                    </Button>
                  )}
                </VStack>
              </CardBody>
            </Card>

            {activeRobot && (
              <Card>
                <CardBody>
                  <VStack spacing={6} align="stretch">
                    <Box>
                      <HStack justify="space-between" align="center">
                        <Heading size={{ base: "sm", md: "md" }}>
                          {activeRobot.config.name}
                        </Heading>
                        <Button
                          size="sm"
                          variant="ghost"
                          rightIcon={showRobotDetails ? <ChevronUpIcon /> : <ChevronDownIcon />}
                          onClick={() => setShowRobotDetails(!showRobotDetails)}
                        >
                          {showRobotDetails ? 'Hide Details' : 'Show Details'}
                        </Button>
                      </HStack>
                      <Collapse in={showRobotDetails} animateOpacity>
                        <VStack
                          spacing={2}
                          align="flex-start"
                          fontSize={{ base: "xs", md: "sm" }}
                          color="brown.600"
                          mt={4}
                          p={3}
                          bg="gray.50"
                          borderRadius="md"
                        >
                          <Text>
                            Motor: {activeRobot.config.motorIp}
                            {activeRobot.config.motorMdns && ` (${activeRobot.config.motorMdns}.local)`}
                          </Text>
                          <Text>
                            Camera: {activeRobot.config.cameraIp}
                            {activeRobot.config.cameraMdns && ` (${activeRobot.config.cameraMdns}.local)`}
                          </Text>
                        </VStack>
                      </Collapse>
                    </Box>

                    <Divider />

                    <RobotConnection robot={activeRobot} />

                    {/* Show wallet connect prompt if not connected */}
                    {!isWalletConnected && (
                      <>
                        <Divider />
                        <Box
                          p={6}
                          borderWidth={1}
                          borderRadius="lg"
                          bg="gray.50"
                          textAlign="center"
                        >
                          <VStack spacing={4}>
                            <Text fontSize="lg" fontWeight="medium">
                              Connect Wallet to Control Robot
                            </Text>
                            <Text color="gray.600">
                              Connect your wallet to purchase access and control the robot
                            </Text>
                            <WalletButton />
                          </VStack>
                        </Box>
                      </>
                    )}

                    {/* Show purchase/controls when wallet connected and robot online */}
                    {isWalletConnected && activeRobot.connectionStatus === 'online' && (
                      <>
                        <Divider />

                        {isSessionLoading ? (
                          <Box p={6} textAlign="center">
                            <Text color="gray.500">Checking session...</Text>
                          </Box>
                        ) : !hasActiveSession ? (
                          <PurchaseAccess
                            robotHost={activeRobot.config.motorIp}
                            robotName={activeRobot.config.name}
                          />
                        ) : (
                          <>
                            <CameraStream />

                            <Divider />

                            <MotorControls />
                          </>
                        )}
                      </>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            )}
          </>
        )}
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Robot</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <AddRobotForm onSuccess={onClose} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  )
}
