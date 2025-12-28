/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_ROBOT_NAME: string
  readonly VITE_DEFAULT_MOTOR_IP: string
  readonly VITE_DEFAULT_CAMERA_IP: string
  readonly VITE_API_URL: string
  readonly VITE_ENABLE_AUTH: string
  readonly VITE_LOGTO_ENDPOINT: string
  readonly VITE_LOGTO_APP_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
