const {
    Client
} = require('pg')

/* var newCountdown_Object = {
    "ID": generateUUID(),
    "UID": token.uid,
    "Username": token.email,
    "Title": input_obj.Title,
    "Description": input_obj.Description,
    "TAG": input_obj.TAG,
    "Expired": input_obj.Expired,
    "Premium": input_obj.Premium,
    "Status": input_obj.Status,
    "Timestamp": Date.now().toString()
}; */

class PostgresConnector {
    constructor() {
        this.initClient();
    }

    sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    initClient() {
        this.client = new Client({
            user: 'postgres',
            host: 'countdown-app.ctzuovwkz3jn.ap-south-1.rds.amazonaws.com',
            database: 'postgres',
            password: 'Angara61^',
            port: 5432,
        });
        this.ended = false;
    }

    async makeConnection() {
        if (this.ended) this.initClient();
        // console.log(`${JSON.stringify(this.client)}`);
        console.log("Establishing connection");
        try {
            await this.client.connect();
            return true;
        } catch (e) {
            console.log(`Client connection error `)
            this.ended = true;
            return false;
        }
    }

    getConnection() {
        return this.client;
    }

    async endConnection() {
        console.log("Closing connection");
        try {
            await this.client.end();
            this.ended = true;
            return true;
        } catch (e) {
            console.log(`Client closing error `);
            this.ended = true;
            return false;
        }
    }

    async test() {
        try {
            for (var i = 0; i < 10; i++) {
                console.log(`Connecting ${i}th time`);
                await this.makeConnection();
                await sleep(200);
                await this.endConnection();
            }
        } catch (ConnectionError) {
            console.log(`connection error`);
            return;
        }
    }
}

class CountdownData {
    constructor({
        id = 0,
        uid,
        final_timestamp = Date.now(),
        deleted = false,
        tags = ["placeholder", "tag"],
        username,
        title = "placeholderTitle",
        description = "placeholderDescription",
        expired = Date.now() + 600000,
        premium = false,
        status = "private",
        timestamp = Date.now(),
    } = {}) {
        this.uid = uid;
        this.username = username;
        this.title = title;
        this.description = description;
        this.expired = expired;
        this.premium = premium;
        this.status = status;
        this.timestamp = timestamp;
        this.id = id;
        this.final_timestamp = final_timestamp;
        this.deleted = deleted;
        this.tags = tags;
        this.inserted = false;
    }

    get toObject() {
        let obj = {};
        obj.uid = this.uid;
        obj.username = this.username;
        obj.title = this.title;
        obj.description = this.description;
        obj.expired = this.expired;
        obj.premium = this.premium;
        obj.status = this.status;
        obj.timestamp = this.timestamp;
        obj.id = this.id;
        obj.final_timestamp = this.final_timestamp;
        obj.deleted = this.deleted;
        obj.tags = this.tags;
        return obj;
    }


    set isInserted(x) {
        this.inserted = x;
    }

    get isInserted() {
        return this.inserted;
    }

}

class CountdownQuery extends PostgresConnector {
    constructor() {
        super();
        this.tableName = "Countdown_Main";
    }

    constructor(client)
    {
        this.client = client;
        this.tableName = "Countdown_Main";
    }

    async start() {
        await this.makeConnection();
        return this;
    }

    async dispose() {
        await this.endConnection();
        return this;
    }

    //create
    async insertCountdown(cd) {
        if (cd.isInserted) throw {
            error: "9",
            message: "Already inserted"
        };
        let response;
        try {
            response = await this.client.query(`INSERT INTO ${this.tableName} (uid,username,title,description,expired,premium,status,timestamp,final_timestamp,deleted,tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11);`,
                [cd.uid, cd.username, cd.title, cd.description, cd.expired, cd.premium, cd.status, cd.timestamp, cd.final_timestamp, cd.deleted, cd.tags]);
        } catch (e) {
            console.log(`Insert Error ${e}`);
        }

        console.log(`Response is ${JSON.stringify(response)}`);
        return response;
    }
    //get
    async getAllCountdowns() {
        try {
            let response = await this.client.query({
                text: 'SELECT * FROM countdown_main',
            }, []);

            var countdowns = this.decodeRow({
                rows: response.rows,
                isArray: true
            });
            // if (!(countdowns instanceof Array)) {
            //     console.log(`${JSON.stringify(countdowns)} yee`);
            //     return countdowns;
            // }
            countdowns.forEach((countdown) => {
                console.log(`${JSON.stringify(countdown)} ye`)
            })

            return countdowns;

        } catch (e) {
            console.log(`getAllCountdowns query error ${e}`);
            throw e;
        }
    }

    decodeRow({
        rows,
        isArray = Array.isArray
    }) {
        var countdowns = [];
        rows.forEach((row) => {
            let x = new CountdownData(row).toObject;
            x.isInserted = true;
            countdowns.push(x);
        });

        if (countdowns.length == 0) {
            console.log("no items");
            return [];
        }

        if (countdowns.length > 1 || isArray) return countdowns;
        else return countdowns[0];
    }

    test() {
        return this.getAllCountdowns();
    }

    async getCountdownById({
        id
    }) {
        try {
            let response = await this.client.query({
                text: 'SELECT * FROM countdown_main WHERE ID=$1 LIMIT 1',
            }, [id]);

            var countdowns = this.decodeRow({
                rows: response.rows,
                isArray: true
            });

            countdowns.forEach((countdown) => {
                console.log(`${JSON.stringify(countdown)} by id ${id}`)
            })

            return countdowns;

        } catch (e) {
            console.log(`getAllCountdowns query error ${e}`);
            throw e;
            this.getCountdownsSortedAndFilteredPaginatedByUser()
        }
    }

    //can order by title,description
    async getCountdownsSorted({
        orderBy = "title",
        removeDeleted = true,
        username = null,
        removeExpired = false,
    }) {

        let whereQuery = ` where `;

        //generate whereQuery
        {
            let conditions = 0;
            if (username != null) {
                if (conditions > 0) whereQuery += "and ";
                whereQuery += `username=${username} `;
                conditions++;
            }

            if (removeDeleted) {
                if (conditions > 0) whereQuery += "and ";
                whereQuery += `deleted=false `;
                conditions++;
            }
            if (removeExpired) {
                if (conditions > 0) whereQuery += "and ";
                whereQuery += `expired > EXTRACT(EPOCH FROM TIMESTAMP 'now') * 1000 `;
                conditions++;
            }

            if (conditions == 0) whereQuery = ' ';
        }

        try {
            let response = await this.client.query({
                text: `SELECT * FROM countdown_main${whereQuery}ORDER BY $1`,
            }, [orderBy, ]);

            var countdowns = this.decodeRow({
                rows: response.rows,
                isArray: true
            });
            // if (!(countdowns instanceof Array)) {
            //     console.log(`${JSON.stringify(countdowns)} yee`);
            //     return countdowns;
            // }
            countdowns.forEach((countdown) => {
                console.log(`${JSON.stringify(countdown)} ye`)
            })

            return countdowns;

        } catch (e) {
            console.log(`getAllCountdowns query error ${e}`);
            throw e;
        }
    }

    //only for user countdowns (getByUid)
    //filter by deleted, expired, status, title?, tag? (search) 
    /**
     * [get all countdowns for a particular user, sort using (orderBy,asc), filter using (removeDeleted,removeExpired,status,searchKeyword,searchIn), specify limit default:5, prevKey for pagination]
     * @return {data:[CountdownData],paginateKey:{type,key,id}}      [CountdownData type is returned which bears a countdown]
     */
    async getCountdownsSortedAndFilteredPaginatedByUser(uid, {

        //ORDERING 
        orderBy = "title",
        asc = true,
        //PREVIOUS KEY FOR PAGINATION
        prevKey = null, // object with type,id,key
        //LIMIT ITEMS
        limit = 5,
        //FILTER EXPRESSIONS
        removeDeleted = true, //null -> with Deleted, false -> only Deleted, true -> remove Deleted
        removeExpired = false, //null -> with Expired, false -> remove Expired, true -> only Expired
        status = null, // null -> private and public, 'private', 'public', 'waiting'
        searchKeyword = null, //searches in title and tag.
        searchIn = "tags&title", //title2,tag2,titags2
    }) {

        let whereQuery = ` where `;
        let searchCases = ["title", "tags", "title&tags", "tags&title"];

        //TODO: define pagination for all possible orderBy types
        //PRECONDITION CHECK, wrapper:orderBy,prevKey,status
        {
            let possibleOrderByCases = ["expired", "timestamp", "title", "status"];
            if (possibleOrderByCases.indexOf(orderBy) == -1) throw {
                error: "12",
                message: "ORDERING_COLUMN_INVALID"
            };
            if (prevKey != null) {

                if (!prevKey.type) throw {
                    error: "13",
                    message: "PAGINATE_KEY_TYPE_INVALID"
                };
                if (possibleOrderByCases.indexOf(prevKey.type) == -1) throw {
                    error: "14",
                    message: "PAGINATE_KEY_TYPE_INVALID",
                    errorData: prevKey.type
                };
                if (prevKey.type == "expired" || prevKey.type == "timestamp")
                    if (typeof (prevKey.key) != "number") throw {
                        error: "15",
                        message: "PAGINATE_KEY_TYPE_MISMATCH",
                        message2: `Expected number but got ${typeof(prevKey.key)}`
                    }
                if (prevKey.type == "title" || prevKey.type == "status")
                    if (typeof (prevKey.key) != "string") throw {
                        error: "15",
                        message: "PAGINATE_KEY_TYPE_MISMATCH",
                        message2: `Expected string but got ${typeof(prevKey.key)}`
                    }
                if (!prevKey.id || typeof (prevKey.id) != "number") throw {
                    error: "16",
                    message: "PAGINATE_KEY_ID_INVALID"
                };

            }

            let statusCases = ["private","public","waiting",null];
            if(statusCases.indexOf(status)==-1) throw { error:"17", message:"STATUS_VALUE_INVALID"};
        }

        //PRECONDITION CHECKS, wrapper:searchCases,searchKeyword
        {
            //PRECONDITION CHECK SEARCH COLUMN INVALID
            if (searchCases.indexOf(searchIn) == -1) throw {
                error: "11",
                message: "SEARCH_COLUMN_INVALID"
            };

            //PRECONDITION CHECK UID PROVIDED
            if (uid == null) throw {
                error: "10",
                message: "REQUIRED_ARGUEMENT_UID"
            };
        }

        //GENERATE whereQuery, wrapper:*
        {
            let conditions = 0;

            if (prevKey != null) {
                //timestamp and expired are integers                let possibleOrderByCases = ["expired","timestamp","title","status"];
                if (typeof (prevKey.key) == "string") {
                    whereQuery += ` ((${orderBy} ${(asc)?'>':'<'} '${prevKey.key}') OR (${orderBy} = '${prevKey.key}' AND id > ${prevKey.id})) `;
                } else {
                    whereQuery += ` ((${orderBy} ${(asc)?'>':'<'} ${prevKey.key}) OR (${orderBy} = ${prevKey.key} AND id > ${prevKey.id})) `;
                }
                conditions++;
            }

            if (uid != null) {
                uid = uid.toString();
                if (conditions > 0) whereQuery += "and ";
                whereQuery += `uid='${uid}' `;
                conditions++;
            }

            if (searchKeyword != null) {
                if (conditions > 0) whereQuery += "and ";
                switch (searchIn) {
                    case "title":
                        whereQuery += `'title2'@@$2 `; //$2 -> '${searchKeyword}'
                        break;
                    case "tags":
                        whereQuery += `'tags2'@@$2 `;
                        break;
                    default:
                    case "title&tags":
                        whereQuery += `'titags2'@@$2 `;
                        break;
                }
                conditions++;
            }

            if (removeDeleted != null) {
                if (conditions > 0) whereQuery += "and ";
                whereQuery += `deleted=${!removeDeleted} `;
                conditions++;
            }
            if (removeExpired != null) {
                if (conditions > 0) whereQuery += "and ";
                whereQuery += `expired ${(!removeExpired)?'>':'<'} EXTRACT(EPOCH FROM TIMESTAMP 'now') * 1000 `;
                conditions++;
            }

            if (status != null) {
                if (conditions > 0) whereQuery += "and ";
                whereQuery += `status = '${status}' `;
                conditions++;
            }

            if (conditions == 0) whereQuery = ' ';
        }

        //QUERY DB, DECODE AND RETURN RESULTS, wrapper:*
        {
            try {

                let query = `SELECT * FROM countdown_main${whereQuery}ORDER BY ${orderBy},id ${(asc)?'ASC':'DESC'} LIMIT ${limit}`;
                console.log(`QUERY : ${query}`);

                let response = await this.client.query({
                    text: `SELECT * FROM countdown_main${whereQuery}ORDER BY ${orderBy},id ${(asc)?'ASC':'DESC'} LIMIT $1`,
                }, (query.indexOf("$2")==-1)?[limit]:[limit, searchKeyword]);


                var countdowns = this.decodeRow({
                    rows: response.rows,
                    isArray: true
                });
                // if (!(countdowns instanceof Array)) {
                //     console.log(`${JSON.stringify(countdowns)} yee`);
                //     return countdowns;
                // }
                // countdowns.forEach((countdown) => {
                //     console.log(`${JSON.stringify(countdown)} ye`)
                // })

                const [lastCountdown] = countdowns.slice(-1);

                let key = null;
                if(lastCountdown==undefined) key = null;
                else
                key = {"type":orderBy,"key":lastCountdown[orderBy], "id":lastCountdown.id };
                return {"data":countdowns,"paginateKey":key};

            } catch (e) {
                console.log(`getAllCountdowns query error ${e}`);
                throw e;
            }
        }
    }
    
    async getCountdownsSortedAndFilteredPaginatedPublic({

        //ORDERING title, timestamp, expired
        orderBy = "expired",
        asc = true,
        //PREVIOUS KEY FOR PAGINATION
        prevKey = null,
        //LIMIT ITEMS
        limit = 5,
        //FILTER EXPRESSIONS
        removeDeleted = true, //null -> with Deleted, false -> only Deleted, true -> remove Deleted
        removeExpired = false, //null -> with Expired, false -> remove Expired, true -> only Expired
        searchKeyword = null, //searches in title and tag.
        searchIn = "tags&title", //title2,tag2,titags2
    }) {

        let whereQuery = ` where `;
        let searchCases = ["title", "tags", "title&tags", "tags&title"];

        //TODO: define pagination for all possible orderBy types
        
        //PRECONDITION CHECK, wrapper:orderBy,prevKey
        {
            let possibleOrderByCases = ["expired", "timestamp", "title", "status"];
            if (possibleOrderByCases.indexOf(orderBy) == -1) throw {
                error: "12",
                message: "ORDERING_COLUMN_INVALID"
            };
            if (prevKey != null) {

                if (!prevKey.type) throw {
                    error: "13",
                    message: "PAGINATE_KEY_TYPE_INVALID"
                };
                if (possibleOrderByCases.indexOf(prevKey.type) == -1) throw {
                    error: "14",
                    message: "PAGINATE_KEY_TYPE_INVALID",
                    errorData: prevKey.type
                };
                if (prevKey.type == "expired" || prevKey.type == "timestamp")
                    if (typeof (prevKey.key) != "number") throw {
                        error: "15",
                        message: "PAGINATE_KEY_TYPE_MISMATCH",
                        message2: `Expected number but got ${typeof(prevKey.key)}`
                    }
                if (prevKey.type == "title" || prevKey.type == "status")
                    if (typeof (prevKey.key) != "string") throw {
                        error: "15",
                        message: "PAGINATE_KEY_TYPE_MISMATCH",
                        message2: `Expected string but got ${typeof(prevKey.key)}`
                    }
                if (!prevKey.id || typeof (prevKey.id) != "number") throw {
                    error: "16",
                    message: "PAGINATE_KEY_ID_INVALID"
                };

            }
        }

        //PRECONDITION CHECKS, wrapper:searchCases,searchKeyword
        {
            //PRECONDITION CHECK SEARCH COLUMN INVALID
            if (searchCases.indexOf(searchIn) == -1) throw {
                error: "11",
                message: "SEARCH_COLUMN_INVALID"
            };
        }

        //GENERATE whereQuery, wrapper:*
        {
            let conditions = 0;

            if (prevKey != null) {
                //timestamp and expired are integers                let possibleOrderByCases = ["expired","timestamp","title","status"];
                if (typeof (prevKey.key) == "string") {
                    whereQuery += ` ((${orderBy} ${(asc)?'>':'<'} '${prevKey.key}') OR (${orderBy} = '${prevKey.key}' AND id > ${prevKey.id})) `;
                } else {
                    whereQuery += ` ((${orderBy} ${(asc)?'>':'<'} ${prevKey.key}) OR (${orderBy} = ${prevKey.key} AND id > ${prevKey.id})) `;
                }
                conditions++;
            }

            if (searchKeyword != null) {
                if (conditions > 0) whereQuery += "and ";
                switch (searchIn) {
                    case "title":
                        whereQuery += `'title2'@@$2 `; //$2 -> '${searchKeyword}'
                        break;
                    case "tags":
                        whereQuery += `'tags2'@@$2 `;
                        break;
                    default:
                    case "title&tags":
                        whereQuery += `'titags2'@@$2 `;
                        break;
                }
                conditions++;
            }

            if (removeDeleted != null) {
                if (conditions > 0) whereQuery += "and ";
                whereQuery += `deleted=${!removeDeleted} `;
                conditions++;
            }
            if (removeExpired != null) {
                if (conditions > 0) whereQuery += "and ";
                whereQuery += `expired ${(!removeExpired)?'>':'<'} EXTRACT(EPOCH FROM TIMESTAMP 'now') * 1000 `;
                conditions++;
            }

            //only PUBLIC
            {
                if (conditions > 0) whereQuery += "and ";
                whereQuery += `status = 'public' `;
                conditions++;
            }

            if (conditions == 0) whereQuery = ' ';
        }

        //QUERY DB, DECODE AND RETURN RESULTS, wrapper:*
        {
            try {

                let query = `SELECT * FROM countdown_main${whereQuery}ORDER BY ${orderBy},id ${(asc)?'ASC':'DESC'} LIMIT ${limit}`;
                console.log(`QUERY : ${query}`);

                let response = await this.client.query({
                    text: `SELECT * FROM countdown_main${whereQuery}ORDER BY ${orderBy},id ${(asc)?'ASC':'DESC'} LIMIT $1`,
                }, (query.indexOf("$2")==-1)?[limit]:[limit, searchKeyword]);


                var countdowns = this.decodeRow({
                    rows: response.rows,
                    isArray: true
                });
                // if (!(countdowns instanceof Array)) {
                //     console.log(`${JSON.stringify(countdowns)} yee`);
                //     return countdowns;
                // }
                // countdowns.forEach((countdown) => {
                //     console.log(`${JSON.stringify(countdown)} ye`)
                // })

                const [lastCountdown] = countdowns.slice(-1);
                let key = {"type":orderBy,"key":lastCountdown[orderBy], "id":lastCountdown.id };
                return {"data":countdowns,"paginateKey":key};

            } catch (e) {
                console.log(`getAllCountdowns query error ${e}`);
                throw e;
            }
        }
    }

    //delete
    deleteCountdownById() {

    }
}

exports.run = async () => {

    let query = await new CountdownQuery().start();
    try {
        let result = null;
        if (process.argv[4]) {
            console.log("second");
            result = await query.getCountdownsSortedAndFilteredPaginatedByUser(process.argv[2],{
                orderBy: "title",
                removeDeleted: false,
                removeExpired: null,
                asc: true,
                limit: process.argv[3],
            });

        } else {
            console.time("query");
            result = await query.getCountdownsSortedAndFilteredPaginatedPublic({
                orderBy: "expired",
                asc: true,
                removeExpired:true,
                limit: process.argv[3]
            });
            console.timeEnd("query");

        }
        // console.log(JSON.stringify(result));
    } catch (e) {
        console.log(JSON.stringify(e));
    }
    await query.dispose();
}

// run();

const fs = require("fs");
const neatCsv = require('neat-csv');

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
var readFile = (filename) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, (err, data) => {
            if (err) reject(err);
            resolve(data);
        });
    });
}

var importCSVtoPostgres = async (filename) => {

    try {
        var data = await readFile("./MOCK_DATA (1).csv");
        var csvArray = await neatCsv(data);
        let a = 0;
        var query = await new CountdownQuery().start();

        for (csvData of csvArray) {
            console.log(`${a++}`);
            let cd = new CountdownData({
                uid: csvData.uid,
                deleted: csvData.deleted,
                expired: parseInt(csvData.expired),
                status: csvData.status,
                tags: csvData.tags.split(' '),
                timestamp: parseInt(csvData.timestamp),
                title: csvData.title,
                username: csvData.username,
                description: csvData.description
            });
            await query.insertCountdown(cd);
            // await sleep(1000);
        }
        await query.dispose();
    } catch (err) {
        await query.dispose();
        console.log(err);
    }
}
// run();