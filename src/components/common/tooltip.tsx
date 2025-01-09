import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '@/config/theme';
import { useState, useRef, useEffect } from 'react';

// Note: This project uses plain React + TailwindCSS.
// We intentionally avoid Next.js, Shadcn UI, and Radix UI.
// All components are built from scratch using TailwindCSS for styling.

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  delay?: number;
}

export function Tooltip({ content, children, delay = 300 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout>();
  const targetRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      if (targetRef.current) {
        const rect = targetRef.current.getBoundingClientRect();
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 12
        });
        setIsVisible(true);
      }
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={targetRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      className="relative inline-block"
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed z-50 px-3 py-2 text-sm rounded-lg whitespace-nowrap transform -translate-x-1/2 -translate-y-full"
            style={{
              left: position.x,
              top: position.y,
              backgroundColor: theme.colors.background.tooltip,
              color: theme.colors.text.primary,
              border: `1px solid ${theme.colors.border.primary}`,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
          >
            {content}
            <div
              className="absolute left-1/2 bottom-0 w-2 h-2 -mb-1 transform -translate-x-1/2 rotate-45"
              style={{
                backgroundColor: theme.colors.background.tooltip,
                borderRight: `1px solid ${theme.colors.border.primary}`,
                borderBottom: `1px solid ${theme.colors.border.primary}`
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
