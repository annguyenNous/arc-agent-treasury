'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arcTestnet } from './chains';

export const config = getDefaultConfig({
  appName: 'ArcAgent Treasury',
  projectId: 'arc-agent-treasury',
  chains: [arcTestnet],
  ssr: true,
});
