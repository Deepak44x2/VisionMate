export const AppMode = {
  SCENE: 'SCENE',
  READ: 'READ',
  FIND: 'FIND',
  MONEY: 'MONEY',
  COLOR: 'COLOR',
  OBJECT: 'OBJECT',
  FACE: 'FACE',
  SOS: 'SOS',
} as const;

export type AppMode = (typeof AppMode)[keyof typeof AppMode];

export type VoiceAction =
  | 'SCENE'
  | 'READ'
  | 'FIND'
  | 'MONEY'
  | 'COLOR'
  | 'OBJECT'
  | 'FACE'
  | 'SCAN'
  | 'STOP'
  | 'HELP'
  | 'BATTERY'
  | 'SOS'
  | 'HOME'
  | 'HISTORY'
  | 'WAKE';

export interface CommandMapping {
  id: string;
  phrase: string;
  action: VoiceAction;
}

export interface KnownFace {
  id: string;
  name: string;
  imageBase64: string;
}

export interface AnalysisResult {
  text: string;
  timestamp: number;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export const SupportedLanguage = {
  EN: 'en-US',
  ES: 'es-ES',
  FR: 'fr-FR',
  DE: 'de-DE',
  IT: 'it-IT',
  JA: 'ja-JP',
  KO: 'ko-KR',
  ZH: 'zh-CN',
  HI: 'hi-IN'
} as const;

export type SupportedLanguage = typeof SupportedLanguage[keyof typeof SupportedLanguage];

export interface VoiceSettings {
  enabled: boolean;
  rate: number;
  language: SupportedLanguage;
}