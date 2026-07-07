import React from 'react';

type TableProps = React.HTMLAttributes<HTMLTableElement> & {
  children: React.ReactNode;
};

export function Table({ className = '', children, ...props }: TableProps) {
  return (
    <div className="w-full overflow-auto">
      <table className={`w-full caption-bottom text-sm ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

type TableHeaderProps = React.HTMLAttributes<HTMLTableSectionElement> & {
  children: React.ReactNode;
};

export function TableHeader({ className = '', children, ...props }: TableHeaderProps) {
  return (
    <thead className={`[&_tr]:border-b border-border-color ${className}`} {...props}>
      {children}
    </thead>
  );
}

type TableBodyProps = React.HTMLAttributes<HTMLTableSectionElement> & {
  children: React.ReactNode;
};

export function TableBody({ className = '', children, ...props }: TableBodyProps) {
  return (
    <tbody className={`[&_tr:last-child]:border-0 ${className}`} {...props}>
      {children}
    </tbody>
  );
}

type TableRowProps = React.HTMLAttributes<HTMLTableRowElement> & {
  children: React.ReactNode;
};

export function TableRow({ className = '', children, ...props }: TableRowProps) {
  return (
    <tr
      className={`border-b border-border-color transition-colors hover:bg-slate-800/20 ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

type TableHeadProps = React.ThHTMLAttributes<HTMLTableCellElement> & {
  children: React.ReactNode;
};

export function TableHead({ className = '', children, ...props }: TableHeadProps) {
  return (
    <th
      className={`h-10 px-3 text-left align-middle text-[11px] font-bold uppercase tracking-wider text-slate-400 ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement> & {
  children: React.ReactNode;
};

export function TableCell({ className = '', children, ...props }: TableCellProps) {
  return (
    <td className={`p-3 align-middle ${className}`} {...props}>
      {children}
    </td>
  );
}
