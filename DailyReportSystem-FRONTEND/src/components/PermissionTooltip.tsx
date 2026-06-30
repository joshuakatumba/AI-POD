'use client';

import React, {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

export type PermissionTooltipPlacement = 'top' | 'bottom' | 'auto';

export interface PermissionTooltipProps {
  /** When true, the child action is blocked and the tooltip applies. */
  restricted: boolean;
  /** Explanation shown on hover, focus, and to screen readers. */
  message: string;
  /** Accessible name when restricted; defaults to `message`. */
  ariaLabel?: string;
  /** Preferred placement; `auto` flips above/below based on viewport space. */
  placement?: PermissionTooltipPlacement;
  children: React.ReactElement;
}

type ResolvedPlacement = 'top' | 'bottom';

const TOOLTIP_OFFSET = 8;

function mergeSx(existing: unknown, restricted: boolean): unknown {
  const restrictedSx = restricted
    ? {
        opacity: 0.6,
        cursor: 'not-allowed',
        pointerEvents: 'auto' as const,
        '&:hover': { opacity: 0.6 },
      }
    : {};

  if (!existing) return restricted ? restrictedSx : undefined;
  if (Array.isArray(existing)) {
    return restricted ? [...existing, restrictedSx] : existing;
  }
  return restricted
    ? { ...(existing as Record<string, unknown>), ...restrictedSx }
    : existing;
}

/**
 * Accessible tooltip for permission-restricted controls.
 * Uses `aria-disabled` (not `disabled`) so controls stay keyboard-focusable.
 *
 * @example
 * <PermissionTooltip restricted={!isAdmin} message={INVITE_MEMBER_TOOLTIP} ariaLabel="Invite member">
 *   <Button variant="contained" onClick={openInvite}>Invite Member</Button>
 * </PermissionTooltip>
 */
export default function PermissionTooltip({
  restricted,
  message,
  ariaLabel,
  placement = 'auto',
  children,
}: PermissionTooltipProps) {
  const descId = useId();
  const tooltipId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [resolvedPlacement, setResolvedPlacement] = useState<ResolvedPlacement>('top');
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const preferTop = placement === 'top';
    const preferBottom = placement === 'bottom';

    let nextPlacement: ResolvedPlacement = 'top';
    if (placement === 'auto') {
      nextPlacement = spaceAbove >= spaceBelow ? 'top' : 'bottom';
    } else if (preferBottom) {
      nextPlacement = 'bottom';
    } else if (preferTop) {
      nextPlacement = 'top';
    } else {
      nextPlacement = spaceAbove >= 48 ? 'top' : 'bottom';
    }

    setResolvedPlacement(nextPlacement);
    setCoords({
      top:
        nextPlacement === 'top'
          ? rect.top + window.scrollY - TOOLTIP_OFFSET
          : rect.bottom + window.scrollY + TOOLTIP_OFFSET,
      left: rect.left + window.scrollX + rect.width / 2,
    });
  }, [placement]);

  const show = useCallback(() => {
    if (!restricted || !message) return;
    updatePosition();
    setVisible(true);
  }, [message, restricted, updatePosition]);

  const hide = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const onScrollOrResize = () => updatePosition();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hide();
      }
    };

    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [hide, updatePosition, visible]);

  if (!isValidElement(children)) {
    return children;
  }

  if (!restricted) {
    return children;
  }

  const child = children as React.ReactElement<Record<string, unknown>>;
  const existingClassName = (child.props.className as string) || '';
  const label = ariaLabel ?? message;

  const enhancedChild = cloneElement(child, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
    },
    'aria-disabled': true,
    'aria-describedby': descId,
    'aria-label': label,
    tabIndex: child.props.tabIndex ?? 0,
    className: `${existingClassName} aria-disabled:opacity-60 aria-disabled:cursor-not-allowed`.trim(),
    sx: mergeSx(child.props.sx, true),
    onClick: (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
      }
      const childOnKeyDown = child.props.onKeyDown as
        | ((e: React.KeyboardEvent) => void)
        | undefined;
      childOnKeyDown?.(event);
    },
    onFocus: (event: React.FocusEvent) => {
      show();
      const childOnFocus = child.props.onFocus as
        | ((e: React.FocusEvent) => void)
        | undefined;
      childOnFocus?.(event);
    },
    onBlur: (event: React.FocusEvent) => {
      hide();
      const childOnBlur = child.props.onBlur as
        | ((e: React.FocusEvent) => void)
        | undefined;
      childOnBlur?.(event);
    },
    onMouseEnter: (event: React.MouseEvent) => {
      show();
      const childOnMouseEnter = child.props.onMouseEnter as
        | ((e: React.MouseEvent) => void)
        | undefined;
      childOnMouseEnter?.(event);
    },
    onMouseLeave: (event: React.MouseEvent) => {
      hide();
      const childOnMouseLeave = child.props.onMouseLeave as
        | ((e: React.MouseEvent) => void)
        | undefined;
      childOnMouseLeave?.(event);
    },
  });

  const tooltip =
    visible && typeof document !== 'undefined'
      ? createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none fixed z-[9999] max-w-[16rem] rounded-md border border-neutral-700/20 bg-neutral-900 px-2.5 py-1.5 text-xs font-medium leading-snug text-white shadow-lg dark:border-neutral-600/30 dark:bg-neutral-800 dark:text-neutral-50"
            style={{
              top: coords.top,
              left: coords.left,
              transform:
                resolvedPlacement === 'top'
                  ? 'translate(-50%, -100%)'
                  : 'translate(-50%, 0)',
            }}
          >
            {message}
          </div>,
          document.body
        )
      : null;

  return (
    <span
      className="inline-flex w-full max-w-full"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <span id={descId} className="sr-only">
        {message}
      </span>
      {enhancedChild}
      {tooltip}
    </span>
  );
}
