import { useState } from 'react'
import {
  Box,
  Button,
  Collapse,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Input,
  Radio,
  RadioGroup,
  Stack,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRobotStore } from '../../stores/robotStore'

// IP address validation
const ipAddressRegex = /^(\d{1,3}\.){3}\d{1,3}$/
// Ethereum address validation
const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/

// Validates: 0x address, ENS name (*.eth), or Base name (*.base.eth)
const isValidWalletOrName = (value: string): boolean => {
  const trimmed = value.trim()
  // Plain address
  if (trimmed.startsWith('0x')) {
    return ethAddressRegex.test(trimmed)
  }
  // ENS/Base name (contains dot)
  if (trimmed.includes('.')) {
    return trimmed.length >= 3 && trimmed.length <= 253
  }
  return false
}

const robotFormSchema = z
  .object({
    name: z.string().min(1, 'Robot name is required').max(100),
    motorIp: z
      .string()
      .min(1, 'Motor controller IP is required')
      .regex(ipAddressRegex, 'Must be a valid IP address (e.g., 192.168.1.100)'),
    cameraIp: z
      .string()
      .min(1, 'Camera IP is required')
      .regex(ipAddressRegex, 'Must be a valid IP address (e.g., 192.168.1.101)'),
    walletOption: z.enum(['create', 'existing']),
    walletAddress: z.string().optional(),
    ownerWallet: z.string().optional(),
  })
  .refine(
    (data) => {
      // If user chose existing wallet, address is required and must be valid
      if (data.walletOption === 'existing') {
        if (!data.walletAddress) return false
        return ethAddressRegex.test(data.walletAddress)
      }
      return true
    },
    {
      message: 'Valid Ethereum address required (0x...)',
      path: ['walletAddress'],
    }
  )
  .refine(
    (data) => {
      // Owner wallet is optional but must be valid if provided
      if (data.ownerWallet && data.ownerWallet.trim()) {
        return isValidWalletOrName(data.ownerWallet)
      }
      return true
    },
    {
      message: 'Enter a valid address (0x...) or name (vitalik.eth, name.base.eth)',
      path: ['ownerWallet'],
    }
  )

type RobotFormData = z.infer<typeof robotFormSchema>

interface AddRobotFormProps {
  onSuccess?: () => void
}

export function AddRobotForm({ onSuccess }: AddRobotFormProps) {
  const addRobot = useRobotStore((state) => state.addRobot)
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<RobotFormData>({
    resolver: zodResolver(robotFormSchema),
    defaultValues: {
      walletOption: 'create',
    },
  })

  const walletOption = watch('walletOption')

  const onSubmit = async (data: RobotFormData) => {
    setIsSubmitting(true)
    try {
      const config = await addRobot({
        name: data.name,
        motorIp: data.motorIp,
        cameraIp: data.cameraIp,
        walletAddress: data.walletOption === 'existing' ? data.walletAddress : undefined,
        ownerWallet: data.ownerWallet?.trim() || undefined,
      })

      toast({
        title: 'Robot added',
        description:
          data.walletOption === 'create'
            ? `${config.name} has been added with a new Privy wallet`
            : `${config.name} has been added with the provided wallet`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      })

      reset()
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Failed to add robot',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e)
      }}
    >
      <VStack spacing={4} align="stretch">
        <FormControl isInvalid={!!errors.name}>
          <FormLabel>Robot Name</FormLabel>
          <Input {...register('name')} placeholder="My Tumbller Robot" />
          <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.motorIp}>
          <FormLabel>Motor Controller IP</FormLabel>
          <Input {...register('motorIp')} placeholder="192.168.1.100" />
          <FormErrorMessage>{errors.motorIp?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.cameraIp}>
          <FormLabel>Camera IP</FormLabel>
          <Input {...register('cameraIp')} placeholder="192.168.1.101" />
          <FormErrorMessage>{errors.cameraIp?.message}</FormErrorMessage>
        </FormControl>

        {/* Wallet Option */}
        <FormControl>
          <FormLabel>Robot Wallet</FormLabel>
          <RadioGroup defaultValue="create">
            <Stack spacing={3}>
              <Radio {...register('walletOption')} value="create">
                <Box>
                  <Text fontWeight="medium">Create a new wallet</Text>
                  <Text fontSize="sm" color="gray.500">
                    A secure wallet will be created for this robot
                  </Text>
                </Box>
              </Radio>

              <Radio {...register('walletOption')} value="existing">
                <Box>
                  <Text fontWeight="medium">Robot already has a wallet</Text>
                  <Text fontSize="sm" color="gray.500">
                    Enter the existing wallet address
                  </Text>
                </Box>
              </Radio>
            </Stack>
          </RadioGroup>
        </FormControl>

        {/* Conditional wallet address input */}
        <Collapse in={walletOption === 'existing'} animateOpacity>
          <FormControl isInvalid={!!errors.walletAddress}>
            <FormLabel>Wallet Address</FormLabel>
            <Input {...register('walletAddress')} placeholder="0x..." fontFamily="mono" />
            <FormErrorMessage>{errors.walletAddress?.message}</FormErrorMessage>
          </FormControl>
        </Collapse>

        {/* Owner Wallet (optional) */}
        <FormControl isInvalid={!!errors.ownerWallet}>
          <FormLabel>
            Owner Wallet{' '}
            <Text as="span" fontSize="sm" color="gray.500" fontWeight="normal">
              (optional)
            </Text>
          </FormLabel>
          <Input
            {...register('ownerWallet')}
            placeholder="0x..., vitalik.eth, or name.base.eth"
            fontFamily="mono"
          />
          <FormErrorMessage>{errors.ownerWallet?.message}</FormErrorMessage>
          <FormHelperText>Address, ENS name, or Base name to receive robot earnings</FormHelperText>
        </FormControl>

        <Button type="submit" colorScheme="brand" isLoading={isSubmitting} loadingText="Adding...">
          Add Robot
        </Button>
      </VStack>
    </form>
  )
}
