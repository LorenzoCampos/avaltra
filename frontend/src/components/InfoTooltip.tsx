/**
 * ============================================================================
 * INFO TOOLTIP COMPONENT
 * ============================================================================
 * Reusable tooltip with help icon for contextual information
 * Used throughout the app to explain concepts to new users
 * 
 * MOBILE-FRIENDLY: Works with both hover (desktop) and click/tap (mobile)
 */

import { useState } from 'react';
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
  const [open, setOpen] = useState(false);

  const handleTouch = (e: React.TouchEvent) => {
    // Mobile: single tap to toggle
    e.preventDefault();
    e.stopPropagation();
    setOpen(prev => !prev);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Desktop: click to toggle (only if not a touch event)
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseEnter = () => {
    // Desktop: show on hover
    setOpen(true);
  };

  const handleMouseLeave = () => {
    // Desktop: hide on leave
    setOpen(false);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button 
            type="button"
            onTouchEnd={handleTouch}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`
              inline-flex items-center justify-center 
              text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 
              active:text-blue-600 dark:active:text-blue-500
              transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-full
              cursor-pointer touch-manipulation
              ${className}
            `}
            aria-label="Más información"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          className={maxWidth}
        >
          <p className="text-sm leading-relaxed">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
