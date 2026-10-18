import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

function readBooleanEnvironmentVariable(name: string, defaultValue: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === undefined || value === '') return defaultValue;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be either true or false`);
}

function isLoopback(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return host === 'localhost' || host === '127.0.0.1';
}

function readDatabaseUrl(): URL {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not configured');

  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid database URL');
  }

  if (!['mysql:', 'mariadb:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must use the mysql: or mariadb: protocol');
  }

  if (!url.hostname || !decodeURIComponent(url.pathname.slice(1))) {
    throw new Error('DATABASE_URL must include a host and database name');
  }

  return url;
}

export function getMariaDbConnectionDiagnostics() {
  const url = readDatabaseUrl();
  return {
    host: url.hostname,
    tlsEnabled: readBooleanEnvironmentVariable('DATABASE_SSL', true),
  };
}

/**
 * Creates the single MariaDB adapter configuration shared by the app and seeds.
 * TLS verification is enabled by default. Disabling TLS and requesting an RSA
 * key are restricted to explicit local development settings on loopback.
 */
export function createMariaDbAdapter() {
  const url = readDatabaseUrl();
  const database = decodeURIComponent(url.pathname.slice(1));
  const tlsEnabled = readBooleanEnvironmentVariable('DATABASE_SSL', true);
  const allowPublicKeyRetrieval = readBooleanEnvironmentVariable(
    'DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL',
    false,
  );
  const isLocalDevelopment = process.env.NODE_ENV === 'development' && isLoopback(url.hostname);

  if (!tlsEnabled && !isLocalDevelopment) {
    throw new Error('DATABASE_SSL=false is allowed only in development with DATABASE_URL host localhost or 127.0.0.1');
  }

  if (allowPublicKeyRetrieval && !isLocalDevelopment) {
    throw new Error(
      'DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL=true is allowed only in development with DATABASE_URL host localhost or 127.0.0.1',
    );
  }

  const caPath = tlsEnabled ? process.env.DATABASE_SSL_CA?.trim() : undefined;
  const ca = caPath ? readFileSync(resolve(caPath), 'utf8') : undefined;
  const cachingRsaPublicKey = process.env.DATABASE_CACHING_RSA_PUBLIC_KEY?.trim();

  if (cachingRsaPublicKey && !isLocalDevelopment) {
    throw new Error(
      'DATABASE_CACHING_RSA_PUBLIC_KEY is allowed only in development with DATABASE_URL host localhost or 127.0.0.1',
    );
  }

  console.info(
    `[database] adapter configured host=${url.hostname} tls=${tlsEnabled ? 'enabled' : 'disabled'}`,
  );

  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    ...(tlsEnabled
      ? {
          ssl: {
            rejectUnauthorized: true,
            ...(ca ? { ca } : {}),
          },
        }
      : {}),
    ...(cachingRsaPublicKey ? { cachingRsaPublicKey } : {}),
    ...(allowPublicKeyRetrieval && !cachingRsaPublicKey
      ? { allowPublicKeyRetrieval: true }
      : {}),
    connectionLimit: 5,
  });
}
