export interface CampfireOptions {
  playing?: boolean;
  onReady?: () => void;
  onError?: (error: unknown) => void;
}
export function createCampfireStage(container: HTMLElement, modelUrl: string, options?: CampfireOptions): {
  setPlaying(value: boolean): void;
  dispose(): void;
};
