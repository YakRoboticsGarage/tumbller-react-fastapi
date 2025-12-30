import { useState, useEffect, useCallback } from 'react'
import {
  Button,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
  useDisclosure,
  useToast,
  Alert,
  AlertIcon,
  HStack,
  Stat,
  StatLabel,
  StatNumber,
  Badge,
  Spinner,
  IconButton,
  Tooltip,
} from '@chakra-ui/react'
import { ExternalLinkIcon, RepeatIcon } from '@chakra-ui/icons'
import { robotManagementApi, type WalletBalanceResponse } from '../../services/robotManagementApi'

interface RobotPayoutButtonProps {
  robotId: string
  robotName: string
  ownerWallet: string
}

// Format USDC smallest units to readable format
function formatUsdc(amount: string): string {
  const usdc = Number(amount) / 1e6  // USDC has 6 decimals
  if (usdc === 0) return '$0.00'
  return `$${usdc.toFixed(2)}`
}

export function RobotPayoutButton({ robotId, robotName, ownerWallet }: RobotPayoutButtonProps) {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [balance, setBalance] = useState<WalletBalanceResponse | null>(null)
  const [result, setResult] = useState<{
    status: string
    txHash: string | null
    amount: string
  } | null>(null)
  const toast = useToast()

  const fetchBalance = useCallback(async () => {
    setIsLoadingBalance(true)
    try {
      const balanceData = await robotManagementApi.getWalletBalance(robotId)
      setBalance(balanceData)
    } catch (error) {
      console.error('Failed to fetch balance:', error)
    } finally {
      setIsLoadingBalance(false)
    }
  }, [robotId])

  // Fetch balance on mount and when robotId changes
  useEffect(() => {
    void fetchBalance()
  }, [fetchBalance])

  const handlePayout = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await robotManagementApi.payoutToOwner(robotId)

      setResult({
        status: response.status,
        txHash: response.transaction_hash,
        amount: response.amount_usdc,
      })

      switch (response.status) {
        case 'success':
          toast({
            title: 'USDC transfer successful',
            description: `Transferred ${formatUsdc(response.amount_usdc)} USDC to owner wallet`,
            status: 'success',
            duration: 5000,
            isClosable: true,
          })
          // Refresh balance after successful payout
          void fetchBalance()
          break
        case 'no_funds':
          toast({
            title: 'No USDC to collect',
            description: 'Robot wallet has no USDC to transfer',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          })
          break
        case 'insufficient_funds':
          toast({
            title: 'Insufficient ETH for gas',
            description: 'Robot wallet needs ETH to pay gas fees. Use "Fund Gas" button.',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          })
          break
      }
    } catch (error) {
      toast({
        title: 'Transfer failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setResult(null)
    onClose()
  }

  return (
    <>
      <HStack spacing={2}>
        {/* Balance Display - both USDC and ETH */}
        {isLoadingBalance ? (
          <Spinner size="sm" />
        ) : balance ? (
          <HStack spacing={2}>
            <Badge colorScheme="green" fontSize="sm" px={3} py={1}>
              ${balance.usdc_balance} USDC
            </Badge>
            <Badge colorScheme="blue" fontSize="sm" px={3} py={1}>
              {balance.eth_balance} ETH
            </Badge>
            <Tooltip label="Refresh balance">
              <IconButton
                aria-label="Refresh balance"
                icon={<RepeatIcon />}
                size="sm"
                variant="ghost"
                onClick={() => {
                  void fetchBalance()
                }}
                isLoading={isLoadingBalance}
              />
            </Tooltip>
          </HStack>
        ) : null}

        <Button size="sm" colorScheme="green" variant="outline" onClick={onOpen}>
          Collect USDC
        </Button>
      </HStack>

      <Modal isOpen={isOpen} onClose={handleClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Collect USDC Earnings</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text>
                Transfer USDC earnings from <strong>{robotName}</strong>&apos;s wallet to the
                owner wallet.
              </Text>

              <HStack spacing={4} flexWrap="wrap">
                <Stat size="sm">
                  <StatLabel>Owner Wallet</StatLabel>
                  <StatNumber fontSize="sm" fontFamily="mono">
                    {ownerWallet.length > 20
                      ? `${ownerWallet.slice(0, 10)}...${ownerWallet.slice(-8)}`
                      : ownerWallet}
                  </StatNumber>
                </Stat>
                {balance && (
                  <>
                    <Stat size="sm">
                      <StatLabel>USDC Balance</StatLabel>
                      <StatNumber fontSize="sm" color="green.600">
                        ${balance.usdc_balance}
                      </StatNumber>
                    </Stat>
                    <Stat size="sm">
                      <StatLabel>ETH Balance</StatLabel>
                      <StatNumber fontSize="sm" color="blue.600">
                        {balance.eth_balance}
                      </StatNumber>
                    </Stat>
                  </>
                )}
              </HStack>

              {result?.status === 'success' && result.txHash && (
                <Alert status="success" borderRadius="md" flexDirection="column" alignItems="flex-start">
                  <HStack mb={2}>
                    <AlertIcon />
                    <Text fontWeight="medium">USDC transfer complete!</Text>
                  </HStack>
                  <VStack align="start" spacing={2} pl={8} width="100%">
                    <Text fontSize="sm">
                      <Text as="span" fontWeight="medium">Amount:</Text> {formatUsdc(result.amount)} USDC
                    </Text>
                    <HStack fontSize="sm" width="100%">
                      <Text fontWeight="medium">Tx:</Text>
                      <Text fontFamily="mono" color="gray.600">
                        {result.txHash.slice(0, 10)}...{result.txHash.slice(-8)}
                      </Text>
                    </HStack>
                    <Link
                      href={`https://sepolia.basescan.org/tx/${result.txHash}`}
                      isExternal
                      color="blue.500"
                      fontSize="sm"
                      fontWeight="medium"
                    >
                      View on BaseScan <ExternalLinkIcon mx="2px" />
                    </Link>
                  </VStack>
                </Alert>
              )}

              {result?.status === 'no_funds' && (
                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  <Text>No USDC available in robot wallet.</Text>
                </Alert>
              )}

              {result?.status === 'insufficient_funds' && (
                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  <Text>Robot wallet needs ETH for gas fees. Use &quot;Fund Gas&quot; button first.</Text>
                </Alert>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleClose}>
              Close
            </Button>
            <Button
              colorScheme="green"
              onClick={() => {
                void handlePayout()
              }}
              isLoading={isLoading}
              loadingText="Transferring USDC..."
              isDisabled={result?.status === 'success'}
            >
              Transfer USDC
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
