export interface GrainStock {
    id: string;
    establishment: string;
    grainType: 'Soja' | 'Maíz' | 'Trigo' | 'Cebada' | 'Girasol' | 'Sorgo';
    campaign: string;
    initialStock: number;
    soldDelivered: number; // Venta de Granos (entregado)
    livestockConsumption: number; // Ganaderia
    seeds: number; // Semillas
    extruderOwn: number; // Extrusora Soja Propia
    extruderExchange: number; // Extrusora Soja Canje
    exchanges: number; // Canjes
    committedSales: number; // Venta Grano Comprometida (contrato pero no entregado)
}

export interface ComputedGrainStock extends GrainStock {
    physicalStock: number;
    realStock: number;
}

import * as XLSX from 'xlsx';

export const GrainUtils = {
    exportToExcel: (data: ComputedGrainStock[], grainType: string) => {
        // Map data to Spanish headers for the report
        const exportData = data.map(item => ({
            'Establecimiento': item.establishment,
            'Campaña': item.campaign,
            'Stock Inicial': item.initialStock,
            'Venta Entregado': item.soldDelivered,
            'Consumo Ganadero': item.livestockConsumption,
            'Semillas': item.seeds,
            'Extrusora Propia': item.extruderOwn,
            'Extrusora Canje': item.extruderExchange,
            'Canjes': item.exchanges,
            'Stock Físico Today': item.physicalStock,
            'Venta Comprometida': item.committedSales,
            'Stock Real': item.realStock
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Granos");

        // Generate filename with timestamp
        const date = new Date().toISOString().split('T')[0];
        const filename = `Stock_${grainType}_${date}.xlsx`;

        XLSX.writeFile(workbook, filename);
    },

    calculateStocks: (data: GrainStock): ComputedGrainStock => {
        // Stock Físico: El fisico en el campo = Stock de inicio menos lo ya entregado en venta de granos menos lo que se consumio
        const deductions =
            data.soldDelivered +
            data.livestockConsumption +
            data.seeds +
            data.extruderOwn +
            data.extruderExchange +
            data.exchanges;

        const physicalStock = data.initialStock - deductions;

        // Stock Real: Lo que realmente tiene la empresa disponible para la venta (stock fisico menos vtas. comprometidas)
        const realStock = physicalStock - data.committedSales;

        return {
            ...data,
            physicalStock,
            realStock
        };
    },

    formatNumber: (num: number) => {
        return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(num);
    },

    // Mock initial data used as fallback
    getMockData: (): GrainStock[] => [
        // CEBADA
        {
            id: '1',
            establishment: 'SAN MIGUEL DEL MONTE',
            grainType: 'Cebada',
            campaign: '2025/2026',
            initialStock: 979690,
            soldDelivered: 752620,
            livestockConsumption: 0,
            seeds: 150000,
            extruderOwn: 0,
            extruderExchange: 0,
            exchanges: 77070,
            committedSales: 0
        },
        {
            id: '2',
            establishment: 'TRENQUE LAUQUEN',
            grainType: 'Cebada',
            campaign: '2025/2026',
            initialStock: 3080665,
            soldDelivered: 2630000,
            livestockConsumption: 133582,
            seeds: 305060,
            extruderOwn: 0,
            extruderExchange: 0,
            exchanges: 12023,
            committedSales: 300000
        },
        // MAIZ
        {
            id: '3',
            establishment: 'LA FELICIDAD / ALQ',
            grainType: 'Maíz',
            campaign: '2025/2026',
            initialStock: 5000000,
            soldDelivered: 1200000,
            livestockConsumption: 500000,
            seeds: 0,
            extruderOwn: 0,
            extruderExchange: 0,
            exchanges: 0,
            committedSales: 1000000
        },
        // SOJA
        {
            id: '4',
            establishment: 'EL RETORNO',
            grainType: 'Soja',
            campaign: '2025/2026',
            initialStock: 2500000,
            soldDelivered: 0,
            livestockConsumption: 0,
            seeds: 200000,
            extruderOwn: 150000,
            extruderExchange: 50000,
            exchanges: 0,
            committedSales: 500000
        },
        // TRIGO
        {
            id: '5',
            establishment: 'CAMPO NORTE',
            grainType: 'Trigo',
            campaign: '2025/2026',
            initialStock: 1800000,
            soldDelivered: 1800000,
            livestockConsumption: 0,
            seeds: 0,
            extruderOwn: 0,
            extruderExchange: 0,
            exchanges: 0,
            committedSales: 0
        },
        // GIRASOL
        {
            id: '6',
            establishment: 'LA REJA',
            grainType: 'Girasol',
            campaign: '2025/2026',
            initialStock: 900000,
            soldDelivered: 200000,
            livestockConsumption: 0,
            seeds: 50000,
            extruderOwn: 0,
            extruderExchange: 0,
            exchanges: 0,
            committedSales: 100000
        },
        // SORGO
        {
            id: '7',
            establishment: 'ZONA SUR',
            grainType: 'Sorgo',
            campaign: '2025/2026',
            initialStock: 450000,
            soldDelivered: 100000,
            livestockConsumption: 250000,
            seeds: 0,
            extruderOwn: 0,
            extruderExchange: 0,
            exchanges: 0,
            committedSales: 0
        }
    ],

    // API Integration
    fetchStocks: async (token: string): Promise<GrainStock[]> => {
        try {
            const API = (await import('./api')).default;
            const response = await API.get('/stocks');

            // Map snake_case DB fields to camelCase GrainStock fields
            return response.map((item: any) => ({
                id: item.id?.toString() || '0', // DB id
                establishment: item.establishment, // Joined from production_zones
                grainType: item.grain_type,
                campaign: item.campaign,
                initialStock: parseFloat(item.initial_stock || 0),
                soldDelivered: parseFloat(item.sold_delivered || 0),
                livestockConsumption: parseFloat(item.livestock_consumption || 0),
                seeds: parseFloat(item.seeds || 0),
                extruderOwn: parseFloat(item.extruder_own || 0),
                extruderExchange: parseFloat(item.extruder_exchange || 0),
                exchanges: parseFloat(item.exchanges || 0),
                committedSales: parseFloat(item.committed_sales || 0)
            }));
        } catch (error) {
            console.error('Failed to fetch stocks:', error);
            return [];
        }
    },

    saveStock: async (stock: GrainStock, params: { productionZoneId: number; grainType: string; campaign: string }) => {
        try {
            const API = (await import('./api')).default;
            const payload = {
                production_zone_id: params.productionZoneId,
                grain_type: params.grainType,
                campaign: params.campaign,
                initial_stock: stock.initialStock,
                sold_delivered: stock.soldDelivered,
                livestock_consumption: stock.livestockConsumption,
                seeds: stock.seeds,
                extruder_own: stock.extruderOwn,
                extruder_exchange: stock.extruderExchange,
                exchanges: stock.exchanges,
                committed_sales: stock.committedSales
            };
            return await API.post('/stocks', payload);
        } catch (error) {
            console.error('Failed to save stock:', error);
            throw error;
        }
    },

    // Generate mock stocks based on registered zones (Fallback logic)
    generateStocksForZones: (zones: any[]): GrainStock[] => {
        const grainTypes: Array<GrainStock['grainType']> = ['Cebada', 'Maíz', 'Soja', 'Trigo', 'Girasol', 'Sorgo'];
        let stocks: GrainStock[] = [];
        let idCounter = 1;

        if (!zones || zones.length === 0) return GrainUtils.getMockData();

        zones.forEach(zone => {
            // Generate some stocks for each zone (skip some to be realistic)
            grainTypes.forEach(type => {
                if (Math.random() > 0.3) { // 70% chance a zone has this grain
                    stocks.push({
                        id: String(idCounter++),
                        establishment: zone.location.toUpperCase(),
                        grainType: type,
                        campaign: '2025/2026',
                        initialStock: Math.floor(Math.random() * 5000000) + 100000,
                        soldDelivered: Math.floor(Math.random() * 1000000),
                        livestockConsumption: Math.random() > 0.8 ? Math.floor(Math.random() * 200000) : 0,
                        seeds: Math.random() > 0.8 ? Math.floor(Math.random() * 100000) : 0,
                        extruderOwn: 0,
                        extruderExchange: 0,
                        exchanges: 0,
                        committedSales: Math.floor(Math.random() * 500000)
                    });
                }
            });
        });

        return stocks;
    }
};
