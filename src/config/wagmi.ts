'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arcTestnet } from './chains';

export const config = getDefaultConfig({
  appName: 'ArcAgent Treasury',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'arc-agent-treasury-demo',
  chains: [arcTestnet],
  ssr: true,
});
