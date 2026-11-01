import { useState } from 'react'

export function ThemeToggle({ className, conEtiqueta = false }: { className?: string; conEtiqueta?: boolean }) {
  const [oscuro, setOscuro] = useState(() => document.documentElement.classList.contains('dark'))

  const alternar = () => {
    const nuevo = !oscuro
    setOscuro(nuevo)
    document.documentElement.classList.toggle('dark', nuevo)
    try { localStorage.setItem('theme', nuevo ? 'dark' : 'light') } catch (e) {}
  }

  return (
    <button type="button" className={`toggle-tema ${className ?? ''}`.trim()} onClick={alternar} aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} aria-pressed={oscuro}>
      {oscuro ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      )}
      {conEtiqueta && <span>{oscuro ? 'Modo claro' : 'Modo oscuro'}</span>}
    </button>
  )
}