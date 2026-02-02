/**
 * ============================================================================
 * INFO TOOLTIP COMPONENT
 * ============================================================================
 * Reusable tooltip with help icon for contextual information
 * Used throughout the app to explain concepts to new users
 */

import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

interface InfoTooltipProps {
  content: string;
  className?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  maxWidth?: string;
}

export const InfoTooltip = ({ 
  content, 
  className = '',
  side = 'top',
  maxWidth = 'max-w-xs'
}: InfoTooltipProps) => {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            type="button"
            className={`
              inline-flex items-center justify-center 
              text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 
              transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-full
              ${className}
            `}
            aria-label="Más información"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className={maxWidth}>
          <p className="text-sm leading-relaxed">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
