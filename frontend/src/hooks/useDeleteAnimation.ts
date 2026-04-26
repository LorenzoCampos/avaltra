import { useState } from 'react';

const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Hook para manejar animaciones de delete
 * 
 * Uso:
 * const { deletingId, handleDelete } = useDeleteAnimation();
 * 
 * <div className={deletingId === item.id ? 'animate-slide-out-left' : ''}>
 *   <button onClick={() => handleDelete(item.id, () => actualDeleteFn(item.id))}>
 *     Delete
 *   </button>
 * </div>
 */
export const useDeleteAnimation = (animationDuration: number = 180) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (
    itemId: string,
    deleteFn: () => void | Promise<void>
  ) => {
    setDeletingId(itemId);

    try {
      const delay = prefersReducedMotion() ? 0 : animationDuration;

      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      await deleteFn();
    } finally {
      setDeletingId(null);
    }
  };

  return {
    deletingId,
    handleDelete,
    isDeleting: (itemId: string) => deletingId === itemId,
  };
};
