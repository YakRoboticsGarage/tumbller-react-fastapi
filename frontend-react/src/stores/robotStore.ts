import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RobotConfig, RobotState } from '../types'
import { robotManagementApi, type RobotResponse, type RobotCreateRequest } from '../services/robotManagementApi'

// Input for adding a robot (wallet fields are optional - backend handles creation)
export interface AddRobotInput {
  name: string
  motorIp: string
  cameraIp: string
  motorMdns?: string
  cameraMdns?: string
  walletAddress?: string  // Optional - if not provided, Privy creates one
  ownerWallet?: string    // Optional - owner's wallet for payouts
}

// Helper to convert API response to store format
function apiResponseToConfig(robot: RobotResponse): RobotConfig {
  return {
    id: robot.id,
    name: robot.name,
    motorIp: robot.motor_ip,
    cameraIp: robot.camera_ip,
    motorMdns: robot.motor_mdns ?? undefined,
    cameraMdns: robot.camera_mdns ?? undefined,
    walletAddress: robot.wallet_address,
    walletSource: robot.wallet_source,
    userWalletAddress: robot.user_wallet_address ?? undefined,
    privyWalletAddress: robot.privy_wallet_address ?? undefined,
    ownerWallet: robot.owner_wallet ?? undefined,
    createdAt: new Date(robot.created_at),
  }
}

interface RobotStore {
  robots: Map<string, RobotState>
  activeRobotId: string | null
  initialized: boolean
  isLoading: boolean
  syncError: string | null

  // Backend-synced methods
  addRobot: (input: AddRobotInput) => Promise<RobotConfig>
  removeRobot: (robotId: string) => Promise<void>
  syncFromBackend: () => Promise<void>
  updateRobotOwnerWallet: (robotId: string, ownerWallet: string) => Promise<void>
  updateRobotWallet: (robotId: string, walletAddress: string) => Promise<void>
  switchWallet: (robotId: string, walletType: 'user_provided' | 'privy_created') => Promise<void>

  // Local-only methods
  setActiveRobot: (robotId: string | null) => void
  updateRobotStatus: (robotId: string, updates: Partial<RobotState>) => void
  getRobotById: (robotId: string) => RobotState | undefined
  getActiveRobot: () => RobotState | undefined
}

export const useRobotStore = create<RobotStore>()(
  persist(
    (set, get) => ({
      robots: new Map(),
      activeRobotId: null,
      initialized: false,
      isLoading: false,
      syncError: null,

      syncFromBackend: async () => {
        set({ isLoading: true, syncError: null })
        try {
          const response = await robotManagementApi.listRobots()
          const robots = new Map<string, RobotState>()

          for (const robot of response.robots) {
            robots.set(robot.id, {
              config: apiResponseToConfig(robot),
              connectionStatus: 'disconnected',
              cameraStatus: 'disconnected',
            })
          }

          set({ robots, isLoading: false, initialized: true })

          // Set first robot as active if none selected
          const { activeRobotId } = get()
          if (!activeRobotId && response.robots.length > 0) {
            set({ activeRobotId: response.robots[0].id })
          }
        } catch (error) {
          set({
            isLoading: false,
            initialized: true,
            syncError: error instanceof Error ? error.message : 'Failed to sync robots',
          })
        }
      },

      addRobot: async (input: AddRobotInput) => {
        const request: RobotCreateRequest = {
          name: input.name,
          motor_ip: input.motorIp,
          camera_ip: input.cameraIp,
          wallet_address: input.walletAddress,
          owner_wallet: input.ownerWallet,
        }

        const response = await robotManagementApi.createRobot(request)
        const config = apiResponseToConfig(response)

        set((state) => {
          const newRobots = new Map(state.robots)
          newRobots.set(response.id, {
            config,
            connectionStatus: 'disconnected',
            cameraStatus: 'disconnected',
          })
          return {
            robots: newRobots,
            activeRobotId: response.id, // Auto-select newly added robot
          }
        })

        return config
      },

      removeRobot: async (robotId: string) => {
        await robotManagementApi.deleteRobot(robotId)

        set((state) => {
          const newRobots = new Map(state.robots)
          newRobots.delete(robotId)

          // Select next robot if we deleted the active one
          let newActiveId = state.activeRobotId
          if (state.activeRobotId === robotId) {
            const remaining = Array.from(newRobots.keys())
            newActiveId = remaining.length > 0 ? remaining[0] : null
          }

          return {
            robots: newRobots,
            activeRobotId: newActiveId,
          }
        })
      },

      updateRobotOwnerWallet: async (robotId: string, ownerWallet: string) => {
        const response = await robotManagementApi.updateRobot(robotId, { owner_wallet: ownerWallet })
        const config = apiResponseToConfig(response)

        set((state) => {
          const robot = state.robots.get(robotId)
          if (!robot) return state

          const newRobots = new Map(state.robots)
          newRobots.set(robotId, { ...robot, config })
          return { robots: newRobots }
        })
      },

      updateRobotWallet: async (robotId: string, walletAddress: string) => {
        const response = await robotManagementApi.updateRobot(robotId, { wallet_address: walletAddress })
        const config = apiResponseToConfig(response)

        set((state) => {
          const robot = state.robots.get(robotId)
          if (!robot) return state

          const newRobots = new Map(state.robots)
          newRobots.set(robotId, { ...robot, config })
          return { robots: newRobots }
        })
      },

      switchWallet: async (robotId: string, walletType: 'user_provided' | 'privy_created') => {
        const response = await robotManagementApi.switchWallet(robotId, walletType)

        set((state) => {
          const robot = state.robots.get(robotId)
          if (!robot) return state

          const newRobots = new Map(state.robots)
          newRobots.set(robotId, {
            ...robot,
            config: {
              ...robot.config,
              walletAddress: response.wallet_address,
              walletSource: response.wallet_source,
              userWalletAddress: response.user_wallet_address ?? undefined,
              privyWalletAddress: response.privy_wallet_address ?? undefined,
            },
          })
          return { robots: newRobots }
        })
      },

      setActiveRobot: (robotId) => {
        set({ activeRobotId: robotId })
      },

      updateRobotStatus: (robotId, updates) => {
        set((state) => {
          const robot = state.robots.get(robotId)
          if (!robot) return state

          const newRobots = new Map(state.robots)
          newRobots.set(robotId, { ...robot, ...updates })
          return { robots: newRobots }
        })
      },

      getRobotById: (robotId) => {
        return get().robots.get(robotId)
      },

      getActiveRobot: () => {
        const { activeRobotId, robots } = get()
        if (!activeRobotId) return undefined
        return robots.get(activeRobotId)
      },
    }),
    {
      name: 'tumbller-robot-storage',
      partialize: (state) => ({
        robots: Array.from(state.robots.entries()),
        activeRobotId: state.activeRobotId,
        initialized: state.initialized,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as {
          robots?: Array<[string, RobotState]>
          activeRobotId?: string | null
          initialized?: boolean
        }
        // Reset connection status to 'disconnected' on load
        // Robot connection should be re-established each session
        // Filter out any robots missing required wallet fields (from old localStorage data)
        const robots = new Map(
          (persisted.robots || [])
            .filter(([, robot]) => robot.config?.walletAddress && robot.config?.walletSource)
            .map(([id, robot]) => [
              id,
              { ...robot, connectionStatus: 'disconnected' as const, cameraStatus: 'disconnected' as const }
            ])
        )
        return {
          ...currentState,
          robots,
          activeRobotId: persisted.activeRobotId ?? null,
          initialized: false, // Force re-sync from backend on load
          isLoading: false,
          syncError: null,
        }
      },
    }
  )
)
