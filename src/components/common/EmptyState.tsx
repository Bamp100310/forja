import React from 'react'
import { PixelSprite, type PixelSpriteName } from './PixelSprite'

interface EmptyStateProps {
  sprite?: PixelSpriteName
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  sprite = 'empty_bench',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`p-6 sm:p-8 flex flex-col items-center justify-center text-center rounded-sm border border-dashed border-[#2d453b] bg-[#0c1412]/80 my-2 ${className}`}
    >
      <div className="mb-3 p-2 bg-[#121f1b] border border-[#233a33] shadow-inner">
        <PixelSprite name={sprite} size={42} />
      </div>

      <h4 className="font-stencil text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wide">
        {title}
      </h4>

      {description && (
        <p className="text-xs text-slate-400 mt-1 max-w-md font-pixel leading-relaxed">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-game btn-game-primary text-xs py-2 px-4 mt-3.5 font-bold cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
