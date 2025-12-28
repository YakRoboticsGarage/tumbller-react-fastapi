export interface RobotConfig {
  id: string
  name: string
  motorIp: string
  cameraIp: string
  motorMdns?: string  // Optional mDNS name for motor (e.g., "tumbller-01")
  cameraMdns?: string // Optional mDNS name for camera (e.g., "tumbller-01-cam")
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
