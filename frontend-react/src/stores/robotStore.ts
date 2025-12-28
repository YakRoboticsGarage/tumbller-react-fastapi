import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RobotConfig, RobotState } from '../types'
import { env, hasDefaultRobotConfig } from '../utils/env'
import { generateUUID } from '../utils/uuid'

interface RobotStore {
  robots: Map<string, RobotState>
  activeRobotId: string | null
  initialized: boolean

  addRobot: (config: RobotConfig) => void
  removeRobot: (robotId: string) => void
  setActiveRobot: (robotId: string | null) => void
  updateRobotStatus: (robotId: string, updates: Partial<RobotState>) => void
  getRobotById: (robotId: string) => RobotState | undefined
  getActiveRobot: () => RobotState | undefined
  initializeDefaultRobot: () => void
}

export const useRobotStore = create<RobotStore>()(
  persist(
    (set, get) => ({
      robots: new Map(),
      activeRobotId: null,
      initialized: false,

      initializeDefaultRobot: () => {
        const { initialized, robots } = get()

        // Only initialize if not already done and no robots exist
        if (initialized || robots.size > 0) return

        // Check if we have default config in .env
        if (hasDefaultRobotConfig()) {
          const defaultConfig: RobotConfig = {
            id: generateUUID(),
            name: env.defaultRobotName!,
            motorIp: env.defaultMotorIp!,
            cameraIp: env.defaultCameraIp!,
            createdAt: new Date(),
          }

          const newRobots = new Map()
          newRobots.set(defaultConfig.id, {
            config: defaultConfig,
            connectionStatus: 'disconnected',
            cameraStatus: 'disconnected',
          })

          set({
            robots: newRobots,
            activeRobotId: defaultConfig.id,
            initialized: true,
          })
        } else {
          set({ initialized: true })
        }
      },

      addRobot: (config) => {
        set((state) => {
          const newRobots = new Map(state.robots)
          newRobots.set(config.id, {
            config,
            connectionStatus: 'disconnected',
            cameraStatus: 'disconnected',
          })
          return {
            robots: newRobots,
            activeRobotId: config.id, // Auto-select newly added robot
          }
        })
      },

      removeRobot: (robotId) => {
        set((state) => {
          const newRobots = new Map(state.robots)
          newRobots.delete(robotId)
          return {
            robots: newRobots,
            activeRobotId: state.activeRobotId === robotId ? null : state.activeRobotId,
          }
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
        const robots = new Map(
          (persisted.robots || []).map(([id, robot]) => [
            id,
            { ...robot, connectionStatus: 'disconnected' as const, cameraStatus: 'disconnected' as const }
          ])
        )
        return {
          ...currentState,
          robots,
          activeRobotId: persisted.activeRobotId ?? null,
          initialized: persisted.initialized ?? false,
        }
      },
    }
  )
)
