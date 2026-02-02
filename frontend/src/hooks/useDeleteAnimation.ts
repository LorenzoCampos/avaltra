import { useState } from 'react';

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
export const useDeleteAnimation = (animationDuration: number = 300) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (
    itemId: string,
    deleteFn: () => void | Promise<void>
  ) => {
    // Start animation
    setDeletingId(itemId);

    // Wait for animation to complete
    await new Promise((resolve) => setTimeout(resolve, animationDuration));

    // Execute actual delete
    await deleteFn();

    // Reset state
    setDeletingId(null);
  };

  return {
    deletingId,
    handleDelete,
    isDeleting: (itemId: string) => deletingId === itemId,
  };
};
