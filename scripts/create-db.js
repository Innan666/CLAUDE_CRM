const { Client } = require('pg');

async function createDatabase() {
  // Connect to default postgres database
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123123',
    database: 'postgres'
  });

  try {
    await client.connect();

    // Check if database exists
    const res = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'salesflow'"
    );

    if (res.rows.length === 0) {
      await client.query('CREATE DATABASE salesflow');
      console.log('Database salesflow created successfully!');
    } else {
      console.log('Database salesflow already exists.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

createDatabase();
