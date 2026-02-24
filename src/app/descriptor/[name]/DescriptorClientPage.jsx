'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Alert,
  Box,
  Container,
} from '@mui/material';
import DescriptorTable from '@/compatibilityV1/components/DescriptorTable';
import useDescriptorTree from '@/compatibilityV1/hooks/useDescriptorTree';
import DescriptorShell from '@/compatibilityV1/components/DescriptorShell';
import DescriptorsExplorer from '@/compatibilityV1/components/DescriptorsExplorer';
import LoadingCenter from '@/compatibilityV1/components/LoadingCenter';


export default function DescriptorClientPage() {
  const params = useParams();
  const name = decodeURIComponent(params.name || '');

  const [descriptors, setDescriptors] = useState([]);
  const [loadingDescriptors, setLoadingDescriptors] = useState(true);

  // 📜 Fetch descriptors list ONCE
  useEffect(() => {
    let mounted = true;

    setLoadingDescriptors(true);

    (async () => {
      try {
        const res = await fetch('/api/descriptor/list', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`Failed to fetch descriptors: ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        setDescriptors(data.map((d) => ({ id: `d::${d.name}`, name: d.name })));
      } catch (err) {
        console.error('❌ Error fetching descriptors:', err);
        if (!mounted) return;
        setDescriptors([{ id: `d::${name}`, name }]);
      } finally {
        if (mounted) setLoadingDescriptors(false);
      }
    })();

    return () => { mounted = false; };
  }, [name]);

  // 🔄 Load selected descriptor tree
  const { loading, error, descriptor, trees } = useDescriptorTree(name, {
    enabled: true,
  });

  let mainContent = null;
  if (loadingDescriptors) {
    mainContent = (
      <LoadingCenter
        title="Loading descriptors…"
        subtitle="Preparing the list of available descriptors."
      />
    );
  } else if (loading) {
    mainContent = (
      <LoadingCenter
        title={`Loading "${name}" tree…`}
        subtitle="Fetching the descriptor tree data."
      />
    );
  } else if (error) {
    mainContent = (
      <Container sx={{ py: 3 }}>
        <Alert severity="error">Failed to load descriptor: {error}</Alert>
      </Container>
    );
  } else {
    mainContent = (
      <DescriptorShell
        descriptorName={descriptor || name}
        left={<DescriptorsExplorer descriptors={descriptors} defaultExpandRoot />}
      >
        <Container maxWidth="lg" sx={{ py: 3 }}>
          <DescriptorTable descriptor={descriptor} trees={trees} />
        </Container>
      </DescriptorShell>
    );
  }

  return <Box>{mainContent}</Box>;
}
