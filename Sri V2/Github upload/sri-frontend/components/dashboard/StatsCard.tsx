// components/dashboard/StatsCard.tsx
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: number | string;
    icon: LucideIcon;
    trend?: string;
    color: 'green' | 'yellow' | 'blue' | 'red';
}

export function StatsCard({ title, value, icon: Icon, trend, color }: StatsCardProps) {
    const colors = {
        green: 'bg-green-100 text-green-800',
        yellow: 'bg-yellow-100 text-yellow-800',
        blue: 'bg-blue-100 text-blue-800',
        red: 'bg-red-100 text-red-800'
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm font-medium">{title}</span>
                <Icon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-end gap-2">
                <span className="text-3xl font-bold">{value}</span>
                {trend && (
                    <span className={`text-sm font-medium ${colors[color]}`}>
                        {trend}
                    </span>
                )}
            </div>
        </div>
    );
}
