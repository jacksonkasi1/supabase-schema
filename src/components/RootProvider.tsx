'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import AES from 'crypto-js/aes';
import UTF8 from 'crypto-js/enc-utf8';
import { useRouter } from 'next/navigation';
import { Settings } from './Settings';
import { Loading } from './Loading';
import { getSampleData } from '@/data/sampleData';

export function RootProvider({ children }: { children: React.ReactNode }) {
  const [isFetching, setIsFetching] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const {
    setTables,
    setSchemaView,
    setSupabaseApiKey,
    initializeFromLocalStorage,
    autoArrange,
  } = useStore();
  const router = useRouter();

  // Initialize from localStorage on mount
  useEffect(() => {
    initializeFromLocalStorage();
    setIsInitialized(true);
  }, [initializeFromLocalStorage]);

  // Load sample data if no tables exist after initialization
  useEffect(() => {
    if (!isInitialized) return;

    const tablesData = localStorage.getItem('table-list');
    const parsedTables = tablesData ? JSON.parse(tablesData) : {};

    // Load sample data if no tables exist
    if (!tablesData || Object.keys(parsedTables).length === 0) {
      const sampleData = getSampleData();
      setTables(sampleData.definitions, sampleData.paths);
      // Auto arrange after a short delay to ensure DOM is ready
      setTimeout(() => {
        autoArrange();
      }, 200);
    }
  }, [isInitialized, setTables, autoArrange]);

  // Handle hash changes for shared links
  useEffect(() => {
    if (!isInitialized) return;

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (!hash) return;

      try {
        const encryptedText = hash.substring(1);
        const decryptedText = AES.decrypt(
          encryptedText,
          'this password doesnt matter'
        ).toString(UTF8);
        const result = JSON.parse(decryptedText);

        if (result.tables) {
          const tables = result.tables;
          const paths: { [key: string]: any } = {};
          // Reconstruct paths object for setTables
          Object.keys(tables).forEach((key) => {
            paths[`/${key}`] = { get: {} };
          });

          // Set tables with positions preserved
          useStore.setState({ tables: result.tables });
        }

        if (result.schemaView) {
          setSchemaView(result.schemaView);
        }

        if (result.apikey) {
          setSupabaseApiKey(result.apikey);
        }

        // Navigate to home and clear hash
        router.push('/');
        window.history.replaceState(null, '', window.location.pathname);
      } catch (err) {
        console.error('Error decrypting shared link:', err);
      }
    };

    // Check hash on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isInitialized, setTables, setSchemaView, setSupabaseApiKey, router]);

  if (!isInitialized) {
    return <Loading />;
  }

  return (
    <>
      {children}
      <Settings isFetching={isFetching} setIsFetching={setIsFetching} />
      {isFetching && <Loading />}
    </>
  );
}
