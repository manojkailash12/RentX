import { useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

/**
 * Custom hook for showing confirmation dialogs
 * Usage:
 * const { confirm, ConfirmDialogComponent } = useConfirm();
 * 
 * // In your component JSX:
 * return (
 *   <>
 *     <button onClick={() => confirm({
 *       title: 'Delete Item',
 *       message: 'Are you sure?',
 *       onConfirm: () => deleteItem()
 *     })}>Delete</button>
 *     {ConfirmDialogComponent}
 *   </>
 * )
 */
export const useConfirm = () => {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    confirmColor: 'bg-green-600 hover:bg-green-700',
    icon: '⚠️',
    onConfirm: () => {}
  });

  const confirm = ({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmColor = 'bg-green-600 hover:bg-green-700',
    icon = '⚠️',
    onConfirm = () => {}
  }) => {
    setDialogState({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      confirmColor,
      icon,
      onConfirm
    });
  };

  const closeDialog = () => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
  };

  const ConfirmDialogComponent = (
    <ConfirmDialog
      isOpen={dialogState.isOpen}
      onClose={closeDialog}
      onConfirm={dialogState.onConfirm}
      title={dialogState.title}
      message={dialogState.message}
      confirmText={dialogState.confirmText}
      cancelText={dialogState.cancelText}
      confirmColor={dialogState.confirmColor}
      icon={dialogState.icon}
    />
  );

  return { confirm, ConfirmDialogComponent };
};
