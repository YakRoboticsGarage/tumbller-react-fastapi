import { vi } from 'vitest'
import type { WalletBalanceResponse, GasFundingInfoResponse, PayoutResponse, RobotResponse } from '../services/robotManagementApi'
import type { WalletSource } from '../types'

// Mock wallet balance response
export const mockWalletBalance: WalletBalanceResponse = {
  wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
  eth_balance_wei: '1000000000000000',
  eth_balance: '0.001',
  usdc_balance_raw: '10500000',
  usdc_balance: '10.50',
}

// Mock gas funding info response
export const mockGasFundingInfo: GasFundingInfoResponse = {
  eth_price_usd: 3500.0,
  usd_amount: 1.0,
  eth_amount_wei: '285714285714286',
  eth_amount: '0.000286',
}

// Mock payout response (success)
export const mockPayoutSuccess: PayoutResponse = {
  status: 'success',
  transaction_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  amount_usdc: '10500000',
  from_wallet: '0x1234567890abcdef1234567890abcdef12345678',
  to_wallet: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
}

// Mock payout response (no funds)
export const mockPayoutNoFunds: PayoutResponse = {
  status: 'no_funds',
  transaction_hash: null,
  amount_usdc: '0',
  from_wallet: '0x1234567890abcdef1234567890abcdef12345678',
  to_wallet: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
}

// Mock robot response
export const mockRobotResponse: RobotResponse = {
  id: 'robot-123',
  name: 'Test Robot',
  motor_ip: '192.168.1.100',
  camera_ip: '192.168.1.101',
  motor_mdns: null,
  camera_mdns: null,
  wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
  wallet_source: 'privy_created',
  user_wallet_address: null,
  privy_wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
  owner_wallet: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  created_at: '2025-12-29T10:00:00Z',
  updated_at: '2025-12-29T10:00:00Z',
}

// Mock robot config for stores
export const mockRobotConfig = {
  id: 'robot-123',
  name: 'Test Robot',
  motorIp: '192.168.1.100',
  cameraIp: '192.168.1.101',
  motorMdns: undefined,
  cameraMdns: undefined,
  walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
  walletSource: 'privy_created' as WalletSource,
  userWalletAddress: undefined,
  privyWalletAddress: '0x1234567890abcdef1234567890abcdef12345678',
  ownerWallet: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
}

// Create a mock for robotManagementApi
export function createMockRobotManagementApi() {
  return {
    getWalletBalance: vi.fn().mockResolvedValue(mockWalletBalance),
    getGasFundingInfo: vi.fn().mockResolvedValue(mockGasFundingInfo),
    payoutToOwner: vi.fn().mockResolvedValue(mockPayoutSuccess),
    createRobot: vi.fn().mockResolvedValue(mockRobotResponse),
    getRobots: vi.fn().mockResolvedValue([mockRobotResponse]),
    getRobot: vi.fn().mockResolvedValue(mockRobotResponse),
    updateRobot: vi.fn().mockResolvedValue(mockRobotResponse),
    deleteRobot: vi.fn().mockResolvedValue(undefined),
    switchWallet: vi.fn().mockResolvedValue(mockRobotResponse),
    syncWallet: vi.fn().mockResolvedValue({ status: 'synced' }),
  }
}

// Mock fetch for API tests
export function mockFetch(response: unknown, options: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = options
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(response),
    text: vi.fn().mockResolvedValue(JSON.stringify(response)),
  })
}
