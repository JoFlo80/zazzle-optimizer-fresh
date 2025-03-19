declare module 'decache';
declare module 'update-notifier';
declare module 'fastest-levenshtein';
declare module 'envinfo';

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY: string;
  readonly OPENAI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}