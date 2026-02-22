/**
 * Base Repository
 * Funcionalidad común para todos los repositorios
 */

import { PrismaClient } from '@prisma/client';

export abstract class BaseRepository<T> {
  protected prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Crear una nueva entidad
   */
  abstract create(data: any): Promise<T>;

  /**
   * Buscar por ID
   */
  abstract findById(id: string): Promise<T | null>;

  /**
   * Actualizar
   */
  abstract update(id: string, data: any): Promise<T>;

  /**
   * Eliminar
   */
  abstract delete(id: string): Promise<void>;

  /**
   * Listar todos
   */
  abstract findAll(filters?: any): Promise<T[]>;
}

export default BaseRepository;
