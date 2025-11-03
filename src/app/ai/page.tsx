'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useLocalStorage } from '@/lib/hooks';
import { SQLCardItem, Table } from '@/lib/types';
import { SQLCard } from '@/components/SQLCard';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Table as TableIcon } from 'lucide-react';

// Mock data for demonstration
const mockTables: Table[] = [
  {
    title: 'users',
    columns: [
      { title: 'id', format: 'uuid', type: 'string', pk: true },
      { title: 'email', format: 'varchar', type: 'string', required: true },
      { title: 'name', format: 'varchar', type: 'string' },
      { title: 'created_at', format: 'timestamp', type: 'string' },
    ],
  },
  {
    title: 'products',
    columns: [
      { title: 'id', format: 'uuid', type: 'string', pk: true },
      { title: 'name', format: 'varchar', type: 'string', required: true },
      { title: 'price', format: 'float', type: 'number' },
      { title: 'stock', format: 'integer', type: 'number' },
    ],
  },
  {
    title: 'orders',
    columns: [
      { title: 'id', format: 'uuid', type: 'string', pk: true },
      { title: 'user_id', format: 'uuid', type: 'string', fk: 'users.id' },
      { title: 'total', format: 'float', type: 'number' },
      { title: 'status', format: 'varchar', type: 'string' },
      { title: 'created_at', format: 'timestamp', type: 'string' },
    ],
  },
  {
    title: 'cart',
    columns: [
      { title: 'id', format: 'uuid', type: 'string', pk: true },
      { title: 'user_id', format: 'uuid', type: 'string', fk: 'users.id' },
      { title: 'product_id', format: 'uuid', type: 'string', fk: 'products.id' },
      { title: 'quantity', format: 'integer', type: 'number' },
    ],
  },
  {
    title: 'reviews',
    columns: [
      { title: 'id', format: 'uuid', type: 'string', pk: true },
      { title: 'product_id', format: 'uuid', type: 'string', fk: 'products.id' },
      { title: 'user_id', format: 'uuid', type: 'string', fk: 'users.id' },
      { title: 'rating', format: 'integer', type: 'number' },
      { title: 'comment', format: 'text', type: 'string' },
    ],
  },
  {
    title: 'categories',
    columns: [
      { title: 'id', format: 'uuid', type: 'string', pk: true },
      { title: 'name', format: 'varchar', type: 'string', required: true },
      { title: 'description', format: 'text', type: 'string' },
    ],
  },
];

export default function AIPage() {
  const { tables } = useStore();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultList, setResultList] = useLocalStorage<SQLCardItem[]>('ai-result-list', []);
  const [sheetOpen, setSheetOpen] = useState(false);

  const listOfTables = useMemo(() => {
    const authUserTable: Table = {
      title: 'auth.users',
      columns: [
        { title: 'id', format: 'uuid', type: 'string' },
        { title: 'email', format: 'varchar', type: 'string' },
      ],
    };

    const hasRealTables = Object.keys(tables).length > 0;
    if (hasRealTables) {
      const tablesList = Object.entries(tables)
        .map(([, value]) => (value.is_view ? undefined : value))
        .filter(Boolean) as Table[];
      tablesList.push(authUserTable);
      return tablesList;
    }
    // Show mock data if no real tables
    return mockTables;
  }, [tables]);

  const tableSchema = useMemo(() => {
    return listOfTables
      .map(
        (table) =>
          `${table?.title}(${table?.columns
            ?.map((i) => `${i.title} ${i.format}`)
            .join(',')})`
      )
      .join('\n#');
  }, [listOfTables]);

  const generateSQL = async () => {
    if (!query) return;

    try {
      const resultListIndex = resultList.length;
      const newResultList = [...resultList];
      newResultList[resultListIndex] = {
        query: query,
        result: '',
      };
      setResultList(newResultList);
      setIsLoading(true);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schema: tableSchema,
          query: query,
        }),
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const data = response.body;
      if (!data) {
        return;
      }

      const reader = data.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);

        setResultList((prevList) => {
          const updatedList = [...prevList];
          updatedList[resultListIndex] = {
            ...updatedList[resultListIndex],
            result: (updatedList[resultListIndex].result || '') + chunkValue,
          };
          return updatedList;
        });
      }
    } catch (err) {
      console.error('Error generating SQL:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCard = (index: number) => {
    const newResultList = [...resultList];
    newResultList.splice(index, 1);
    setResultList(newResultList);
  };

  return (
    <div className="h-screen overflow-y-auto p-8 pr-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Supabase SQL AI</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Translate human language to SQL based on your Supabase project
            </p>
          </div>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="lg">
                <Database className="mr-2" size={20} />
                View Schema ({listOfTables.length} tables)
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:max-w-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Database Schema</SheetTitle>
                <SheetDescription>
                  {Object.keys(tables).length > 0
                    ? 'Your connected tables and their structures'
                    : 'Mock data for demonstration (Connect your Supabase to see real tables)'}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {listOfTables.map((table) => (
                  <Card key={table?.title}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TableIcon size={18} />
                        {table?.title}
                      </CardTitle>
                      <CardDescription>
                        {table?.columns?.length || 0} columns
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3 font-medium">Column</th>
                              <th className="text-left py-2 px-3 font-medium">Type</th>
                              <th className="text-left py-2 px-3 font-medium">Attributes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {table?.columns?.map((col) => (
                              <tr key={col.title} className="border-b last:border-0">
                                <td className="py-2 px-3 font-mono text-xs">{col.title}</td>
                                <td className="py-2 px-3 text-muted-foreground">{col.format}</td>
                                <td className="py-2 px-3">
                                  <div className="flex gap-1">
                                    {col.pk && (
                                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                        PK
                                      </span>
                                    )}
                                    {col.fk && (
                                      <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded">
                                        FK → {col.fk}
                                      </span>
                                    )}
                                    {col.required && !col.pk && (
                                      <span className="text-xs bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded">
                                        Required
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Query Builder</CardTitle>
                <CardDescription>Describe what you want in plain English</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Available Tables:</label>
                  <div className="flex flex-wrap gap-2">
                    {listOfTables.map((table) => (
                      <code
                        key={table?.title}
                        className="text-xs px-2 py-1 rounded-md border bg-muted"
                        title={table?.columns?.map((i) => i.title).join(', ')}
                      >
                        {table?.title}
                      </code>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="query" className="text-sm font-medium mb-2 block">
                    Your Query:
                  </label>
                  <textarea
                    id="query"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    rows={6}
                    placeholder="E.g., Get all users who made orders in the last 30 days"
                    className="w-full p-3 rounded-md border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <Button
                  onClick={generateSQL}
                  disabled={isLoading || query.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? 'Generating...' : 'Generate SQL'}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {resultList.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Database className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    No queries yet. Try asking something like:<br />
                    <span className="text-sm italic mt-2 block">
                      &quot;Show me the top 10 products by sales&quot;
                    </span>
                  </p>
                </CardContent>
              </Card>
            ) : (
              resultList.map((item, index) => (
                <SQLCard
                  key={index}
                  item={item}
                  onDelete={() => deleteCard(index)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
