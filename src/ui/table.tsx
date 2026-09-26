import * as React from 'react';
import { cn } from './cn';

/**
 * Data tables for the admin. Hairline separators, sticky header, tabular
 * numerals — no zebra striping, matching the rest of the system.
 */
export function Table({ className, children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full border-collapse text-left text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function THead({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn('sticky top-0 z-10 bg-void/95 backdrop-blur supports-[backdrop-filter]:bg-void/80', className)}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TR({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('border-b border-hairline transition-colors last:border-0 hover:bg-panel', className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TH({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn('label whitespace-nowrap px-4 py-3 text-left font-semibold', className)}
      {...props}
    >
      {children}
    </th>
  );
}

export function TD({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-3 align-middle', className)} {...props}>
      {children}
    </td>
  );
}

/** Numeric cell: tabular figures, right aligned. */
export function TDNumber({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('numeric px-4 py-3 text-right align-middle', className)} {...props}>
      {children}
    </td>
  );
}
