declare module '@prisma/client' {
  type PrismaAction =
    | 'findUnique' | 'findFirst' | 'findMany'
    | 'create' | 'createMany' | 'update' | 'updateMany'
    | 'upsert' | 'delete' | 'deleteMany' | 'count' | 'aggregate'

  type PrismaClientKnownRequestError = Error & { code: string; meta?: any }
  type PrismaClientValidationError = Error

  export class PrismaClient {
    constructor(options?: { datasources?: { db?: { url?: string } }; log?: ('query' | 'info' | 'warn' | 'error')[] })
    $connect(): Promise<void>
    $disconnect(): Promise<void>
    $on(event: string, callback: (event: any) => void): void
    $use(callback: (params: any, next: (params: any) => Promise<any>) => Promise<any>): void

    user: PrismaDelegate
    device: PrismaDelegate
    location: PrismaDelegate
  }

  interface PrismaDelegate {
    findUnique(args: any): Promise<any>
    findFirst(args: any): Promise<any>
    findMany(args?: any): Promise<any[]>
    create(args: any): Promise<any>
    createMany(args: any): Promise<any>
    update(args: any): Promise<any>
    delete(args: any): Promise<any>
    deleteMany(args: any): Promise<any>
    count(args?: any): Promise<number>
    findFirstOrThrow(args: any): Promise<any>
  }

  export type PrismaPromise<T> = Promise<T>
}
