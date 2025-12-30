import { useState } from 'react'
import {
  Badge,
  HStack,
  IconButton,
  Text,
  Tooltip,
  useClipboard,
  Input,
  useToast,
} from '@chakra-ui/react'
import { CheckIcon, CopyIcon, EditIcon, CloseIcon } from '@chakra-ui/icons'
import type { WalletSource } from '../../types'

interface RobotWalletDisplayProps {
  walletAddress: string
  walletSource: WalletSource
  robotId?: string
  showFullAddress?: boolean
  size?: 'sm' | 'md'
  onWalletUpdate?: (newAddress: string) => Promise<void>
}

export function RobotWalletDisplay({
  walletAddress,
  walletSource,
  robotId,
  showFullAddress = false,
  size = 'sm',
  onWalletUpdate,
}: RobotWalletDisplayProps) {
  const { hasCopied, onCopy } = useClipboard(walletAddress)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(walletAddress)
  const [isSaving, setIsSaving] = useState(false)
  const toast = useToast()

  const canEdit = walletSource === 'user_provided' && onWalletUpdate

  const handleSave = async () => {
    if (!onWalletUpdate || editValue === walletAddress) {
      setIsEditing(false)
      return
    }

    // Basic validation
    if (!editValue.startsWith('0x') || editValue.length !== 42) {
      toast({
        title: 'Invalid address',
        description: 'Please enter a valid Ethereum address (0x...)',
        status: 'error',
        duration: 3000,
      })
      return
    }

    setIsSaving(true)
    try {
      await onWalletUpdate(editValue)
      setIsEditing(false)
      toast({
        title: 'Wallet updated',
        status: 'success',
        duration: 2000,
      })
    } catch (error) {
      toast({
        title: 'Failed to update wallet',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(walletAddress)
    setIsEditing(false)
  }

  // Format: 0x1234...5678 or full address
  const displayAddress = showFullAddress
    ? walletAddress
    : `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`

  const fontSize = size === 'sm' ? 'md' : 'lg'
  const iconSize = size === 'sm' ? 'sm' : 'md'

  if (isEditing) {
    return (
      <HStack spacing={2} align="center" width="100%">
        <Text fontSize={fontSize} color="gray.500">
          Wallet:
        </Text>
        <Input
          size="sm"
          fontFamily="mono"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder="0x..."
          width="auto"
          flex={1}
          isDisabled={isSaving}
        />
        <Tooltip label="Save">
          <IconButton
            aria-label="Save wallet address"
            icon={<CheckIcon />}
            size={iconSize}
            colorScheme="green"
            onClick={() => { void handleSave() }}
            isLoading={isSaving}
          />
        </Tooltip>
        <Tooltip label="Cancel">
          <IconButton
            aria-label="Cancel edit"
            icon={<CloseIcon />}
            size={iconSize}
            variant="ghost"
            onClick={handleCancel}
            isDisabled={isSaving}
          />
        </Tooltip>
      </HStack>
    )
  }

  return (
    <HStack spacing={2} align="center">
      <Text fontSize={fontSize} color="gray.500">
        Wallet:
      </Text>
      <Tooltip label={showFullAddress ? 'Click to copy' : walletAddress} placement="top">
        <Text
          fontFamily="mono"
          fontSize={fontSize}
          cursor="pointer"
          onClick={onCopy}
          _hover={{ color: 'brand.500' }}
        >
          {displayAddress}
        </Text>
      </Tooltip>
      <Tooltip label={hasCopied ? 'Copied!' : 'Copy address'}>
        <IconButton
          aria-label="Copy wallet address"
          icon={hasCopied ? <CheckIcon /> : <CopyIcon />}
          size={iconSize}
          variant="ghost"
          onClick={onCopy}
          colorScheme={hasCopied ? 'green' : 'gray'}
        />
      </Tooltip>
      {canEdit && (
        <Tooltip label="Edit wallet address">
          <IconButton
            aria-label="Edit wallet address"
            icon={<EditIcon />}
            size={iconSize}
            variant="ghost"
            onClick={() => setIsEditing(true)}
          />
        </Tooltip>
      )}
      <Badge
        colorScheme={walletSource === 'privy_created' ? 'purple' : 'blue'}
        fontSize="sm"
      >
        {walletSource === 'privy_created' ? 'Privy' : 'User'}
      </Badge>
    </HStack>
  )
}
