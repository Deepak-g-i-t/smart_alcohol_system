const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

const connectMySQL = () => {
    try {
        pool = mysql.createPool({
            host: process.env.MYSQL_HOST || 'localhost',
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || '',
            database: process.env.MYSQL_DB || 'smart_alcohol_system',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        console.log('MySQL Connected');
    } catch (err) {
        console.error('MySQL Connection Error: ', err.message);
        process.exit(1);
    }
};

const getPool = () => pool;

module.exports = { connectMySQL, getPool };
