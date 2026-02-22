/**
 * TABLAS OFICIALES COMPLETAS DE MERMA POR SECADO
 * Fuente: PDFs Cámara Arbitral de Cereales
 * 
 * REGLAS:
 * 1. Merma sobre CANTIDAD (Kg)
 * 2. Merma manipuleo SOLO cuando hay secada
 * 3. Redondeo: 15.05% → 15.1%
 */

export interface MoistureEntry {
  humidity: number;
  waste_percent: number;
}

export interface MoistureTable {
  product: string;
  base_humidity: number;
  handling_waste: number;
  entries: MoistureEntry[];
}

export const MOISTURE_TABLES: Record<string, MoistureTable> = {

  // SOJA - Base 13.5%, Manipuleo 0.25%
  soja: {
    product: 'Soja',
    base_humidity: 13.5,
    handling_waste: 0.25,
    entries: [
      { humidity: 13.6, waste_percent: 0.69 }, { humidity: 13.7, waste_percent: 0.80 },
      { humidity: 13.8, waste_percent: 0.92 }, { humidity: 13.9, waste_percent: 1.03 },
      { humidity: 14.0, waste_percent: 1.15 }, { humidity: 14.1, waste_percent: 1.26 },
      { humidity: 14.2, waste_percent: 1.38 }, { humidity: 14.3, waste_percent: 1.49 },
      { humidity: 14.4, waste_percent: 1.61 }, { humidity: 14.5, waste_percent: 1.72 },
      { humidity: 14.6, waste_percent: 1.84 }, { humidity: 14.7, waste_percent: 1.95 },
      { humidity: 14.8, waste_percent: 2.07 }, { humidity: 14.9, waste_percent: 2.18 },
      { humidity: 15.0, waste_percent: 2.30 }, { humidity: 15.1, waste_percent: 2.41 },
      { humidity: 15.2, waste_percent: 2.53 }, { humidity: 15.3, waste_percent: 2.64 },
      { humidity: 15.4, waste_percent: 2.76 }, { humidity: 15.5, waste_percent: 2.87 },
      { humidity: 15.6, waste_percent: 2.99 }, { humidity: 15.7, waste_percent: 3.10 },
      { humidity: 15.8, waste_percent: 3.22 }, { humidity: 15.9, waste_percent: 3.33 },
      { humidity: 16.0, waste_percent: 3.45 }, { humidity: 16.1, waste_percent: 3.56 },
      { humidity: 16.2, waste_percent: 3.68 }, { humidity: 16.3, waste_percent: 3.79 },
      { humidity: 16.4, waste_percent: 3.91 }, { humidity: 16.5, waste_percent: 4.02 },
      { humidity: 16.6, waste_percent: 4.14 }, { humidity: 16.7, waste_percent: 4.25 },
      { humidity: 16.8, waste_percent: 4.37 }, { humidity: 16.9, waste_percent: 4.48 },
      { humidity: 17.0, waste_percent: 4.60 }, { humidity: 17.1, waste_percent: 4.71 },
      { humidity: 17.2, waste_percent: 4.83 }, { humidity: 17.3, waste_percent: 4.94 },
      { humidity: 17.4, waste_percent: 5.06 }, { humidity: 17.5, waste_percent: 5.17 },
      { humidity: 17.6, waste_percent: 5.29 }, { humidity: 17.7, waste_percent: 5.40 },
      { humidity: 17.8, waste_percent: 5.52 }, { humidity: 17.9, waste_percent: 5.63 },
      { humidity: 18.0, waste_percent: 5.75 }, { humidity: 18.1, waste_percent: 5.86 },
      { humidity: 18.2, waste_percent: 5.98 }, { humidity: 18.3, waste_percent: 6.09 },
      { humidity: 18.4, waste_percent: 6.21 }, { humidity: 18.5, waste_percent: 6.32 },
      { humidity: 18.6, waste_percent: 6.44 }, { humidity: 18.7, waste_percent: 6.55 },
      { humidity: 18.8, waste_percent: 6.67 }, { humidity: 18.9, waste_percent: 6.78 },
      { humidity: 19.0, waste_percent: 6.90 }, { humidity: 19.1, waste_percent: 7.01 },
      { humidity: 19.2, waste_percent: 7.13 }, { humidity: 19.3, waste_percent: 7.24 },
      { humidity: 19.4, waste_percent: 7.36 }, { humidity: 19.5, waste_percent: 7.47 },
      { humidity: 19.6, waste_percent: 7.59 }, { humidity: 19.7, waste_percent: 7.70 },
      { humidity: 19.8, waste_percent: 7.82 }, { humidity: 19.9, waste_percent: 7.93 },
      { humidity: 20.0, waste_percent: 8.05 }, { humidity: 20.1, waste_percent: 8.16 },
      { humidity: 20.2, waste_percent: 8.28 }, { humidity: 20.3, waste_percent: 8.39 },
      { humidity: 20.4, waste_percent: 8.51 }, { humidity: 20.5, waste_percent: 8.62 },
      { humidity: 20.6, waste_percent: 8.74 }, { humidity: 20.7, waste_percent: 8.85 },
      { humidity: 20.8, waste_percent: 8.97 }, { humidity: 20.9, waste_percent: 9.08 },
      { humidity: 21.0, waste_percent: 9.20 }, { humidity: 21.1, waste_percent: 9.31 },
      { humidity: 21.2, waste_percent: 9.43 }, { humidity: 21.3, waste_percent: 9.54 },
      { humidity: 21.4, waste_percent: 9.66 }, { humidity: 21.5, waste_percent: 9.77 },
      { humidity: 21.6, waste_percent: 9.89 }, { humidity: 21.7, waste_percent: 10.00 },
      { humidity: 21.8, waste_percent: 10.11 }, { humidity: 21.9, waste_percent: 10.23 },
      { humidity: 22.0, waste_percent: 10.34 }, { humidity: 22.1, waste_percent: 10.46 },
      { humidity: 22.2, waste_percent: 10.57 }, { humidity: 22.3, waste_percent: 10.69 },
      { humidity: 22.4, waste_percent: 10.80 }, { humidity: 22.5, waste_percent: 10.92 },
      { humidity: 22.6, waste_percent: 11.03 }, { humidity: 22.7, waste_percent: 11.15 },
      { humidity: 22.8, waste_percent: 11.26 }, { humidity: 22.9, waste_percent: 11.38 },
      { humidity: 23.0, waste_percent: 11.49 }, { humidity: 23.1, waste_percent: 11.61 },
      { humidity: 23.2, waste_percent: 11.72 }, { humidity: 23.3, waste_percent: 11.84 },
      { humidity: 23.4, waste_percent: 11.95 }, { humidity: 23.5, waste_percent: 12.07 },
      { humidity: 23.6, waste_percent: 12.18 }, { humidity: 23.7, waste_percent: 12.30 },
      { humidity: 23.8, waste_percent: 12.41 }, { humidity: 23.9, waste_percent: 12.53 },
      { humidity: 24.0, waste_percent: 12.64 }, { humidity: 24.1, waste_percent: 12.76 },
      { humidity: 24.2, waste_percent: 12.87 }, { humidity: 24.3, waste_percent: 12.99 },
      { humidity: 24.4, waste_percent: 13.10 }, { humidity: 24.5, waste_percent: 13.22 },
      { humidity: 24.6, waste_percent: 13.33 }, { humidity: 24.7, waste_percent: 13.45 },
      { humidity: 24.8, waste_percent: 13.56 }, { humidity: 24.9, waste_percent: 13.68 },
      { humidity: 25.0, waste_percent: 13.79 }
    ]
  },

  // TRIGO - Base 14.0%, Manipuleo 0.10%
  trigo: {
    product: 'Trigo',
    base_humidity: 14.0,
    handling_waste: 0.10,
    entries: [
      { humidity: 14.1, waste_percent: 0.69 }, { humidity: 14.2, waste_percent: 0.81 },
      { humidity: 14.3, waste_percent: 0.92 }, { humidity: 14.4, waste_percent: 1.04 },
      { humidity: 14.5, waste_percent: 1.16 }, { humidity: 14.6, waste_percent: 1.27 },
      { humidity: 14.7, waste_percent: 1.39 }, { humidity: 14.8, waste_percent: 1.50 },
      { humidity: 14.9, waste_percent: 1.62 }, { humidity: 15.0, waste_percent: 1.73 },
      { humidity: 15.1, waste_percent: 1.85 }, { humidity: 15.2, waste_percent: 1.97 },
      { humidity: 15.3, waste_percent: 2.08 }, { humidity: 15.4, waste_percent: 2.20 },
      { humidity: 15.5, waste_percent: 2.31 }, { humidity: 15.6, waste_percent: 2.43 },
      { humidity: 15.7, waste_percent: 2.54 }, { humidity: 15.8, waste_percent: 2.66 },
      { humidity: 15.9, waste_percent: 2.77 }, { humidity: 16.0, waste_percent: 2.89 },
      { humidity: 16.1, waste_percent: 3.01 }, { humidity: 16.2, waste_percent: 3.12 },
      { humidity: 16.3, waste_percent: 3.24 }, { humidity: 16.4, waste_percent: 3.35 },
      { humidity: 16.5, waste_percent: 3.47 }, { humidity: 16.6, waste_percent: 3.58 },
      { humidity: 16.7, waste_percent: 3.70 }, { humidity: 16.8, waste_percent: 3.81 },
      { humidity: 16.9, waste_percent: 3.93 }, { humidity: 17.0, waste_percent: 4.05 },
      { humidity: 17.1, waste_percent: 4.16 }, { humidity: 17.2, waste_percent: 4.28 },
      { humidity: 17.3, waste_percent: 4.39 }, { humidity: 17.4, waste_percent: 4.51 },
      { humidity: 17.5, waste_percent: 4.62 }, { humidity: 17.6, waste_percent: 4.74 },
      { humidity: 17.7, waste_percent: 4.86 }, { humidity: 17.8, waste_percent: 4.97 },
      { humidity: 17.9, waste_percent: 5.09 }, { humidity: 18.0, waste_percent: 5.20 },
      { humidity: 18.1, waste_percent: 5.32 }, { humidity: 18.2, waste_percent: 5.43 },
      { humidity: 18.3, waste_percent: 5.55 }, { humidity: 18.4, waste_percent: 5.66 },
      { humidity: 18.5, waste_percent: 5.78 }, { humidity: 18.6, waste_percent: 5.90 },
      { humidity: 18.7, waste_percent: 6.01 }, { humidity: 18.8, waste_percent: 6.13 },
      { humidity: 18.9, waste_percent: 6.24 }, { humidity: 19.0, waste_percent: 6.36 },
      { humidity: 19.1, waste_percent: 6.47 }, { humidity: 19.2, waste_percent: 6.59 },
      { humidity: 19.3, waste_percent: 6.71 }, { humidity: 19.4, waste_percent: 6.82 },
      { humidity: 19.5, waste_percent: 6.94 }, { humidity: 19.6, waste_percent: 7.05 },
      { humidity: 19.7, waste_percent: 7.17 }, { humidity: 19.8, waste_percent: 7.28 },
      { humidity: 19.9, waste_percent: 7.40 }, { humidity: 20.0, waste_percent: 7.51 },
      { humidity: 20.1, waste_percent: 7.63 }, { humidity: 20.2, waste_percent: 7.75 },
      { humidity: 20.3, waste_percent: 7.86 }, { humidity: 20.4, waste_percent: 7.98 },
      { humidity: 20.5, waste_percent: 8.09 }, { humidity: 20.6, waste_percent: 8.21 },
      { humidity: 20.7, waste_percent: 8.32 }, { humidity: 20.8, waste_percent: 8.44 },
      { humidity: 20.9, waste_percent: 8.55 }, { humidity: 21.0, waste_percent: 8.67 },
      { humidity: 21.1, waste_percent: 8.79 }, { humidity: 21.2, waste_percent: 8.90 },
      { humidity: 21.3, waste_percent: 9.02 }, { humidity: 21.4, waste_percent: 9.13 },
      { humidity: 21.5, waste_percent: 9.25 }, { humidity: 21.6, waste_percent: 9.36 },
      { humidity: 21.7, waste_percent: 9.48 }, { humidity: 21.8, waste_percent: 9.60 },
      { humidity: 21.9, waste_percent: 9.71 }, { humidity: 22.0, waste_percent: 9.83 },
      { humidity: 22.1, waste_percent: 9.94 }, { humidity: 22.2, waste_percent: 10.06 },
      { humidity: 22.3, waste_percent: 10.17 }, { humidity: 22.4, waste_percent: 10.29 },
      { humidity: 22.5, waste_percent: 10.40 }, { humidity: 22.6, waste_percent: 10.52 },
      { humidity: 22.7, waste_percent: 10.64 }, { humidity: 22.8, waste_percent: 10.75 },
      { humidity: 22.9, waste_percent: 10.87 }, { humidity: 23.0, waste_percent: 10.98 },
      { humidity: 23.1, waste_percent: 11.10 }, { humidity: 23.2, waste_percent: 11.21 },
      { humidity: 23.3, waste_percent: 11.33 }, { humidity: 23.4, waste_percent: 11.45 },
      { humidity: 23.5, waste_percent: 11.56 }, { humidity: 23.6, waste_percent: 11.68 },
      { humidity: 23.7, waste_percent: 11.79 }, { humidity: 23.8, waste_percent: 11.91 },
      { humidity: 23.9, waste_percent: 12.02 }, { humidity: 24.0, waste_percent: 12.14 },
      { humidity: 24.1, waste_percent: 12.25 }, { humidity: 24.2, waste_percent: 12.37 },
      { humidity: 24.3, waste_percent: 12.49 }, { humidity: 24.4, waste_percent: 12.60 },
      { humidity: 24.5, waste_percent: 12.72 }, { humidity: 24.6, waste_percent: 12.83 },
      { humidity: 24.7, waste_percent: 12.95 }, { humidity: 24.8, waste_percent: 13.06 },
      { humidity: 24.9, waste_percent: 13.18 }, { humidity: 25.0, waste_percent: 13.29 }
    ]
  },

  // MAÍZ - Base 14.5%, Manipuleo 0.25%
  maiz: {
    product: 'Maíz',
    base_humidity: 14.5,
    handling_waste: 0.25,
    entries: [
      { humidity: 14.6, waste_percent: 1.27 }, { humidity: 14.7, waste_percent: 1.39 },
      { humidity: 14.8, waste_percent: 1.50 }, { humidity: 14.9, waste_percent: 1.62 },
      { humidity: 15.0, waste_percent: 1.73 }, { humidity: 15.1, waste_percent: 1.85 },
      { humidity: 15.2, waste_percent: 1.97 }, { humidity: 15.3, waste_percent: 2.08 },
      { humidity: 15.4, waste_percent: 2.20 }, { humidity: 15.5, waste_percent: 2.31 },
      { humidity: 15.6, waste_percent: 2.43 }, { humidity: 15.7, waste_percent: 2.54 },
      { humidity: 15.8, waste_percent: 2.66 }, { humidity: 15.9, waste_percent: 2.77 },
      { humidity: 16.0, waste_percent: 2.89 }, { humidity: 16.1, waste_percent: 3.01 },
      { humidity: 16.2, waste_percent: 3.12 }, { humidity: 16.3, waste_percent: 3.24 },
      { humidity: 16.4, waste_percent: 3.35 }, { humidity: 16.5, waste_percent: 3.47 },
      { humidity: 16.6, waste_percent: 3.58 }, { humidity: 16.7, waste_percent: 3.70 },
      { humidity: 16.8, waste_percent: 3.82 }, { humidity: 16.9, waste_percent: 3.93 },
      { humidity: 17.0, waste_percent: 4.05 }, { humidity: 17.1, waste_percent: 4.16 },
      { humidity: 17.2, waste_percent: 4.28 }, { humidity: 17.3, waste_percent: 4.39 },
      { humidity: 17.4, waste_percent: 4.51 }, { humidity: 17.5, waste_percent: 4.62 },
      { humidity: 17.6, waste_percent: 4.74 }, { humidity: 17.7, waste_percent: 4.86 },
      { humidity: 17.8, waste_percent: 4.97 }, { humidity: 17.9, waste_percent: 5.09 },
      { humidity: 18.0, waste_percent: 5.20 }, { humidity: 18.1, waste_percent: 5.32 },
      { humidity: 18.2, waste_percent: 5.43 }, { humidity: 18.3, waste_percent: 5.55 },
      { humidity: 18.4, waste_percent: 5.66 }, { humidity: 18.5, waste_percent: 5.78 },
      { humidity: 18.6, waste_percent: 5.90 }, { humidity: 18.7, waste_percent: 6.01 },
      { humidity: 18.8, waste_percent: 6.13 }, { humidity: 18.9, waste_percent: 6.24 },
      { humidity: 19.0, waste_percent: 6.36 }, { humidity: 19.1, waste_percent: 6.47 },
      { humidity: 19.2, waste_percent: 6.59 }, { humidity: 19.3, waste_percent: 6.71 },
      { humidity: 19.4, waste_percent: 6.82 }, { humidity: 19.5, waste_percent: 6.94 },
      { humidity: 19.6, waste_percent: 7.05 }, { humidity: 19.7, waste_percent: 7.17 },
      { humidity: 19.8, waste_percent: 7.28 }, { humidity: 19.9, waste_percent: 7.40 },
      { humidity: 20.0, waste_percent: 7.51 }, { humidity: 20.1, waste_percent: 7.63 },
      { humidity: 20.2, waste_percent: 7.75 }, { humidity: 20.3, waste_percent: 7.86 },
      { humidity: 20.4, waste_percent: 7.98 }, { humidity: 20.5, waste_percent: 8.09 },
      { humidity: 20.6, waste_percent: 8.21 }, { humidity: 20.7, waste_percent: 8.32 },
      { humidity: 20.8, waste_percent: 8.44 }, { humidity: 20.9, waste_percent: 8.55 },
      { humidity: 21.0, waste_percent: 8.67 }, { humidity: 21.1, waste_percent: 8.79 },
      { humidity: 21.2, waste_percent: 8.90 }, { humidity: 21.3, waste_percent: 9.02 },
      { humidity: 21.4, waste_percent: 9.13 }, { humidity: 21.5, waste_percent: 9.25 },
      { humidity: 21.6, waste_percent: 9.36 }, { humidity: 21.7, waste_percent: 9.48 },
      { humidity: 21.8, waste_percent: 9.60 }, { humidity: 21.9, waste_percent: 9.71 },
      { humidity: 22.0, waste_percent: 9.83 }, { humidity: 22.1, waste_percent: 9.94 },
      { humidity: 22.2, waste_percent: 10.06 }, { humidity: 22.3, waste_percent: 10.17 },
      { humidity: 22.4, waste_percent: 10.29 }, { humidity: 22.5, waste_percent: 10.40 },
      { humidity: 22.6, waste_percent: 10.52 }, { humidity: 22.7, waste_percent: 10.64 },
      { humidity: 22.8, waste_percent: 10.75 }, { humidity: 22.9, waste_percent: 10.87 },
      { humidity: 23.0, waste_percent: 10.98 }, { humidity: 23.1, waste_percent: 11.10 },
      { humidity: 23.2, waste_percent: 11.21 }, { humidity: 23.3, waste_percent: 11.33 },
      { humidity: 23.4, waste_percent: 11.45 }, { humidity: 23.5, waste_percent: 11.56 },
      { humidity: 23.6, waste_percent: 11.68 }, { humidity: 23.7, waste_percent: 11.79 },
      { humidity: 23.8, waste_percent: 11.91 }, { humidity: 23.9, waste_percent: 12.02 },
      { humidity: 24.0, waste_percent: 12.14 }, { humidity: 24.1, waste_percent: 12.25 },
      { humidity: 24.2, waste_percent: 12.37 }, { humidity: 24.3, waste_percent: 12.49 },
      { humidity: 24.4, waste_percent: 12.60 }, { humidity: 24.5, waste_percent: 12.72 },
      { humidity: 24.6, waste_percent: 12.83 }, { humidity: 24.7, waste_percent: 12.95 },
      { humidity: 24.8, waste_percent: 13.06 }, { humidity: 24.9, waste_percent: 13.18 },
      { humidity: 25.0, waste_percent: 13.29 }
    ]
  }
  ,

  // SORGO - Base 15.0%, Manipuleo 0.25%
  sorgo: {
    product: 'Sorgo',
    base_humidity: 15.0,
    handling_waste: 0.25,
    entries: [
      { humidity: 15.1, waste_percent: 1.85 }, { humidity: 15.2, waste_percent: 1.97 },
      { humidity: 15.3, waste_percent: 2.08 }, { humidity: 15.4, waste_percent: 2.20 },
      { humidity: 15.5, waste_percent: 2.31 }, { humidity: 15.6, waste_percent: 2.43 },
      { humidity: 15.7, waste_percent: 2.54 }, { humidity: 15.8, waste_percent: 2.66 },
      { humidity: 15.9, waste_percent: 2.77 }, { humidity: 16.0, waste_percent: 2.89 },
      { humidity: 16.1, waste_percent: 3.01 }, { humidity: 16.2, waste_percent: 3.12 },
      { humidity: 16.3, waste_percent: 3.24 }, { humidity: 16.4, waste_percent: 3.35 },
      { humidity: 16.5, waste_percent: 3.47 }, { humidity: 16.6, waste_percent: 3.58 },
      { humidity: 16.7, waste_percent: 3.70 }, { humidity: 16.8, waste_percent: 3.82 },
      { humidity: 16.9, waste_percent: 3.93 }, { humidity: 17.0, waste_percent: 4.05 },
      { humidity: 17.1, waste_percent: 4.16 }, { humidity: 17.2, waste_percent: 4.28 },
      { humidity: 17.3, waste_percent: 4.39 }, { humidity: 17.4, waste_percent: 4.51 },
      { humidity: 17.5, waste_percent: 4.62 }, { humidity: 17.6, waste_percent: 4.74 },
      { humidity: 17.7, waste_percent: 4.86 }, { humidity: 17.8, waste_percent: 4.97 },
      { humidity: 17.9, waste_percent: 5.09 }, { humidity: 18.0, waste_percent: 5.20 },
      { humidity: 18.1, waste_percent: 5.32 }, { humidity: 18.2, waste_percent: 5.43 },
      { humidity: 18.3, waste_percent: 5.55 }, { humidity: 18.4, waste_percent: 5.66 },
      { humidity: 18.5, waste_percent: 5.78 }, { humidity: 18.6, waste_percent: 5.90 },
      { humidity: 18.7, waste_percent: 6.01 }, { humidity: 18.8, waste_percent: 6.13 },
      { humidity: 18.9, waste_percent: 6.24 }, { humidity: 19.0, waste_percent: 6.36 },
      { humidity: 19.1, waste_percent: 6.47 }, { humidity: 19.2, waste_percent: 6.59 },
      { humidity: 19.3, waste_percent: 6.71 }, { humidity: 19.4, waste_percent: 6.82 },
      { humidity: 19.5, waste_percent: 6.94 }, { humidity: 19.6, waste_percent: 7.05 },
      { humidity: 19.7, waste_percent: 7.17 }, { humidity: 19.8, waste_percent: 7.28 },
      { humidity: 19.9, waste_percent: 7.40 }, { humidity: 20.0, waste_percent: 7.51 },
      { humidity: 20.1, waste_percent: 7.63 }, { humidity: 20.2, waste_percent: 7.75 },
      { humidity: 20.3, waste_percent: 7.86 }, { humidity: 20.4, waste_percent: 7.98 },
      { humidity: 20.5, waste_percent: 8.09 }, { humidity: 20.6, waste_percent: 8.21 },
      { humidity: 20.7, waste_percent: 8.32 }, { humidity: 20.8, waste_percent: 8.44 },
      { humidity: 20.9, waste_percent: 8.55 }, { humidity: 21.0, waste_percent: 8.67 },
      { humidity: 21.1, waste_percent: 8.79 }, { humidity: 21.2, waste_percent: 8.90 },
      { humidity: 21.3, waste_percent: 9.02 }, { humidity: 21.4, waste_percent: 9.13 },
      { humidity: 21.5, waste_percent: 9.25 }, { humidity: 21.6, waste_percent: 9.36 },
      { humidity: 21.7, waste_percent: 9.48 }, { humidity: 21.8, waste_percent: 9.60 },
      { humidity: 21.9, waste_percent: 9.71 }, { humidity: 22.0, waste_percent: 9.83 },
      { humidity: 22.1, waste_percent: 9.94 }, { humidity: 22.2, waste_percent: 10.06 },
      { humidity: 22.3, waste_percent: 10.17 }, { humidity: 22.4, waste_percent: 10.29 },
      { humidity: 22.5, waste_percent: 10.40 }, { humidity: 22.6, waste_percent: 10.52 },
      { humidity: 22.7, waste_percent: 10.64 }, { humidity: 22.8, waste_percent: 10.75 },
      { humidity: 22.9, waste_percent: 10.87 }, { humidity: 23.0, waste_percent: 10.98 },
      { humidity: 23.1, waste_percent: 11.10 }, { humidity: 23.2, waste_percent: 11.21 },
      { humidity: 23.3, waste_percent: 11.33 }, { humidity: 23.4, waste_percent: 11.45 },
      { humidity: 23.5, waste_percent: 11.56 }, { humidity: 23.6, waste_percent: 11.68 },
      { humidity: 23.7, waste_percent: 11.79 }, { humidity: 23.8, waste_percent: 11.91 },
      { humidity: 23.9, waste_percent: 12.02 }, { humidity: 24.0, waste_percent: 12.14 },
      { humidity: 24.1, waste_percent: 12.25 }, { humidity: 24.2, waste_percent: 12.37 },
      { humidity: 24.3, waste_percent: 12.49 }, { humidity: 24.4, waste_percent: 12.60 },
      { humidity: 24.5, waste_percent: 12.72 }, { humidity: 24.6, waste_percent: 12.83 },
      { humidity: 24.7, waste_percent: 12.95 }, { humidity: 24.8, waste_percent: 13.06 },
      { humidity: 24.9, waste_percent: 13.18 }, { humidity: 25.0, waste_percent: 13.29 }
    ]
  },

  // GIRASOL - Base 11.0%, Manipuleo 0.20%
  girasol: {
    product: 'Girasol',
    base_humidity: 11.0,
    handling_waste: 0.20,
    entries: [
      { humidity: 11.1, waste_percent: 0.67 }, { humidity: 11.2, waste_percent: 0.78 },
      { humidity: 11.3, waste_percent: 0.89 }, { humidity: 11.4, waste_percent: 1.01 },
      { humidity: 11.5, waste_percent: 1.12 }, { humidity: 11.6, waste_percent: 1.23 },
      { humidity: 11.7, waste_percent: 1.34 }, { humidity: 11.8, waste_percent: 1.45 },
      { humidity: 11.9, waste_percent: 1.56 }, { humidity: 12.0, waste_percent: 1.68 },
      { humidity: 12.1, waste_percent: 1.79 }, { humidity: 12.2, waste_percent: 1.90 },
      { humidity: 12.3, waste_percent: 2.01 }, { humidity: 12.4, waste_percent: 2.12 },
      { humidity: 12.5, waste_percent: 2.23 }, { humidity: 12.6, waste_percent: 2.35 },
      { humidity: 12.7, waste_percent: 2.46 }, { humidity: 12.8, waste_percent: 2.57 },
      { humidity: 12.9, waste_percent: 2.68 }, { humidity: 13.0, waste_percent: 2.79 },
      { humidity: 13.1, waste_percent: 2.91 }, { humidity: 13.2, waste_percent: 3.02 },
      { humidity: 13.3, waste_percent: 3.13 }, { humidity: 13.4, waste_percent: 3.24 },
      { humidity: 13.5, waste_percent: 3.35 }, { humidity: 13.6, waste_percent: 3.46 },
      { humidity: 13.7, waste_percent: 3.58 }, { humidity: 13.8, waste_percent: 3.69 },
      { humidity: 13.9, waste_percent: 3.80 }, { humidity: 14.0, waste_percent: 3.91 },
      { humidity: 14.1, waste_percent: 4.02 }, { humidity: 14.2, waste_percent: 4.13 },
      { humidity: 14.3, waste_percent: 4.25 }, { humidity: 14.4, waste_percent: 4.36 },
      { humidity: 14.5, waste_percent: 4.47 }, { humidity: 14.6, waste_percent: 4.58 },
      { humidity: 14.7, waste_percent: 4.69 }, { humidity: 14.8, waste_percent: 4.80 },
      { humidity: 14.9, waste_percent: 4.92 }, { humidity: 15.0, waste_percent: 5.03 },
      { humidity: 15.1, waste_percent: 5.14 }, { humidity: 15.2, waste_percent: 5.25 },
      { humidity: 15.3, waste_percent: 5.36 }, { humidity: 15.4, waste_percent: 5.47 },
      { humidity: 15.5, waste_percent: 5.59 }, { humidity: 15.6, waste_percent: 5.70 },
      { humidity: 15.7, waste_percent: 5.81 }, { humidity: 15.8, waste_percent: 5.92 },
      { humidity: 15.9, waste_percent: 6.03 }, { humidity: 16.0, waste_percent: 6.15 },
      { humidity: 16.1, waste_percent: 6.26 }, { humidity: 16.2, waste_percent: 6.37 },
      { humidity: 16.3, waste_percent: 6.48 }, { humidity: 16.4, waste_percent: 6.59 },
      { humidity: 16.5, waste_percent: 6.70 }, { humidity: 16.6, waste_percent: 6.82 },
      { humidity: 16.7, waste_percent: 6.93 }, { humidity: 16.8, waste_percent: 7.04 },
      { humidity: 16.9, waste_percent: 7.15 }, { humidity: 17.0, waste_percent: 7.26 },
      { humidity: 17.1, waste_percent: 7.37 }, { humidity: 17.2, waste_percent: 7.49 },
      { humidity: 17.3, waste_percent: 7.60 }, { humidity: 17.4, waste_percent: 7.71 },
      { humidity: 17.5, waste_percent: 7.82 }, { humidity: 17.6, waste_percent: 7.93 },
      { humidity: 17.7, waste_percent: 8.04 }, { humidity: 17.8, waste_percent: 8.16 },
      { humidity: 17.9, waste_percent: 8.27 }, { humidity: 18.0, waste_percent: 8.38 },
      { humidity: 18.1, waste_percent: 8.49 }, { humidity: 18.2, waste_percent: 8.60 },
      { humidity: 18.3, waste_percent: 8.72 }, { humidity: 18.4, waste_percent: 8.83 },
      { humidity: 18.5, waste_percent: 8.94 }, { humidity: 18.6, waste_percent: 9.05 },
      { humidity: 18.7, waste_percent: 9.16 }, { humidity: 18.8, waste_percent: 9.27 },
      { humidity: 18.9, waste_percent: 9.39 }, { humidity: 19.0, waste_percent: 9.50 },
      { humidity: 19.1, waste_percent: 9.61 }, { humidity: 19.2, waste_percent: 9.72 },
      { humidity: 19.3, waste_percent: 9.83 }, { humidity: 19.4, waste_percent: 9.94 },
      { humidity: 19.5, waste_percent: 10.06 }, { humidity: 19.6, waste_percent: 10.17 },
      { humidity: 19.7, waste_percent: 10.28 }, { humidity: 19.8, waste_percent: 10.39 },
      { humidity: 19.9, waste_percent: 10.50 }, { humidity: 20.0, waste_percent: 10.61 },
      { humidity: 20.1, waste_percent: 10.73 }, { humidity: 20.2, waste_percent: 10.84 },
      { humidity: 20.3, waste_percent: 10.95 }, { humidity: 20.4, waste_percent: 11.06 },
      { humidity: 20.5, waste_percent: 11.17 }, { humidity: 20.6, waste_percent: 11.28 },
      { humidity: 20.7, waste_percent: 11.40 }, { humidity: 20.8, waste_percent: 11.51 },
      { humidity: 20.9, waste_percent: 11.62 }, { humidity: 21.0, waste_percent: 11.73 },
      { humidity: 21.1, waste_percent: 11.84 }, { humidity: 21.2, waste_percent: 11.96 },
      { humidity: 21.3, waste_percent: 12.07 }, { humidity: 21.4, waste_percent: 12.18 },
      { humidity: 21.5, waste_percent: 12.29 }, { humidity: 21.6, waste_percent: 12.40 },
      { humidity: 21.7, waste_percent: 12.51 }, { humidity: 21.8, waste_percent: 12.63 },
      { humidity: 21.9, waste_percent: 12.74 }, { humidity: 22.0, waste_percent: 12.85 },
      { humidity: 22.1, waste_percent: 12.96 }, { humidity: 22.2, waste_percent: 13.07 },
      { humidity: 22.3, waste_percent: 13.18 }, { humidity: 22.4, waste_percent: 13.30 },
      { humidity: 22.5, waste_percent: 13.41 }, { humidity: 22.6, waste_percent: 13.52 },
      { humidity: 22.7, waste_percent: 13.63 }, { humidity: 22.8, waste_percent: 13.74 },
      { humidity: 22.9, waste_percent: 13.85 }, { humidity: 23.0, waste_percent: 13.97 },
      { humidity: 23.1, waste_percent: 14.08 }, { humidity: 23.2, waste_percent: 14.19 },
      { humidity: 23.3, waste_percent: 14.30 }, { humidity: 23.4, waste_percent: 14.41 },
      { humidity: 23.5, waste_percent: 14.53 }, { humidity: 23.6, waste_percent: 14.64 },
      { humidity: 23.7, waste_percent: 14.75 }, { humidity: 23.8, waste_percent: 14.86 },
      { humidity: 23.9, waste_percent: 14.97 }, { humidity: 24.0, waste_percent: 15.08 },
      { humidity: 24.1, waste_percent: 15.20 }, { humidity: 24.2, waste_percent: 15.31 },
      { humidity: 24.3, waste_percent: 15.42 }, { humidity: 24.4, waste_percent: 15.53 },
      { humidity: 24.5, waste_percent: 15.64 }, { humidity: 24.6, waste_percent: 15.75 },
      { humidity: 24.7, waste_percent: 15.87 }, { humidity: 24.8, waste_percent: 15.98 },
      { humidity: 24.9, waste_percent: 16.09 }, { humidity: 25.0, waste_percent: 16.20 }
    ]
  }
};

// Helper para buscar merma con redondeo al siguiente 0.1%
export function getMoistureWaste(
  grain: string,
  humidity: number
): { drying_waste: number; handling_waste: number; total_waste: number } | null {

  const table = MOISTURE_TABLES[grain.toLowerCase()];
  if (!table) return null;

  // Si humedad <= base, no hay merma
  if (humidity <= table.base_humidity) {
    return {
      drying_waste: 0,
      handling_waste: 0,
      total_waste: 0
    };
  }

  // Redondear al siguiente 0.1% (regla: 15.05 → 15.1)
  const roundedHumidity = Math.ceil(humidity * 10) / 10;

  // Buscar en tabla
  const entry = table.entries.find(e => e.humidity === roundedHumidity);

  if (!entry) {
    // Si no está en tabla, usar el último valor disponible
    const lastEntry = table.entries[table.entries.length - 1];
    return {
      drying_waste: lastEntry.waste_percent,
      handling_waste: table.handling_waste,
      total_waste: lastEntry.waste_percent + table.handling_waste
    };
  }

  return {
    drying_waste: entry.waste_percent,
    handling_waste: table.handling_waste,
    total_waste: entry.waste_percent + table.handling_waste
  };
}

export default MOISTURE_TABLES;
