import GrainDetailClient from './client';

// Required for static export - defines all valid grain types
export function generateStaticParams() {
    return [
        { type: 'maiz' },
        { type: 'soja' },
        { type: 'trigo' },
        { type: 'cebada' },
        { type: 'girasol' },
        { type: 'sorgo' },
    ];
}

export default function GrainDetailPage({ params }: { params: { type: string } }) {
    return <GrainDetailClient grainSlug={params.type} />;
}
