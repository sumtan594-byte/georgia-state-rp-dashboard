import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db0.fps.ms',
  user: process.env.DB_USER || 'u70223_eY1Luivp9c',
  password: process.env.DB_PASSWORD || 'fp+9sN..uudmcE52lSlv.KNe',
  database: process.env.DB_NAME || 's70223_Bots',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

export default pool;
