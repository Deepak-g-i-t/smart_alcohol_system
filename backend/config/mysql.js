const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

const connectMySQL = async () => {
    pool = mysql.createPool({
        host:             process.env.MYSQL_HOST     || 'localhost',
        port:             parseInt(process.env.MYSQL_PORT) || 3306,
        user:             process.env.MYSQL_USER     || 'root',
        password:         process.env.MYSQL_PASSWORD || '',
        database:         process.env.MYSQL_DB       || 'smart_alcohol_system',
        waitForConnections: true,
        connectionLimit:  10,
        queueLimit:       0,
    });

    // Test the connection immediately so we fail fast on bad credentials
    const conn = await pool.getConnection();
    conn.release();
    console.log('MySQL Connected');
};

const getPool = () => {
    if (!pool) throw new Error('MySQL pool not initialized — call connectMySQL() first');
    return pool;
};

module.exports = { connectMySQL, getPool };
