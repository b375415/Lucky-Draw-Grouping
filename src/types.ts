export interface Participant {
  id: string;
  name: string;
}

export type AppTab = 'source' | 'draw' | 'group';

export interface DrawSettings {
  allowRepeat: boolean;
}

export interface GroupingSettings {
  groupSize: number;
}
