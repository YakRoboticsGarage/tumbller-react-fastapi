export const env = {
  defaultRobotName: import.meta.env.VITE_DEFAULT_ROBOT_NAME,
  defaultMotorIp: import.meta.env.VITE_DEFAULT_MOTOR_IP,
  defaultCameraIp: import.meta.env.VITE_DEFAULT_CAMERA_IP,
}

export function hasDefaultRobotConfig(): boolean {
  return !!(env.defaultRobotName && env.defaultMotorIp && env.defaultCameraIp)
}
