import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  VStack,
  useToast,
} from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRobotStore } from '../../stores/robotStore'
import type { RobotConfig } from '../../types'
import { generateUUID } from '../../utils/uuid'

// IP address validation
const ipAddressRegex = /^(\d{1,3}\.){3}\d{1,3}$/
// mDNS hostname validation (without .local suffix)
const mdnsNameRegex = /^[a-zA-Z0-9-]+$/

const robotFormSchema = z.object({
  name: z.string().min(1, 'Robot name is required'),
  motorIp: z
    .string()
    .min(1, 'Motor controller IP is required')
    .regex(
      ipAddressRegex,
      'Must be a valid IP address (e.g., 192.168.1.100)'
    ),
  cameraIp: z
    .string()
    .min(1, 'Camera IP is required')
    .regex(
      ipAddressRegex,
      'Must be a valid IP address (e.g., 192.168.1.101)'
    ),
  motorMdns: z
    .string()
    .regex(mdnsNameRegex, 'Must be a valid mDNS name (e.g., tumbller-01)')
    .optional()
    .or(z.literal('')),
  cameraMdns: z
    .string()
    .regex(mdnsNameRegex, 'Must be a valid mDNS name (e.g., tumbller-01-cam)')
    .optional()
    .or(z.literal('')),
})

type RobotFormData = z.infer<typeof robotFormSchema>

interface AddRobotFormProps {
  onSuccess?: () => void
}

export function AddRobotForm({ onSuccess }: AddRobotFormProps) {
  const addRobot = useRobotStore((state) => state.addRobot)
  const toast = useToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RobotFormData>({
    resolver: zodResolver(robotFormSchema),
  })

  const onSubmit = (data: RobotFormData) => {
    const config: RobotConfig = {
      id: generateUUID(),
      name: data.name,
      motorIp: data.motorIp,
      cameraIp: data.cameraIp,
      motorMdns: data.motorMdns || undefined,
      cameraMdns: data.cameraMdns || undefined,
      createdAt: new Date(),
    }

    addRobot(config)

    toast({
      title: 'Robot added',
      description: `${config.name} has been added successfully`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    })

    reset()
    onSuccess?.()
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }}>
      <VStack spacing={4} align="stretch">
        <FormControl isInvalid={!!errors.name}>
          <FormLabel>Robot Name</FormLabel>
          <Input {...register('name')} placeholder="My Tumbller Robot" />
          <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.motorIp}>
          <FormLabel>Motor Controller IP</FormLabel>
          <Input
            {...register('motorIp')}
            placeholder="192.168.1.100"
          />
          <FormErrorMessage>{errors.motorIp?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.motorMdns}>
          <FormLabel>Motor mDNS Name (optional)</FormLabel>
          <Input
            {...register('motorMdns')}
            placeholder="tumbller-01"
          />
          <FormErrorMessage>{errors.motorMdns?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.cameraIp}>
          <FormLabel>Camera IP</FormLabel>
          <Input
            {...register('cameraIp')}
            placeholder="192.168.1.101"
          />
          <FormErrorMessage>{errors.cameraIp?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.cameraMdns}>
          <FormLabel>Camera mDNS Name (optional)</FormLabel>
          <Input
            {...register('cameraMdns')}
            placeholder="tumbller-01-cam"
          />
          <FormErrorMessage>{errors.cameraMdns?.message}</FormErrorMessage>
        </FormControl>

        <Button type="submit" colorScheme="brand" isLoading={isSubmitting}>
          Add Robot
        </Button>
      </VStack>
    </form>
  )
}
