/**
 * The ONE button for the whole site (also for links that look like buttons).
 * Variants: primary (red pill), secondary (black outline → fills black on hover), ghost (red text + arrow),
 * quick (round 44px red add button), option (selectable pill: bone, pack size, cut, amount).
 * States: hover, pressed (scale .97), focus-visible (2px red ring, 2px offset), disabled (40%), loading (spinner, same width).
 */
import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'quick' | 'option';
type Size = 'md' | 'lg' | 'xl';

type Common = {
  variant?: Variant;
  size?: Size;
  /** Icon on the inline-start side. */
  icon?: IconName;
  block?: boolean;
  /** Soft red glow — main call-to-action only. */
  glow?: boolean;
  loading?: boolean;
  /** Option buttons: selected state (shows a check, black fill). */
  selected?: boolean;
  className?: string;
  children?: ReactNode;
  /** Ghost only: false hides the moving arrow (for small inline actions like "Remove"). */
  arrow?: boolean;
};

function classes({ variant = 'primary', size = 'md', block, glow, loading, selected, className }: Common) {
  return ['btn', `btn-${variant}`, `btn-${size}`, block && 'btn-block', glow && 'btn-glow', loading && 'is-loading', selected && 'is-selected', className]
    .filter(Boolean).join(' ');
}

function Inner({ variant, icon, loading, selected, children, arrow = true }: Common) {
  return (
    <>
      {variant === 'option' && <span className="btn-fill" aria-hidden />}
      <span className="btn-label">
        {variant === 'option' && selected && <Icon name="check" size={16} weight="bold" className="btn-check" />}
        {icon && <Icon name={icon} size={variant === 'quick' ? 22 : 20} />}
        {children}
        {variant === 'ghost' && arrow && <Icon name="arrowEnd" size={18} className="btn-arrow" />}
      </span>
      {loading && <span className="btn-spinner" aria-hidden />}
    </>
  );
}

export function Button({ variant = 'primary', size, icon, block, glow, loading, selected, className, children, type = 'button', disabled, arrow, ...rest }: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={classes({ variant, size, block, glow, loading, selected, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <Inner variant={variant} icon={icon} loading={loading} selected={selected} arrow={arrow}>{children}</Inner>
    </button>
  );
}

export function ButtonLink({ href, variant = 'primary', size, icon, block, glow, className, children, external, arrow, ...rest }: Common & { href: string; external?: boolean } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const cls = classes({ variant, size, block, glow, className });
  const inner = <Inner variant={variant} icon={icon} arrow={arrow}>{children}</Inner>;
  if (external || /^(https?:|tel:|mailto:)/.test(href)) {
    return <a href={href} className={cls} {...(external ? { target: '_blank', rel: 'noopener' } : {})} {...rest}>{inner}</a>;
  }
  return <Link href={href} className={cls} {...rest}>{inner}</Link>;
}
