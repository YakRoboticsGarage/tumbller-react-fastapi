/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useRobotStore } from '../robotStore'
import { mockRobotResponse } from '../../test/mocks'
import { robotManagementApi } from '../../services/robotManagementApi'

// Mock the robotManagementApi module
vi.mock('../../services/robotManagementApi', () => ({
  robotManagementApi: {
    createRobot: vi.fn(),
    listRobots: vi.fn(),
    getRobot: vi.fn(),
    updateRobot: vi.fn(),
    deleteRobot: vi.fn(),
    switchWallet: vi.fn(),
    syncWalletToRobot: vi.fn(),
    payoutToOwner: vi.fn(),
    getWalletBalance: vi.fn(),
    getGasFundingInfo: vi.fn(),
  },
}))

const mockedApi = vi.mocked(robotManagementApi)

describe('robotStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useRobotStore.setState({
      robots: new Map(),
      activeRobotId: null,
      initialized: false,
      isLoading: false,
      syncError: null,
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('addRobot', () => {
    it('adds a new robot via API and updates store', async () => {
      mockedApi.createRobot.mockResolvedValue(mockRobotResponse)

      const input = {
        name: 'Test Robot',
        motorIp: '192.168.1.100',
        cameraIp: '192.168.1.101',
      }

      const result = await useRobotStore.getState().addRobot(input)

      expect(mockedApi.createRobot).toHaveBeenCalledWith({
        name: 'Test Robot',
        motor_ip: '192.168.1.100',
        camera_ip: '192.168.1.101',
        wallet_address: undefined,
        owner_wallet: undefined,
      })

      const robots = useRobotStore.getState().robots
      expect(robots.has(mockRobotResponse.id)).toBe(true)
      expect(result.name).toBe('Test Robot')
    })

    it('sets newly added robot as active', async () => {
      mockedApi.createRobot.mockResolvedValue(mockRobotResponse)

      const input = {
        name: 'Test Robot',
        motorIp: '192.168.1.100',
        cameraIp: '192.168.1.101',
      }

      await useRobotStore.getState().addRobot(input)

      expect(useRobotStore.getState().activeRobotId).toBe(mockRobotResponse.id)
    })

    it('sets initial connection status to disconnected', async () => {
      mockedApi.createRobot.mockResolvedValue(mockRobotResponse)

      const input = {
        name: 'Test Robot',
        motorIp: '192.168.1.100',
        cameraIp: '192.168.1.101',
      }

      await useRobotStore.getState().addRobot(input)

      const robot = useRobotStore.getState().robots.get(mockRobotResponse.id)
      expect(robot?.connectionStatus).toBe('disconnected')
      expect(robot?.cameraStatus).toBe('disconnected')
    })
  })

  describe('removeRobot', () => {
    it('removes a robot via API and updates store', async () => {
      // First add a robot
      mockedApi.createRobot.mockResolvedValue(mockRobotResponse)
      mockedApi.deleteRobot.mockResolvedValue(undefined)

      await useRobotStore.getState().addRobot({
        name: 'Test Robot',
        motorIp: '192.168.1.100',
        cameraIp: '192.168.1.101',
      })
      expect(useRobotStore.getState().robots.has(mockRobotResponse.id)).toBe(true)

      await useRobotStore.getState().removeRobot(mockRobotResponse.id)

      expect(mockedApi.deleteRobot).toHaveBeenCalledWith(mockRobotResponse.id)
      expect(useRobotStore.getState().robots.has(mockRobotResponse.id)).toBe(false)
    })

    it('clears activeRobotId if removed robot was active', async () => {
      mockedApi.createRobot.mockResolvedValue(mockRobotResponse)
      mockedApi.deleteRobot.mockResolvedValue(undefined)

      await useRobotStore.getState().addRobot({
        name: 'Test Robot',
        motorIp: '192.168.1.100',
        cameraIp: '192.168.1.101',
      })
      expect(useRobotStore.getState().activeRobotId).toBe(mockRobotResponse.id)

      await useRobotStore.getState().removeRobot(mockRobotResponse.id)

      expect(useRobotStore.getState().activeRobotId).toBeNull()
    })
  })

  describe('setActiveRobot', () => {
    it('sets the active robot id', async () => {
      mockedApi.createRobot.mockResolvedValue(mockRobotResponse)

      await useRobotStore.getState().addRobot({
        name: 'Test Robot',
        motorIp: '192.168.1.100',
        cameraIp: '192.168.1.101',
      })

      // Clear active robot first
      useRobotStore.getState().setActiveRobot(null)
      expect(useRobotStore.getState().activeRobotId).toBeNull()

      // Set it again
      useRobotStore.getState().setActiveRobot(mockRobotResponse.id)
      expect(useRobotStore.getState().activeRobotId).toBe(mockRobotResponse.id)
    })

    it('can set active robot to null', async () => {
      mockedApi.createRobot.mockResolvedValue(mockRobotResponse)

      await useRobotStore.getState().addRobot({
        name: 'Test Robot',
        motorIp: '192.168.1.100',
        cameraIp: '192.168.1.101',
      })

      useRobotStore.getState().setActiveRobot(null)

      expect(useRobotStore.getState().activeRobotId).toBeNull()
    })
  })

  describe('updateRobotStatus', () => {
    it('updates robot connection status', async () => {
      mockedApi.createRobot.mockResolvedValue(mockRobotResponse)

      await useRobotStore.getState().addRobot({
        name: 'Test Robot',
        motorIp: '192.168.1.100',
        cameraIp: '192.168.1.101',
      })

      useRobotStore.getState().updateRobotStatus(mockRobotResponse.id, { connectionStatus: 'online' })

      const robot = useRobotStore.getState().robots.get(mockRobotResponse.id)
      expect(robot?.connectionStatus).toBe('online')
    })

    it('updates robot camera status', async () => {
      mockedApi.createRobot.mockResolvedValue(mockRobotResponse)

      await useRobotStore.getState().addRobot({
        name: 'Test Robot',
        motorIp: '192.168.1.100',
        cameraIp: '192.168.1.101',
      })

      useRobotStore.getState().updateRobotStatus(mockRobotResponse.id, { cameraStatus: 'online' })

      const robot = useRobotStore.getState().robots.get(mockRobotResponse.id)
      expect(robot?.cameraStatus).toBe('online')
    })

    it('updates multiple status fields at once', async () => {
      mockedApi.createRobot.mockResolvedValue(mockRobotResponse)

      await useRobotStore.getState().addRobot({
        name: 'Test Robot',
        motorIp: '192.168.1.100',
        cameraIp: '192.168.1.101',
      })

      useRobotStore.getState().updateRobotStatus(mockRobotResponse.id, {
        connectionStatus: 'online',
        cameraStatus: 'online',
      })

      const robot = useRobotStore.getState().robots.get(mockRobotResponse.id)
      expect(robot?.connectionStatus).toBe('online')
      expect(robot?.cameraStatus).toBe('online')
    })

    it('does nothing if robot does not exist', () => {
      useRobotStore.getState().updateRobotStatus('non-existent', { connectionStatus: 'online' })
      expect(useRobotStore.getState().robots.size).toBe(0)
    })
  })

  describe('syncFromBackend', () => {
    it('fetches robots from backend and updates store', async () => {
      const listResponse = { robots: [mockRobotResponse], total: 1 }
      mockedApi.listRobots.mockResolvedValue(listResponse)

      await useRobotStore.getState().syncFromBackend()

      expect(mockedApi.listRobots).toHaveBeenCalled()
      expect(useRobotStore.getState().robots.size).toBe(1)
      expect(useRobotStore.getState().initialized).toBe(true)
      expect(useRobotStore.getState().isLoading).toBe(false)
    })

    it('sets first robot as active if none selected', async () => {
      const listResponse = { robots: [mockRobotResponse], total: 1 }
      mockedApi.listRobots.mockResolvedValue(listResponse)

      await useRobotStore.getState().syncFromBackend()

      expect(useRobotStore.getState().activeRobotId).toBe(mockRobotResponse.id)
    })

    it('handles sync errors', async () => {
      mockedApi.listRobots.mockRejectedValue(new Error('Network error'))

      await useRobotStore.getState().syncFromBackend()

      expect(useRobotStore.getState().syncError).toBe('Network error')
      expect(useRobotStore.getState().initialized).toBe(true)
      expect(useRobotStore.getState().isLoading).toBe(false)
    })
  })

  describe('switchWallet', () => {
    it('switches wallet via API and updates store', async () => {
      mockedApi.createRobot.mockResolvedValue(mockRobotResponse)
      mockedApi.switchWallet.mockResolvedValue({
        wallet_address: '0xnewaddress1234567890abcdef12345678',
        wallet_source: 'user_provided',
        user_wallet_address: '0xnewaddress1234567890abcdef12345678',
        privy_wallet_address: mockRobotResponse.privy_wallet_address,
        message: 'Wallet switched',
      })

      await useRobotStore.getState().addRobot({
        name: 'Test Robot',
        motorIp: '192.168.1.100',
        cameraIp: '192.168.1.101',
      })

      await useRobotStore.getState().switchWallet(mockRobotResponse.id, 'user_provided')

      expect(mockedApi.switchWallet).toHaveBeenCalledWith(mockRobotResponse.id, 'user_provided')

      const robot = useRobotStore.getState().robots.get(mockRobotResponse.id)
      expect(robot?.config.walletSource).toBe('user_provided')
      expect(robot?.config.walletAddress).toBe('0xnewaddress1234567890abcdef12345678')
    })
  })

  describe('updateRobotOwnerWallet', () => {
    it('updates owner wallet via API', async () => {
      const updatedRobot = {
        ...mockRobotResponse,
        owner_wallet: '0xnewowner1234567890abcdef12345678',
      }
      mockedApi.createRobot.mockResolvedValue(mockRobotResponse)
      mockedApi.updateRobot.mockResolvedValue(updatedRobot)

      await useRobotStore.getState().addRobot({
        name: 'Test Robot',
        motorIp: '192.168.1.100',
        cameraIp: '192.168.1.101',
      })

      await useRobotStore.getState().updateRobotOwnerWallet(
        mockRobotResponse.id,
        '0xnewowner1234567890abcdef12345678'
      )

      expect(mockedApi.updateRobot).toHaveBeenCalledWith(mockRobotResponse.id, {
        owner_wallet: '0xnewowner1234567890abcdef12345678',
      })

      const robot = useRobotStore.getState().robots.get(mockRobotResponse.id)
      expect(robot?.config.ownerWallet).toBe('0xnewowner1234567890abcdef12345678')
    })
  })

  describe('getRobotById and getActiveRobot', () => {
    it('returns robot by id', async () => {
      mockedApi.createRobot.mockResolvedValue(mockRobotResponse)

      await useRobotStore.getState().addRobot({
        name: 'Test Robot',
        motorIp: '192.168.1.100',
        cameraIp: '192.168.1.101',
      })

      const robot = useRobotStore.getState().getRobotById(mockRobotResponse.id)
      expect(robot?.config.name).toBe('Test Robot')
    })

    it('returns undefined for non-existent robot', () => {
      const robot = useRobotStore.getState().getRobotById('non-existent')
      expect(robot).toBeUndefined()
    })

    it('returns active robot', async () => {
      mockedApi.createRobot.mockResolvedValue(mockRobotResponse)

      await useRobotStore.getState().addRobot({
        name: 'Test Robot',
        motorIp: '192.168.1.100',
        cameraIp: '192.168.1.101',
      })

      const activeRobot = useRobotStore.getState().getActiveRobot()
      expect(activeRobot?.config.name).toBe('Test Robot')
    })

    it('returns undefined when no active robot', () => {
      const activeRobot = useRobotStore.getState().getActiveRobot()
      expect(activeRobot).toBeUndefined()
    })
  })

  describe('multiple robots', () => {
    it('handles multiple robots', async () => {
      const robot1Response = { ...mockRobotResponse, id: 'robot-1', name: 'Robot 1' }
      const robot2Response = { ...mockRobotResponse, id: 'robot-2', name: 'Robot 2' }

      mockedApi.createRobot
        .mockResolvedValueOnce(robot1Response)
        .mockResolvedValueOnce(robot2Response)

      await useRobotStore.getState().addRobot({
        name: 'Robot 1',
        motorIp: '192.168.1.100',
        cameraIp: '192.168.1.101',
      })
      await useRobotStore.getState().addRobot({
        name: 'Robot 2',
        motorIp: '192.168.1.102',
        cameraIp: '192.168.1.103',
      })

      const robots = useRobotStore.getState().robots
      expect(robots.size).toBe(2)
      expect(robots.get('robot-1')?.config.name).toBe('Robot 1')
      expect(robots.get('robot-2')?.config.name).toBe('Robot 2')
    })

    it('updates only the specified robot', async () => {
      const robot1Response = { ...mockRobotResponse, id: 'robot-1' }
      const robot2Response = { ...mockRobotResponse, id: 'robot-2' }

      mockedApi.createRobot
        .mockResolvedValueOnce(robot1Response)
        .mockResolvedValueOnce(robot2Response)

      await useRobotStore.getState().addRobot({
        name: 'Robot 1',
        motorIp: '192.168.1.100',
        cameraIp: '192.168.1.101',
      })
      await useRobotStore.getState().addRobot({
        name: 'Robot 2',
        motorIp: '192.168.1.102',
        cameraIp: '192.168.1.103',
      })

      useRobotStore.getState().updateRobotStatus('robot-1', { connectionStatus: 'online' })

      const robots = useRobotStore.getState().robots
      expect(robots.get('robot-1')?.connectionStatus).toBe('online')
      expect(robots.get('robot-2')?.connectionStatus).toBe('disconnected')
    })
  })
})
