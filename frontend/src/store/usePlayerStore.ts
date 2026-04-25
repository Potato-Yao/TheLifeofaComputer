import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ComputerModel {
  model_id: string;
  display_name: string;
  base_health_hardware: number;
  base_health_system: number;
  cooling_material: 'silicone' | 'liquid_metal';
  is_memory_upgradeable: boolean;
  is_apple_silicon: boolean;
  price_tier: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  quality: 'official' | 'xianyu';
  effects: { target: string, val: number };
}

export interface PlayerState {
  uuid: string;
  day: number;
  health_status: {
    hardware: number;
    hardware_details: {
      cpu: number;
      disk: number;
      ram: number;
      screen: number;
      fan: number;
      shell: number;
    };
    system: number;
    storage: number;
    software: number;
  };
  attributes: {
    wealth: number;
    cyber_sense: number;
    mental_state: number;
  };
  inventory: InventoryItem[];
  hidden_flags: {
    net_assoc_trust: number;
    scam_counter: number;
    machine_flags: string[];
    history_tags: string[];
    joined_npa: boolean;
    pending_repairs: any[];
    read_articles: string[];
    is_endless_mode?: boolean;
    event_done_today?: boolean;
  };
  computer: ComputerModel | null;
}

interface PlayerStore extends PlayerState {
  setPlayerState: (state: Partial<PlayerState>) => void;
  updateHealth: (key: keyof PlayerState['health_status'] | keyof PlayerState['health_status']['hardware_details'], delta: number) => void;
  updateAttribute: (key: keyof PlayerState['attributes'], delta: number) => void;
  nextDay: () => void;
  setComputer: (computer: ComputerModel) => void;
  addToInventory: (item: InventoryItem) => void;
  removeFromInventory: (itemName: string) => void;
  addPendingRepair: (repair: any) => void;
  joinNPA: () => void;
  markArticleRead: (id: string, gain: number) => void;
  markEventDone: () => void;
  resetGame: (isEndless?: boolean) => void;
}

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set) => ({
      uuid: generateUUID(),
  day: 1,
  health_status: {
    hardware: 100,
    hardware_details: { cpu: 100, disk: 100, ram: 100, screen: 100, fan: 100, shell: 100 },
    system: 100,
    storage: 100,
    software: 100,
  },
  attributes: {
    wealth: 1000,
    cyber_sense: 0,
    mental_state: 100,
  },
  inventory: [],
  hidden_flags: {
    net_assoc_trust: 0,
    scam_counter: 0,
    machine_flags: [],
    history_tags: [],
    joined_npa: false,
    pending_repairs: [],
    read_articles: [],
  },
  computer: null,

  setPlayerState: (newState) => set((state) => ({ ...state, ...newState })),
  
  updateHealth: (key, delta) => set((state) => {
    let newHealthStatus = { ...state.health_status };
    
    if (key in newHealthStatus.hardware_details) {
      const parts = { ...newHealthStatus.hardware_details };
      const partKey = key as keyof typeof parts;
      parts[partKey] = Math.max(0, Math.min(100, parts[partKey] + delta));
      newHealthStatus.hardware_details = parts;
      
      const p = Object.values(parts);
      newHealthStatus.hardware = Math.floor(p.reduce((a,b)=>a as number+b as number,0) / p.length);
    } else {
      const topKey = key as keyof Omit<typeof newHealthStatus, 'hardware_details'>;
      newHealthStatus[topKey] = Math.max(0, Math.min(100, (newHealthStatus[topKey] as number) + delta));
    }
    
    return { health_status: newHealthStatus };
  }),

  updateAttribute: (key, delta) => set((state) => {
    let newVal = state.attributes[key] + delta;
    if (key === 'mental_state' || key === 'cyber_sense') {
      newVal = Math.max(0, Math.min(100, newVal));
    } else {
      newVal = Math.max(0, newVal); // wealth can't be negative
    }
    return {
      attributes: { ...state.attributes, [key]: newVal }
    };
  }),

  nextDay: () => set((state) => {
    // Process any pending repairs for the next day
    const newHealth = { 
      ...state.health_status,
      hardware_details: { ...state.health_status.hardware_details }
    };
    let newPending = [...state.hidden_flags.pending_repairs];
    
    // For simplicity, all pending repairs take 1 day and apply immediately next day
    if (newPending.length > 0) {
      newPending.forEach(repair => {
        if (repair.target in newHealth.hardware_details) {
          (newHealth.hardware_details as any)[repair.target] = Math.max(0, Math.min(100, (newHealth.hardware_details as any)[repair.target] + repair.val));
          const p = Object.values(newHealth.hardware_details);
          newHealth.hardware = Math.floor(p.reduce((a,b)=>a as number+b as number,0) / p.length);
        } else {
          (newHealth as any)[repair.target] = Math.max(0, Math.min(100, (newHealth as any)[repair.target] + repair.val));
        }
        alert(`【次日送达】预约的服务已完成：${repair.name}`);
      });
      newPending = [];
    }

    return { 
      day: state.day + 1,
      health_status: newHealth,
      hidden_flags: { ...state.hidden_flags, pending_repairs: newPending, event_done_today: false }
    };
  }),
  
  setComputer: (computer) => set({ 
    computer,
    health_status: {
      hardware: Math.floor((computer.base_health_hardware + 500) / 6),
      hardware_details: { cpu: 100, disk: 100, ram: 100, screen: 100, fan: 100, shell: 100 },
      system: computer.base_health_system,
      storage: 100,
      software: 100
    }
  }),

  addToInventory: (item) => set((state) => ({
    inventory: [...state.inventory, item]
  })),
  
  removeFromInventory: (itemName) => set((state) => {
    const idx = state.inventory.findIndex(i => i.name === itemName);
    if (idx === -1) return state;
    const newInv = [...state.inventory];
    newInv.splice(idx, 1);
    return { inventory: newInv };
  }),
  
  addPendingRepair: (repair) => set((state) => ({
    hidden_flags: {
      ...state.hidden_flags,
      pending_repairs: [...state.hidden_flags.pending_repairs, repair]
    }
  })),
  
  joinNPA: () => set((state) => ({
    hidden_flags: { ...state.hidden_flags, joined_npa: true },
    attributes: { ...state.attributes, cyber_sense: Math.min(100, state.attributes.cyber_sense + 10) }
  })),

  markArticleRead: (id, gain) => set((state) => ({
    hidden_flags: { 
      ...state.hidden_flags, 
      read_articles: [...state.hidden_flags.read_articles, id] 
    },
    attributes: {
      ...state.attributes,
      cyber_sense: Math.min(100, state.attributes.cyber_sense + gain),
      mental_state: Math.max(0, state.attributes.mental_state - 5)
    }
  })),

  markEventDone: () => set((state) => ({
    hidden_flags: { ...state.hidden_flags, event_done_today: true }
  })),

  resetGame: (isEndless = false) => set({
    uuid: generateUUID(),
    day: 1,
    health_status: {
      hardware: 100,
      hardware_details: { cpu: 100, disk: 100, ram: 100, screen: 100, fan: 100, shell: 100 },
      system: 100,
      storage: 100,
      software: 100,
    },
    attributes: {
      wealth: 1000,
      cyber_sense: 0,
      mental_state: 100,
    },
    inventory: [],
    hidden_flags: {
      net_assoc_trust: 0,
      scam_counter: 0,
      machine_flags: [],
      history_tags: [],
      joined_npa: false,
      pending_repairs: [],
      read_articles: [],
      is_endless_mode: isEndless,
    },
    computer: null,
  })
}), { 
  name: 'cyber-survival-save',
  version: 1, // Bumping version will ignore/clear older state
  partialize: (state) => state.hidden_flags?.is_endless_mode ? state : {} as any
}));
