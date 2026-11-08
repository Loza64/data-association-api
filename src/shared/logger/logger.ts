import debug from 'debug';

export const serverLog = debug('nodets:[server]');
export const swaggerLog = debug('nodets:[swagger]');
export const errorLog = debug('nodets:[error]');
export const databaseLog = debug('nodets:[database]');
export const authLog = debug('nodets:[auth]');
