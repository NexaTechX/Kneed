import { create } from 'zustand';

export interface BookingDraftState {
  providerId?: string;
  serviceId?: string;
  scheduledAt?: Date;
  locationType?: 'studio' | 'mobile';
  address?: string;
  notes?: string;
  step: 1 | 2 | 3 | 4;
  setProvider: (id: string) => void;
  setService: (id: string) => void;
  setTime: (date: Date) => void;
  setLocationType: (t: 'studio' | 'mobile') => void;
  setAddress: (a: string) => void;
  setNotes: (n: string) => void;
  setStep: (s: 1 | 2 | 3 | 4) => void;
  reset: () => void;
}

const initial = {
  providerId: undefined,
  serviceId: undefined,
  scheduledAt: undefined,
  locationType: undefined,
  address: undefined,
  notes: undefined,
  step: 1 as const,
};

export const useBookingDraftStore = create<BookingDraftState>((set) => ({
  ...initial,
  setProvider: (id) => set({ providerId: id }),
  setService: (id) => set({ serviceId: id }),
  setTime: (date) => set({ scheduledAt: date }),
  setLocationType: (t) => set({ locationType: t }),
  setAddress: (a) => set({ address: a }),
  setNotes: (n) => set({ notes: n }),
  setStep: (s) => set({ step: s }),
  reset: () => set(initial),
}));
