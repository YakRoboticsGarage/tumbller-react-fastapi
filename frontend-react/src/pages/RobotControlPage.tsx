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
  Spinner,
  useToast,
} from '@chakra-ui/react'
import { AddIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import { useEffect } from 'react'
import { AddRobotForm } from '../components/features/AddRobotForm'
import { CameraStream } from '../components/features/CameraStream'
import { MotorControls } from '../components/features/MotorControls'
import { RobotConnection } from '../components/features/RobotConnection'
import { RobotWalletDisplay } from '../components/features/RobotWalletDisplay'
import { RobotPayoutButton } from '../components/features/RobotPayoutButton'
import { FundPrivyWalletModal } from '../components/features/FundPrivyWalletModal'
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
  const {
    isOpen: isFundingOpen,
    onOpen: onFundingOpen,
    onClose: onFundingClose,
  } = useDisclosure()
  const [showRobotDetails, setShowRobotDetails] = useState(false)
  const [showWalletInfo, setShowWalletInfo] = useState(false)
  const [pendingPrivyWallet, setPendingPrivyWallet] = useState<string | null>(null)
  const toast = useToast()
  const robots = useRobotStore((state) => state.robots)
  const activeRobotId = useRobotStore((state) => state.activeRobotId)
  const setActiveRobot = useRobotStore((state) => state.setActiveRobot)
  const removeRobot = useRobotStore((state) => state.removeRobot)
  const syncFromBackend = useRobotStore((state) => state.syncFromBackend)
  const updateRobotWallet = useRobotStore((state) => state.updateRobotWallet)
  const switchWallet = useRobotStore((state) => state.switchWallet)
  const isLoading = useRobotStore((state) => state.isLoading)
  // Get active robot directly from store to ensure reactivity
  const activeRobot = useRobotStore((state) =>
    state.activeRobotId ? state.robots.get(state.activeRobotId) : undefined
  )

  const isAuthEnabled = useAuthEnabled()
  const { hasActiveSession, isLoading: isSessionLoading } = useSession()
  const { isConnected: isWalletConnected } = useWallet()

  // Sync robots from backend on first load
  useEffect(() => {
    void syncFromBackend()
  }, [syncFromBackend])

  const robotList = Array.from(robots.values())

  const handleRobotChange = (robotId: string) => {
    setActiveRobot(robotId || null)
  }

  const handleRemoveRobot = () => {
    if (activeRobotId) {
      void removeRobot(activeRobotId)
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

        {isLoading ? (
          <Card>
            <CardBody>
              <VStack spacing={4} py={8}>
                <Spinner size="lg" color="brand.500" />
                <Text color="gray.500">Loading robots...</Text>
              </VStack>
            </CardBody>
          </Card>
        ) : robotList.length === 0 ? (
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
                      <HStack justify="space-between" align="center" mb={2}>
                        <Heading size={{ base: "sm", md: "md" }}>
                          {activeRobot.config.name}
                        </Heading>
                        <HStack spacing={2}>
                          <Button
                            size="sm"
                            variant="ghost"
                            rightIcon={showRobotDetails ? <ChevronUpIcon /> : <ChevronDownIcon />}
                            onClick={() => setShowRobotDetails(!showRobotDetails)}
                          >
                            {showRobotDetails ? 'Hide' : 'Robot'} Details
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            colorScheme="green"
                            rightIcon={showWalletInfo ? <ChevronUpIcon /> : <ChevronDownIcon />}
                            onClick={() => setShowWalletInfo(!showWalletInfo)}
                          >
                            {showWalletInfo ? 'Hide' : 'Wallet'} Info
                          </Button>
                        </HStack>
                      </HStack>

                      {/* Robot Details Section */}
                      <Collapse in={showRobotDetails} animateOpacity>
                        <VStack
                          spacing={2}
                          align="flex-start"
                          fontSize={{ base: "xs", md: "sm" }}
                          color="gray.600"
                          mt={2}
                          p={3}
                          bg="gray.50"
                          borderRadius="md"
                        >
                          <Text>
                            <Text as="span" fontWeight="medium">Motor:</Text> {activeRobot.config.motorIp}
                            {activeRobot.config.motorMdns && ` (${activeRobot.config.motorMdns}.local)`}
                          </Text>
                          <Text>
                            <Text as="span" fontWeight="medium">Camera:</Text> {activeRobot.config.cameraIp}
                            {activeRobot.config.cameraMdns && ` (${activeRobot.config.cameraMdns}.local)`}
                          </Text>
                        </VStack>
                      </Collapse>

                      {/* Wallet Info Section */}
                      <Collapse in={showWalletInfo} animateOpacity>
                        <VStack
                          spacing={3}
                          align="flex-start"
                          fontSize={{ base: "xs", md: "sm" }}
                          mt={2}
                          p={3}
                          bg="green.50"
                          borderRadius="md"
                        >
                          <RobotWalletDisplay
                            walletAddress={activeRobot.config.walletAddress}
                            walletSource={activeRobot.config.walletSource}
                            robotId={activeRobot.config.id}
                            onWalletUpdate={(newAddress) => updateRobotWallet(activeRobot.config.id, newAddress)}
                          />

                          {/* Wallet switching options */}
                          <HStack spacing={2} width="100%" flexWrap="wrap">
                            {activeRobot.config.walletSource === 'user_provided' ? (
                              <Button
                                size="xs"
                                colorScheme="purple"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    // Switch/create the Privy wallet
                                    await switchWallet(activeRobot.config.id, 'privy_created')
                                    // Get the updated robot to find the new privy wallet address
                                    const updatedRobot = useRobotStore.getState().robots.get(activeRobot.config.id)
                                    if (updatedRobot?.config.privyWalletAddress) {
                                      // Open funding modal
                                      setPendingPrivyWallet(updatedRobot.config.privyWalletAddress)
                                      onFundingOpen()
                                    }
                                  } catch (err) {
                                    toast({
                                      title: 'Failed to create Privy wallet',
                                      description: err instanceof Error ? err.message : 'Unknown error',
                                      status: 'error',
                                      duration: 5000,
                                      isClosable: true,
                                    })
                                  }
                                }}
                              >
                                {activeRobot.config.privyWalletAddress ? 'Switch to Privy Wallet' : 'Create Privy Wallet'}
                              </Button>
                            ) : (
                              <>
                                {activeRobot.config.userWalletAddress && (
                                  <Button
                                    size="xs"
                                    colorScheme="blue"
                                    variant="outline"
                                    onClick={() => { void switchWallet(activeRobot.config.id, 'user_provided') }}
                                  >
                                    Switch to User Wallet
                                  </Button>
                                )}
                                {/* Fund wallet button for existing Privy wallets */}
                                <Button
                                  size="xs"
                                  colorScheme="orange"
                                  variant="outline"
                                  onClick={() => {
                                    setPendingPrivyWallet(activeRobot.config.privyWalletAddress ?? null)
                                    onFundingOpen()
                                  }}
                                >
                                  Fund Gas
                                </Button>
                              </>
                            )}
                          </HStack>

                          {/* Show both wallets if they exist */}
                          {activeRobot.config.userWalletAddress && activeRobot.config.privyWalletAddress && (
                            <VStack align="flex-start" spacing={1} fontSize="xs" color="gray.500" width="100%">
                              <Text>
                                <Text as="span" fontWeight="medium">User wallet:</Text>{' '}
                                <Text as="span" fontFamily="mono">
                                  {activeRobot.config.userWalletAddress.slice(0, 6)}...{activeRobot.config.userWalletAddress.slice(-4)}
                                </Text>
                                {activeRobot.config.walletSource === 'user_provided' && ' (active)'}
                              </Text>
                              <Text>
                                <Text as="span" fontWeight="medium">Privy wallet:</Text>{' '}
                                <Text as="span" fontFamily="mono">
                                  {activeRobot.config.privyWalletAddress.slice(0, 6)}...{activeRobot.config.privyWalletAddress.slice(-4)}
                                </Text>
                                {activeRobot.config.walletSource === 'privy_created' && ' (active)'}
                              </Text>
                            </VStack>
                          )}

                          {activeRobot.config.ownerWallet && (
                            <HStack spacing={2} width="100%" justify="space-between">
                              <Text fontSize="sm" color="gray.600">
                                <Text as="span" fontWeight="medium">Owner:</Text>{' '}
                                <Text as="span" fontFamily="mono">{activeRobot.config.ownerWallet}</Text>
                              </Text>
                              {activeRobot.config.walletSource === 'privy_created' ? (
                                <RobotPayoutButton
                                  robotId={activeRobot.config.id}
                                  robotName={activeRobot.config.name}
                                  ownerWallet={activeRobot.config.ownerWallet}
                                />
                              ) : (
                                <Text fontSize="xs" color="gray.500" fontStyle="italic">
                                  Switch to Privy wallet to collect earnings
                                </Text>
                              )}
                            </HStack>
                          )}
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
                            robotWallet={activeRobot.config.walletAddress}
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

      {/* Fund Privy Wallet Modal */}
      {pendingPrivyWallet && activeRobot && (
        <FundPrivyWalletModal
          isOpen={isFundingOpen}
          onClose={() => {
            onFundingClose()
            setPendingPrivyWallet(null)
          }}
          privyWalletAddress={pendingPrivyWallet}
          robotName={activeRobot.config.name}
          onFundingComplete={() => {
            toast({
              title: 'Wallet funded',
              description: 'ETH sent to robot wallet for gas fees',
              status: 'success',
              duration: 5000,
              isClosable: true,
            })
          }}
        />
      )}
    </Container>
  )
}
