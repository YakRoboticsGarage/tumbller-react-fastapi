import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { robotManagementApi, RobotManagementApiError } from '../robotManagementApi'
import { mockWalletBalance, mockGasFundingInfo, mockPayoutSuccess, mockRobotResponse } from '../../test/mocks'

describe('robotManagementApi', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('getWalletBalance', () => {
    it('fetches wallet balance for a robot', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWalletBalance),
      })

      const result = await robotManagementApi.getWalletBalance('robot-123')

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/robots/robot-123/balance'))
      expect(result).toEqual(mockWalletBalance)
    })

    it('throws RobotManagementApiError on failed request', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ detail: 'Robot not found' }),
      })

      await expect(robotManagementApi.getWalletBalance('robot-123')).rejects.toThrow(
        RobotManagementApiError
      )
    })
  })

  describe('getGasFundingInfo', () => {
    it('fetches gas funding info with default USD amount', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockGasFundingInfo),
      })

      const result = await robotManagementApi.getGasFundingInfo()

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/robots/gas-funding-info?usd_amount=1'))
      expect(result).toEqual(mockGasFundingInfo)
    })

    it('fetches gas funding info with custom USD amount', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockGasFundingInfo),
      })

      await robotManagementApi.getGasFundingInfo(5)

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/robots/gas-funding-info?usd_amount=5'))
    })
  })

  describe('payoutToOwner', () => {
    it('initiates payout for a robot', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPayoutSuccess),
      })

      const result = await robotManagementApi.payoutToOwner('robot-123')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/robots/robot-123/payout'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
      expect(result).toEqual(mockPayoutSuccess)
    })

    it('throws RobotManagementApiError on failed payout', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ detail: 'Payout failed' }),
      })

      await expect(robotManagementApi.payoutToOwner('robot-123')).rejects.toThrow(
        RobotManagementApiError
      )
    })
  })

  describe('createRobot', () => {
    it('creates a new robot', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRobotResponse),
      })

      const data = {
        name: 'Test Robot',
        motor_ip: '192.168.1.100',
        camera_ip: '192.168.1.101',
      }

      const result = await robotManagementApi.createRobot(data)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/robots'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      )
      expect(result).toEqual(mockRobotResponse)
    })
  })

  describe('listRobots', () => {
    it('fetches all robots', async () => {
      const listResponse = { robots: [mockRobotResponse], total: 1 }
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(listResponse),
      })

      const result = await robotManagementApi.listRobots()

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/robots'))
      expect(result).toEqual(listResponse)
    })
  })

  describe('getRobot', () => {
    it('fetches a single robot by id', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRobotResponse),
      })

      const result = await robotManagementApi.getRobot('robot-123')

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/robots/robot-123'))
      expect(result).toEqual(mockRobotResponse)
    })
  })

  describe('updateRobot', () => {
    it('updates a robot', async () => {
      const updatedRobot = { ...mockRobotResponse, name: 'Updated Robot' }
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(updatedRobot),
      })

      const result = await robotManagementApi.updateRobot('robot-123', { name: 'Updated Robot' })

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/robots/robot-123'),
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Updated Robot' }),
        })
      )
      expect(result).toEqual(updatedRobot)
    })
  })

  describe('deleteRobot', () => {
    it('deletes a robot', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      })

      await robotManagementApi.deleteRobot('robot-123')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/robots/robot-123'),
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  describe('switchWallet', () => {
    it('switches wallet source', async () => {
      const switchResponse = {
        wallet_address: mockRobotResponse.wallet_address,
        wallet_source: 'privy_created' as const,
        user_wallet_address: null,
        privy_wallet_address: mockRobotResponse.privy_wallet_address,
        message: 'Wallet switched successfully',
      }
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(switchResponse),
      })

      const result = await robotManagementApi.switchWallet('robot-123', 'privy_created')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/robots/robot-123/switch-wallet'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet_type: 'privy_created' }),
        })
      )
      expect(result).toEqual(switchResponse)
    })
  })

  describe('syncWalletToRobot', () => {
    it('syncs wallet to hardware', async () => {
      const syncResponse = { status: 'success', message: 'Wallet synced' }
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(syncResponse),
      })

      const result = await robotManagementApi.syncWalletToRobot('robot-123')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/robots/robot-123/sync-wallet'),
        expect.objectContaining({
          method: 'POST',
        })
      )
      expect(result).toEqual(syncResponse)
    })
  })
})
