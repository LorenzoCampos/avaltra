import { useLocation } from 'react-router-dom';

export type ActionFeedbackType = 'created' | 'updated';

export interface ActionFeedbackState {
  actionFeedback?: {
    action: ActionFeedbackType;
    itemId: string;
  };
}

const FEEDBACK_CLASSES: Record<ActionFeedbackType, string> = {
  created: 'feedback-flash-success animate-feedback-enter-fast',
  updated: 'feedback-flash-update animate-feedback-enter-fast',
};

export const useActionFeedback = () => {
  const location = useLocation();
  const feedback = (location.state as ActionFeedbackState | null)?.actionFeedback;

  return {
    getFeedbackClassName: (itemId: string) => (
      feedback?.itemId === itemId ? FEEDBACK_CLASSES[feedback.action] : undefined
    ),
  };
};
