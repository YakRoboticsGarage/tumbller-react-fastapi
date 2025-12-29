import { useState, useEffect, useCallback } from 'react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Input,
  InputGroup,
  InputLeftAddon,
  InputRightAddon,
  Alert,
  AlertIcon,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Link,
} from '@chakra-ui/react'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import { parseEther } from 'ethers'
import { useWallet } from '../../hooks/useWallet'
import { robotManagementApi } from '../../services/robotManagementApi'

interface FundPrivyWalletModalProps {
  isOpen: boolean
  onClose: () => void
  privyWalletAddress: string
  robotName: string
  onFundingComplete: () => void
}

export function FundPrivyWalletModal({
  isOpen,
  onClose,
  privyWalletAddress,
  robotName,
  onFundingComplete,
}: FundPrivyWalletModalProps) {
  const { getSigner, address: userAddress } = useWallet()
  const [ethAmount, setEthAmount] = useState('0.0003')
  const [ethPriceUsd, setEthPriceUsd] = useState<number | null>(null)
  const [isLoadingPrice, setIsLoadingPrice] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch ETH price on mount
  const fetchEthPrice = useCallback(async () => {
    setIsLoadingPrice(true)
    try {
      const info = await robotManagementApi.getGasFundingInfo(1.0)
      setEthPriceUsd(info.eth_price_usd)
    } catch (err) {
      console.error('Failed to fetch ETH price:', err)
      setEthPriceUsd(3000) // Fallback
    } finally {
      setIsLoadingPrice(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      void fetchEthPrice()
      setTxHash(null)
      setError(null)
    }
  }, [isOpen, fetchEthPrice])

  // Calculate USD value
  const usdValue = ethPriceUsd && ethAmount
    ? (parseFloat(ethAmount) * ethPriceUsd).toFixed(2)
    : '—'

  const handleFund = async () => {
    if (!ethAmount || parseFloat(ethAmount) <= 0) {
      setError('Please enter a valid ETH amount')
      return
    }

    setIsSending(true)
    setError(null)
    setTxHash(null)

    try {
      const signer = await getSigner()
      if (!signer) {
        throw new Error('Wallet not connected')
      }

      // Convert ETH amount to wei and send transaction
      const weiAmount = parseEther(ethAmount)

      const tx = await signer.sendTransaction({
        to: privyWalletAddress,
        value: weiAmount,
      })

      setTxHash(tx.hash)

      // Wait for confirmation
      await tx.wait()

      // Notify parent that funding is complete
      onFundingComplete()
    } catch (err) {
      console.error('Funding failed:', err)
      setError(err instanceof Error ? err.message : 'Transaction failed')
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    if (!isSending) {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Fund Robot Wallet for Gas</ModalHeader>
        <ModalCloseButton isDisabled={isSending} />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text>
              Send ETH from your wallet to <strong>{robotName}</strong>&apos;s Privy wallet
              to cover gas fees for collecting earnings.
            </Text>

            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <Text fontSize="sm">
                The Privy wallet needs ETH to pay gas fees when transferring USDC earnings
                to your owner wallet.
              </Text>
            </Alert>

            <Divider />

            <HStack spacing={4} justify="space-between">
              <Stat size="sm">
                <StatLabel>From</StatLabel>
                <StatNumber fontSize="sm" fontFamily="mono">
                  {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : '—'}
                </StatNumber>
                <StatHelpText>Your wallet</StatHelpText>
              </Stat>
              <Stat size="sm">
                <StatLabel>To</StatLabel>
                <StatNumber fontSize="sm" fontFamily="mono">
                  {privyWalletAddress.slice(0, 6)}...{privyWalletAddress.slice(-4)}
                </StatNumber>
                <StatHelpText>Robot wallet</StatHelpText>
              </Stat>
            </HStack>

            <Divider />

            <VStack align="stretch" spacing={2}>
              <Text fontWeight="medium">Amount to send:</Text>
              <InputGroup>
                <InputLeftAddon>ETH</InputLeftAddon>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={ethAmount}
                  onChange={(e) => setEthAmount(e.target.value)}
                  placeholder="0.001"
                  isDisabled={isSending}
                />
                <InputRightAddon minW="80px">
                  {isLoadingPrice ? (
                    <Spinner size="xs" />
                  ) : (
                    `~$${usdValue}`
                  )}
                </InputRightAddon>
              </InputGroup>
              <Text fontSize="xs" color="gray.500">
                Suggested: 0.0003 ETH (~$1) is usually enough for several transactions
              </Text>
            </VStack>

            {txHash && (
              <Alert status="success" borderRadius="md">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="medium">Transaction sent!</Text>
                  <Link
                    href={`https://sepolia.basescan.org/tx/${txHash}`}
                    isExternal
                    color="blue.500"
                    fontSize="sm"
                  >
                    View on BaseScan <ExternalLinkIcon mx="2px" />
                  </Link>
                </VStack>
              </Alert>
            )}

            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">{error}</Text>
              </Alert>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose} isDisabled={isSending}>
            {txHash ? 'Close' : 'Cancel'}
          </Button>
          {!txHash && (
            <Button
              colorScheme="green"
              onClick={() => {
                void handleFund()
              }}
              isLoading={isSending}
              loadingText="Sending..."
              isDisabled={!ethAmount || parseFloat(ethAmount) <= 0}
            >
              Send ETH
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
