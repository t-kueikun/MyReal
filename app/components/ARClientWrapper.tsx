'use client';

import dynamic from 'next/dynamic';

const ARClient = dynamic(() => import('./ARClient'), {
  ssr: false
});

type Props = {
  imageUrl: string;
  token: string;
};

export default function ARClientWrapper(props: Props) {
  return <ARClient {...props} />;
}
