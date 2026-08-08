import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({ children, className = '', onClick, padding = 'md' }: CardProps) {
  const base = `
    rounded-xl
    bg-white dark:bg-[#242424]
    shadow-sm
    border border-gray-100 dark:border-gray-800
    ${paddingMap[padding]}
    ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}
    ${className}
  `;

  if (onClick) {
    return (
      <button className={base} onClick={onClick} type="button">
        {children}
      </button>
    );
  }

  return <div className={base}>{children}</div>;
}
