/**
 * ============================================================================
 * USE LOCAL STORAGE HOOK
 * ============================================================================
 * Hook personalizado para manejar localStorage con React state
 * Sincroniza automáticamente entre estado de React y localStorage
 */

import { useState, useEffect, Dispatch, SetStateAction } from 'react';

/**
 * Hook para sincronizar un estado de React con localStorage
 * @param key - Key del localStorage
 * @param initialValue - Valor inicial si no existe en localStorage
 * @returns [valor, setValue] - Similar a useState
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  // Estado inicial: leer de localStorage o usar initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Actualizar localStorage cuando cambia el estado
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
