import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { WeightUnit } from '@/lib/weightUnits';

interface UnitsState {
  weightUnit: WeightUnit;
  setWeightUnit: (unit: WeightUnit) => void;
}

/** Per-device display preference. Weights are always stored in lbs; this only changes what's shown and typed. */
export const useUnitsStore = create<UnitsState>()(
  persist(
    (set) => ({
      weightUnit: 'lbs',
      setWeightUnit: (weightUnit) => set({ weightUnit }),
    }),
    {
      name: 'tru.units',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
