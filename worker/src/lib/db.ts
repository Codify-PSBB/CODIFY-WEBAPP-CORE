export type QueryParam = string | number | boolean | null | Uint8Array | ArrayBuffer;
export type QueryParams = ReadonlyArray<QueryParam>;

export interface QueryInput {
  sql: string;
  params?: QueryParams;
}

export interface DbClient {
  all<T>(sql: string, params?: QueryParams): Promise<T[]>;
  first<T>(sql: string, params?: QueryParams): Promise<T | null>;
  run(sql: string, params?: QueryParams): Promise<D1Result>;
  batch(queries: QueryInput[]): Promise<D1Result[]>;
}

function normalizeParams(params: QueryParams = []): unknown[] {
  return params.map((value) => {
    if (typeof value === "boolean") {
      return value ? 1 : 0;
    }

    return value;
  });
}

function prepare(db: D1Database, sql: string, params: QueryParams = []): D1PreparedStatement {
  const statement = db.prepare(sql);
  const normalized = normalizeParams(params);

  if (normalized.length === 0) {
    return statement;
  }

  return statement.bind(...normalized);
}

export function createDbClient(db: D1Database): DbClient {
  return {
    async all<T>(sql: string, params: QueryParams = []): Promise<T[]> {
      const result = await prepare(db, sql, params).all<T>();
      return result.results ?? [];
    },

    async first<T>(sql: string, params: QueryParams = []): Promise<T | null> {
      const row = await prepare(db, sql, params).first<T>();
      return row ?? null;
    },

    async run(sql: string, params: QueryParams = []): Promise<D1Result> {
      return prepare(db, sql, params).run();
    },

    async batch(queries: QueryInput[]): Promise<D1Result[]> {
      const statements = queries.map((query) => prepare(db, query.sql, query.params ?? []));
      return db.batch(statements);
    }
  };
}
