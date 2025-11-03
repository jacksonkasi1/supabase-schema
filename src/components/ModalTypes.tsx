'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useClipboard } from '@/lib/hooks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ModalTypesProps {
  open: boolean;
  onClose: () => void;
}

export function ModalTypes({ open, onClose }: ModalTypesProps) {
  const { tables } = useStore();
  const { copy, copied } = useClipboard();

  const capitalizeFirstLetter = (text: string) => {
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const exportedCode = useMemo(() => {
    const referenceTable: { [key: string]: string } = {
      uuid: 'string',
      text: 'string',
      char: 'string',
      character: 'string',
      varchar: 'string',
      ARRAY: 'any[]',
      boolean: 'boolean',
      date: 'string',
      time: 'string',
      timestamp: 'string',
      timestamptz: 'string',
      interval: 'string',
      json: 'json',
      smallint: 'number',
      int: 'number',
      integer: 'number',
      bigint: 'number',
      float: 'number',
      float8: 'number',
    };

    let code = '';
    const dependencies: any = {};
    Object.entries(tables).forEach(([table, value]) => {
      dependencies[table] = value.columns
        ?.map((v) => v.fk?.split('.')[0])
        .filter((v) => typeof v === 'string')
        .filter((v) => table != v);
    });
    let keys = Object.keys(dependencies);
    const output: string[] = [];

    while (keys.length) {
      for (let i in keys) {
        let key = keys[i];
        let d = dependencies[key];

        if (d.every((dependency: any) => output.includes(dependency))) {
          output.push(key);
          keys.splice(+i, 1);
        }
      }
    }

    output.forEach((v) => {
      const table = v;
      const value = tables[v];

      code += `interface ${capitalizeFirstLetter(table)} {\n`;
      value.columns?.forEach((v) => {
        // Set title
        code += `  ${v.title}`;

        // Check required?
        if (!v.required) code += '?';
        code += ': ';

        // Map to Typescript types
        code += referenceTable[v.format]
          ? referenceTable[v.format]
          : 'any // type unknown';

        // Check if Primary key or Foreign Key
        if (v.pk) code += '   /* primary key */';
        if (v.fk) code += `   /* foreign key to ${v.fk} */`;
        code += `;\n`;
      });

      value.columns
        ?.map((z) => z.fk)
        .filter((z) => typeof z === 'string')
        .forEach((z) => {
          let reference = z?.split('.')[0] as string;
          code += `  ${reference}?: ${capitalizeFirstLetter(reference)};\n`;
        });

      code += `};\n\n`;
    });
    return code;
  }, [tables]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Export Types (for TypeScript)</DialogTitle>
            <Button onClick={() => copy(exportedCode)} size="sm">
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <DialogDescription>
            There might be some issues with the exported code. You may submit{' '}
            <a
              href="https://github.com/zernonia/supabase-schema/issues"
              target="_blank"
              className="underline hover:text-primary"
              rel="noreferrer"
            >
              issues here
            </a>
            .
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <pre className="bg-muted text-sm rounded-md p-4">
            {exportedCode}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
