import { DatabaseService, DatabaseConfig } from './database-interface';
import { SqliteDatabaseService } from './sqlite-database';
import { PostgresDatabaseService } from './postgres-database';

export class DatabaseFactory {
  static createDatabase(config: DatabaseConfig): DatabaseService {
    switch (config.type) {
      case 'sqlite':
        if (!config.filePath) {
          throw new Error('SQLite database requires filePath');
        }
        return new SqliteDatabaseService(config.filePath);
      
      case 'postgresql':
        if (!config.connectionString) {
          throw new Error('PostgreSQL database requires connectionString');
        }
        return new PostgresDatabaseService(config.connectionString);
      
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }

  static createFromEnvironment(): DatabaseService {
    const dbUrl = process.env.DB_URL;
    
    if (!dbUrl) {
      // Fallback to SQLite for backward compatibility
      return new SqliteDatabaseService('./indexer.db');
    }

    if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
      return new PostgresDatabaseService(dbUrl);
    } else if (dbUrl.endsWith('.db') || dbUrl.endsWith('.sqlite')) {
      return new SqliteDatabaseService(dbUrl);
    } else {
      throw new Error(`Unsupported database URL format: ${dbUrl}`);
    }
  }
}
