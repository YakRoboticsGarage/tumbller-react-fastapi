import { Button, Grid, VStack, Text, useToast } from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { ArrowUpIcon, ArrowDownIcon, ArrowBackIcon, ArrowForwardIcon } from '@chakra-ui/icons'
import { robotApi } from '../../services/robotApi'
import { useWallet } from '../../hooks/useWallet'
import type { MotorCommand } from '../../types'

export function MotorControls() {
  const toast = useToast()
  const { address } = useWallet()

  const motorMutation = useMutation({
    mutationFn: (command: MotorCommand) => {
      if (!address) {
        throw new Error('Wallet not connected')
      }
      return robotApi.sendMotorCommand(command, address)
    },
    onError: (error: Error) => {
      toast({
        title: 'Motor command failed',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    },
  })

  const handleCommand = (command: MotorCommand) => {
    motorMutation.mutate(command)
  }

  return (
    <VStack spacing={4}>
      <Text fontSize={{ base: "md", md: "lg" }} fontWeight="semibold">
        Motor Controls
      </Text>

      <Grid templateColumns="repeat(3, 1fr)" gap={2} maxW={{ base: "280px", md: "340px" }} w="full">
        {/* Top row - Forward */}
        <div />
        <Button
          size={{ base: "md", md: "lg" }}
          colorScheme="brand"
          onClick={() => { handleCommand('forward'); }}
          isLoading={motorMutation.isPending && motorMutation.variables === 'forward'}
          leftIcon={<ArrowUpIcon />}
        >
          <Text display={{ base: "none", sm: "inline" }}>Forward</Text>
        </Button>
        <div />

        {/* Middle row - Left and Right */}
        <Button
          size={{ base: "md", md: "lg" }}
          colorScheme="brand"
          onClick={() => { handleCommand('left'); }}
          isLoading={motorMutation.isPending && motorMutation.variables === 'left'}
          leftIcon={<ArrowBackIcon />}
        >
          <Text display={{ base: "none", sm: "inline" }}>Left</Text>
        </Button>
        <div />
        <Button
          size={{ base: "md", md: "lg" }}
          colorScheme="brand"
          onClick={() => { handleCommand('right'); }}
          isLoading={motorMutation.isPending && motorMutation.variables === 'right'}
          leftIcon={<ArrowForwardIcon />}
        >
          <Text display={{ base: "none", sm: "inline" }}>Right</Text>
        </Button>

        {/* Bottom row - Back */}
        <div />
        <Button
          size={{ base: "md", md: "lg" }}
          colorScheme="brand"
          onClick={() => { handleCommand('back'); }}
          isLoading={motorMutation.isPending && motorMutation.variables === 'back'}
          leftIcon={<ArrowDownIcon />}
        >
          <Text display={{ base: "none", sm: "inline" }}>Back</Text>
        </Button>
        <div />
      </Grid>

      {motorMutation.isPending && (
        <Text fontSize="sm" color="brown.600">
          Sending command...
        </Text>
      )}
    </VStack>
  )
}
