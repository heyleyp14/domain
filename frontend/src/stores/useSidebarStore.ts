import { create } from 'zustand'

interface SidebarState {
  colapsado: boolean
  abierto: boolean
  toggleColapsado: () => void
  setAbierto: (v: boolean) => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  colapsado: typeof window !== 'undefined' && localStorage.getItem('sidebar-colapsado') === '1',
  abierto: false,
  toggleColapsado: () => set(s => {
    const nuevo = !s.colapsado
    try { localStorage.setItem('sidebar-colapsado', nuevo ? '1' : '0') } catch (e) {}
    return { colapsado: nuevo }
  }),
  setAbierto: (v) => set({ abierto: v }),
}))