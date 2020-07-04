const {
    Client
} = require('pg')

var pgp = require('./postgresTest');

pgp.run();
































async function main() {
    const client = new Client({
        user: 'postgres',
        host: 'countdown-app.ctzuovwkz3jn.ap-south-1.rds.amazonaws.com',
        database: 'postgres',
        password: 'Angara61^',
        port: 5432,
    })
    try {
        await client.connect()
        const res = await client.query('SELECT column_name FROM information_schema.columns where table_schema = public', [])
        console.log(res.rows[0]) // Hello world!
        await client.end()
    } catch (e) {
        console.error(e);
    }
}
const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}
async function RemoveDoubleQuotesFromTableAndColumns() {
    // get all the table list 
    console.log("running");
    const client = new Client({
        user: 'postgres',
        host: 'countdown-app.ctzuovwkz3jn.ap-south-1.rds.amazonaws.com',
        database: 'postgres',
        password: 'Angara61^',
        port: 5432,
    })
    await client.connect();
    var tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    tables = tables["rows"];
    console.log("TABLES " + JSON.stringify(tables));
    for (var tab in tables) {
        let table = tables[tab]["table_name"];
        console.log(table + " Table");
        // try to remove quotes from table name 
        try {
            await client.query(`ALTER TABLE "${table}" RENAME TO ${table}`);
        } catch (Exception) {
            console.log("first " + Exception + "\n" + JSON.stringify(Exception));
            /* table may not have quotes */
        }

        // get all the columns under the table
        var columns;
        try {
            columns = await client.query('SELECT column_name FROM information_schema.columns where table_name = $1', [table]);
            columns = columns["rows"];
        } catch (e) {
            console.log("second " + e);
        }
        for (var col in columns) {
            column = columns[col]["column_name"];
            console.log(column + " COLUMN");
            try {
                await client.query(`ALTER TABLE ${table} RENAME COLUMN "${column}" TO ${column}`);
            } catch (Exception) {
                console.log("third " + Exception + "\n" + JSON.stringify(Exception));
                /* column may not have quotes */
            }
            await sleep(20); // a little delay for avoiding execution problems
        }
    }

    await client.end();
}