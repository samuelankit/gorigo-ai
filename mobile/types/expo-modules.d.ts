declare module "expo-local-authentication" {
  export function hasHardwareAsync(): Promise<boolean>;
  export function isEnrolledAsync(): Promise<boolean>;
  export function authenticateAsync(options?: {
    promptMessage?: string;
    fallbackLabel?: string;
    disableDeviceFallback?: boolean;
  }): Promise<{ success: boolean; error?: string }>;
}

declare module "expo-notifications" {
  export function getPermissionsAsync(): Promise<{ status: string }>;
  export function requestPermissionsAsync(): Promise<{ status: string }>;
  export function getExpoPushTokenAsync(options?: { projectId?: string }): Promise<{ data: string }>;
  export function setNotificationChannelAsync(
    channelId: string,
    channel: {
      name: string;
      importance: number;
      vibrationPattern?: number[];
      lightColor?: string;
      sound?: string;
    }
  ): Promise<any>;
  export const AndroidImportance: {
    DEFAULT: number;
    HIGH: number;
    LOW: number;
    MAX: number;
    MIN: number;
    NONE: number;
  };
}

declare module "expo-device" {
  export const isDevice: boolean;
}
