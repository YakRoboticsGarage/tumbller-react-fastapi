export type WalletSource = 'user_provided' | 'privy_created'

export interface RobotConfig {
  id: string
  name: string
  motorIp: string
  cameraIp: string
  motorMdns?: string  // Optional mDNS name for motor (e.g., "tumbller-01")
  cameraMdns?: string // Optional mDNS name for camera (e.g., "tumbller-01-cam")
  walletAddress: string  // Currently active wallet address for receiving payments
  walletSource: WalletSource  // Current wallet source (user_provided or privy_created)
  userWalletAddress?: string  // Original user-provided wallet (preserved)
  privyWalletAddress?: string  // Privy-managed wallet (if created)
  ownerWallet?: string  // Owner's wallet/ENS/Base name for collecting earnings
  createdAt: Date
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'online' | 'offline'

export interface RobotState {
  config: RobotConfig
  connectionStatus: ConnectionStatus
  lastCommand?: MotorCommand
  cameraStatus: 'connected' | 'disconnected' | 'loading'
}

export type MotorCommand = 'forward' | 'back' | 'left' | 'right'

export interface MotorControlRequest {
  robotId: string
  command: MotorCommand
}
