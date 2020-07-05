const {
    Client
} = require('pg');
var admin = require("firebase-admin");

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
        final_timestamp,
        deleted = false,
        tags = ["placeholder", "tag"],
        username,
        title = "placeholderTitle",
        description = "placeholderDescription",
        expired = Date.now() + 600000,
        premium = false,
        status = "private",
        timestamp = Date.now(),
        url
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
        this.url = url;
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
        obj.url = this.url;
        return obj;
    }


    set isInserted(x) {
        this.inserted = x;
    }

    get isInserted() {
        return this.inserted;
    }

}

function processJSON(input_obj, {
    logs = false
} = {}) {
    if (logs) console.log(input_obj);
    if (typeof input_obj == "object") return input_obj;
    if (logs) console.log(input_obj + " before");
    if (!input_obj) return null;
    input_obj = JSON.stringify(input_obj).replace(/\r?\n|\r/g, "");
    if (logs) console.log(input_obj + " after");

    while (typeof input_obj != "object") {
        if (logs) console.log(input_obj + " iteration");
        input_obj = JSON.parse(input_obj);
    }

    if (logs) console.log(input_obj);
    if (logs) console.log("parsing object");
    return input_obj;
}

var string = (obj) => JSON.stringify(obj);
var isUndefined = (obj) => (!obj);

function validateNewCountdownInputs(obj) {
    if (isUndefined(obj)) return false;
    if (isUndefined(obj.Description)) obj.Description = "No Description";
    if (isUndefined(obj.Title)) return false;
    if (isUndefined(obj.TAG)) return false;
    if (!Array.isArray(obj.TAG)) throw "TAGS_INVALID_FORMAT";
    if (isUndefined(obj.Expired)) return false;
    try {
        obj.Expired = parseInt(obj.Expired);
        if (isNaN(obj.Expired)) throw "Error('Expired is not a number')";
    } catch (e) {
        console.log(obj.Expired + " cannot be converted " + string(e));
        return false;
    }
    obj.Expired = obj.Expired.toString();
    if (!obj.hasOwnProperty('Status')) obj.Status = "private";
    if (!obj.hasOwnProperty('Premium')) obj.Premium = "false"; else if(obj.Premium.toLowerCase()=="true" || obj.Premium==true) obj.Premium = "true";
    return obj;
}

class CountdownQuery {

    constructor() {
        this.tableName = "Countdown_Main";
    }

    //create
    async insertCountdown(pool, cd) {
        if (cd.isInserted) throw {
            error: "9",
            message: "Already inserted"
        };
        let response;
        try {
            response = await pool.query(`INSERT INTO ${this.tableName} (uid,username,title,description,expired,premium,status,timestamp,final_timestamp,deleted,tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11);`,
                [cd.uid, cd.username, cd.title, cd.description, cd.expired, cd.premium, cd.status, cd.timestamp, cd.final_timestamp, cd.deleted, cd.tags]);
        } catch (e) {
            console.log(`Insert Error ${e}`);
        }

        console.log(`Response is ${JSON.stringify(response)}`);
        return response;
    }
    //get
    async getAllCountdowns(pool) {
        try {
            let response = await pool.query({
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

    async getCountdownById(pool, {
        id,
    }) {
        try {
            let response = await pool.query({
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
    async getCountdownsSorted(pool, {
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
            let response = await pool.query({
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
     * [get all countdowns for a particular user, sort using (orderBy,asc), filter using (removeDeleted,removeExpired,status,searchKeyword,searchIn), specify limit default:5, paginateKey for pagination]
     * @return {data:[CountdownData],paginateKey:{type,key,id}}      [CountdownData type is returned which bears a countdown]
     */
    async getCountdownsSortedAndFilteredPaginatedByUser(pool, uid, {

        //ORDERING 
        orderBy = "title",
        asc = true,
        //PREVIOUS KEY FOR PAGINATION
        paginateKey = null, // object with type,id,key
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
        //PRECONDITION CHECK, wrapper:orderBy,paginateKey,status
        {
            let possibleOrderByCases = ["expired", "timestamp", "title", "status"];
            if (possibleOrderByCases.indexOf(orderBy) == -1) throw {
                error: "12",
                message: "ORDERING_COLUMN_INVALID"
            };
            if(orderBy=="expired")
            {
                orderBy="expired_sort(expired)"
            }
            if (paginateKey != null) {

                if (!paginateKey.type) throw {
                    error: "13",
                    message: "PAGINATE_KEY_TYPE_INVALID"
                };
                if (possibleOrderByCases.indexOf(paginateKey.type) == -1) throw {
                    error: "14",
                    message: "PAGINATE_KEY_TYPE_INVALID",
                    errorData: paginateKey.type
                };
                if (paginateKey.type == "expired" || paginateKey.type == "timestamp")
                    if (typeof (paginateKey.key) != "number") throw {
                        error: "15",
                        message: "PAGINATE_KEY_TYPE_MISMATCH",
                        message2: `Expected number but got ${typeof(paginateKey.key)}`
                    }
                if (paginateKey.type == "title" || paginateKey.type == "status")
                    if (typeof (paginateKey.key) != "string") throw {
                        error: "15",
                        message: "PAGINATE_KEY_TYPE_MISMATCH",
                        message2: `Expected string but got ${typeof(paginateKey.key)}`
                    }
                if (!paginateKey.id || typeof (paginateKey.id) != "number") throw {
                    error: "16",
                    message: "PAGINATE_KEY_ID_INVALID"
                };

            }

            let statusCases = ["private", "public", "waiting", null];
            if (statusCases.indexOf(status) == -1) throw {
                error: "17",
                message: "STATUS_VALUE_INVALID"
            };
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

            if (searchCases.indexOf(searchIn) == -1) throw {
                error: "11",
                message: "SEARCH_COLUMN_INVALID"
            };
            if ([true, false, null].indexOf(removeDeleted) == -1) throw {
                error: "18",
                message: "REMOVE_DELETE_INVALID"
            };
            if ([true, false, null].indexOf(removeExpired) == -1) throw {
                error: "19",
                message: "REMOVE_EXPIRED_INVALID"
            };
            if (typeof (limit) == "string") limit = (parseInt(limit)) ? parseInt(limit) : DEFAULT_LIMIT;
        }

        //GENERATE whereQuery, wrapper:*
        {
            let conditions = 0;

            if (paginateKey != null) {
                //timestamp and expired are integers                let possibleOrderByCases = ["expired","timestamp","title","status"];
                if (typeof (paginateKey.key) == "string") {
                    whereQuery += ` ((${orderBy} ${(asc)?'>':'<'} '${paginateKey.key}') OR (${orderBy} = '${paginateKey.key}' AND id > ${paginateKey.id})) `;
                } else {
                    whereQuery += ` ((${orderBy} ${(asc)?'>':'<'} ${paginateKey.key}) OR (${orderBy} = ${paginateKey.key} AND id > ${paginateKey.id})) `;
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
                        whereQuery += `title2@@to_tsquery('english',$2) `; //$2 -> '${searchKeyword}'
                        break;
                    case "tags":
                        whereQuery += `tags2@@to_tsquery('english',$2) `;
                        break;
                    default:
                    case "title&tags":
                        whereQuery += `titags2@@to_tsquery('english',$2) `;
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

                let query = `SELECT * FROM countdown_main${whereQuery}ORDER BY ${orderBy} ${(asc)?'ASC':'DESC'},id LIMIT ${limit}`;
                console.log(`QUERY : ${query}`);

                let response = await pool.query({
                    text: `SELECT * FROM countdown_main${whereQuery}ORDER BY ${orderBy} ${(asc)?'ASC':'DESC'},id  LIMIT $1`,
                }, (query.indexOf("$2") == -1) ? [limit] : [limit, searchKeyword]);


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
                if (lastCountdown == undefined) key = null;
                else
                    key = {
                        "type": orderBy,
                        "key": lastCountdown[orderBy],
                        "id": lastCountdown.id
                    };
                return {
                    "data": countdowns,
                    "paginateKey": key
                };

            } catch (e) {
                console.log(`getAllCountdowns query error ${e}`);
                throw e;
            }
        }
    }

    async getCountdownsSortedAndFilteredPaginatedPublic(pool, {

        //ORDERING title, timestamp, expired
        orderBy = "expired",
        asc = true,
        //PREVIOUS KEY FOR PAGINATION
        paginateKey = null,
        //LIMIT ITEMS
        limit = 20,
        //FILTER EXPRESSIONS
        removeDeleted = true, //null -> with Deleted, false -> only Deleted, true -> remove Deleted
        removeExpired = false, //null -> with Expired, false -> remove Expired, true -> only Expired
        searchKeyword = null, //searches in title and tag.
        searchIn = "tags&title", //title2,tag2,titags2
    }) {

        let whereQuery = ` where `;
        let searchCases = ["title", "tags", "title&tags", "tags&title"];

        //TODO: define pagination for all possible orderBy types

        //PRECONDITION CHECK, wrapper:orderBy,paginateKey
        {
            let possibleOrderByCases = ["expired", "timestamp", "title", "status"];
            if (possibleOrderByCases.indexOf(orderBy) == -1) throw {
                error: "12",
                message: "ORDERING_COLUMN_INVALID"
            };
            if (paginateKey != null) {

                if (!paginateKey.type) throw {
                    error: "13",
                    message: "PAGINATE_KEY_TYPE_INVALID"
                };
                if (possibleOrderByCases.indexOf(paginateKey.type) == -1) throw {
                    error: "14",
                    message: "PAGINATE_KEY_TYPE_INVALID",
                    errorData: paginateKey.type
                };
                if (paginateKey.type == "expired" || paginateKey.type == "timestamp")
                    if (typeof (paginateKey.key) != "number") throw {
                        error: "15",
                        message: "PAGINATE_KEY_TYPE_MISMATCH",
                        message2: `Expected number but got ${typeof(paginateKey.key)}`
                    }
                if (paginateKey.type == "title" || paginateKey.type == "status")
                    if (typeof (paginateKey.key) != "string") throw {
                        error: "15",
                        message: "PAGINATE_KEY_TYPE_MISMATCH",
                        message2: `Expected string but got ${typeof(paginateKey.key)}`
                    }
                if (!paginateKey.id || typeof (paginateKey.id) != "number") throw {
                    error: "16",
                    message: "PAGINATE_KEY_ID_INVALID"
                };

            }
        }

        //PRECONDITION CHECKS, wrapper:searchCases,searchKeyword,removeExpired,removeDeleted,asc
        {
            //PRECONDITION CHECK SEARCH COLUMN INVALID
            if (searchCases.indexOf(searchIn) == -1) throw {
                error: "11",
                message: "SEARCH_COLUMN_INVALID"
            };
            if ([true, false, null].indexOf(removeDeleted) == -1) throw {
                error: "18",
                message: "REMOVE_DELETE_INVALID"
            };
            if ([true, false, null].indexOf(removeExpired) == -1) throw {
                error: "19",
                message: "REMOVE_EXPIRED_INVALID"
            };
            if (typeof (limit) == "string") limit = (parseInt(limit)) ? parseInt(limit) : 20;
            if (typeof (asc) == "string") asc = (asc == "true");
        }

        //GENERATE whereQuery, wrapper:*
        {
            let conditions = 0;

            if (paginateKey != null) {
                //timestamp and expired are integers                let possibleOrderByCases = ["expired","timestamp","title","status"];
                if (typeof (paginateKey.key) == "string") {
                    whereQuery += ` ((${orderBy} ${(asc)?'>':'<'} '${paginateKey.key}') OR (${orderBy} = '${paginateKey.key}' AND id > ${paginateKey.id})) `;
                } else {
                    whereQuery += ` ((${orderBy} ${(asc)?'>':'<'} ${paginateKey.key}) OR (${orderBy} = ${paginateKey.key} AND id > ${paginateKey.id})) `;
                }
                conditions++;
            }

            if (searchKeyword != null) {
                if (conditions > 0) whereQuery += "and ";
                switch (searchIn) {
                    case "title":
                        whereQuery += `title2@@to_tsquery('english',$2) `; //$2 -> '${searchKeyword}'
                        break;
                    case "tags":
                        whereQuery += `tags2@@to_tsquery('english',$2) `;
                        break;
                    default:
                    case "title&tags":
                        whereQuery += `titags2@@to_tsquery('english',$2) `;
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

                let query = `SELECT * FROM countdown_main${whereQuery}ORDER BY ${orderBy} ${(asc)?'ASC':'DESC'},id LIMIT ${limit}`;
                console.log(`QUERY : ${query} ${query.indexOf("$2")}`);

                let response = await pool.query({
                    text: `SELECT * FROM countdown_main${whereQuery}ORDER BY ${orderBy} ${(asc)?'ASC':'DESC'},id LIMIT $1`,
                }, (query.indexOf("$2") == -1) ? [limit] : [limit, searchKeyword]);




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

                let key = {
                    "type": orderBy,
                    "key": !lastCountdown ? lastCountdown : lastCountdown[orderBy],
                    "id": !lastCountdown ? lastCountdown : lastCountdown.id
                };
                return {
                    "data": countdowns,
                    "paginateKey": key
                };

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

class CountdownResQuery extends CountdownQuery {

    constructor() {
        super();
    }

    //body:Countdown
    //header:token
    async insertCountdown(pool, req, res,{status="private"}) {
        var response = {
            statusCode: 400,
            body: "Nothing."
        };
        let body = null;
        let input_obj = null;
        //1. check req.body is correct or not.
        {

            try {
                body = processJSON(req.body);
            } catch (e) {
                console.log(e+" "+req.body);
                response.statusCode = 400;
                response.body = {
                    "event": "Error",
                    "error": "MALFORMED_BODY",
                    "errorMessage": string(e),
                    'errorMessage2': ''
                };
                response.body = response.body;
                return response;
            }

            try {
                input_obj = validateNewCountdownInputs(body);
                if (!input_obj) {
                    response.statusCode = 400;
                    response.body = {
                        "event": "Error",
                        'error': 'INVALID_INPUT',
                        'errorMessage': 'Input',
                        'errorMessage2': string(input_obj)

                    }
                    response.body = string(response.body);
                    return response;;
                }
            } catch (e) {
                response.statusCode = 400;
                response.body = {
                    "event": "Error",
                    "error": e,
                    "errorMessage": '',
                    'errorMessage2': ''
                };
                response.body = response.body;
                return response;
            }
        }
        //3. we have a nice token with us, now we gotta check it with firebase
        let token = req.headers.token;
        console.log(token);
        let result = null; {

            try {
                //this function queries for user with timestamp field, if exists compares with current time and returns true if <5min otherwise false, if field is absent then first countdown so proceed
                result = await CountdownUser.getUserLastCountdownTimestamp(pool, token.uid);
                if (typeof result == 'object' && !result.hasOwnProperty("premium")) { //if object it's error,if success it'll be bool
                    response.statusCode = 400;
                    response.body = result;
                    response.body = string(response.body);
                    return response;
                }
                console.log("result gult " + result);
                //user is valid and can put a countdown because his timestamp is within limits
                //putuser basically pushes the current token payload with last_countdown_timestam updated
                //returns an object if it failed, return as response;
                result = await CountdownUser.insertUser(pool, token);
                if (result.error) {
                    response.statusCode = 400;
                    response.body = result;
                    response.body = string(response.body);
                    return response;
                }

                console.log("result putuser " + result);
            } catch (e) {
                console.log(e);
                response.statusCode = 401;
                response.body = {
                    "event": "Error",
                    'error': 'BAD_TOKEN',
                    'errorMessage': 'Unauthorized',
                    'errorMessage2': e
                };
                return response;
            }
        }

        //4. get countdown from token;push to db;
        {
            let cd = new CountdownData({
                uid: token.uid,
                username: input_obj.username,
                description: input_obj.Description,
                title: input_obj.Title,
                tags: input_obj.TAG,
                expired: input_obj.Expired,
                premium: (input_obj.Premium=="true"),
                status: input_obj.Status,
            });
            if (cd.isInserted) return {
                "event": "Error",
                "error": "DB_ALREADY_INSERTED",
                "errorMessage": "Failed to insert into database",
            };

            try {
                let data = await pool.query(`INSERT INTO ${this.tableName}(uid,username,title,description,expired,premium,status,timestamp,final_timestamp,deleted,tags,url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *;`,
                    [cd.uid, cd.username, cd.title, cd.description, cd.expired, cd.premium, status, cd.timestamp, cd.final_timestamp, cd.deleted, cd.tags, input_obj.url]);
                response.statusCode = 200;
                response.body = {
                    "event": "Success",
                    "dataType": "Message2",
                    "data": "Successfully inserted into database",
                    "Item": cd.toObject,
                    "Inserted":data.rows[0]
                };
            } catch (e) {
                console.log(e);
                response.statusCode = 500;
                response.body = {
                    "event": "Error",
                    "error": "DB_FAIL_INSERT",
                    "errorMessage": "Failed to insert into database",
                    "errorMessage2": e,
                };
            }
        }

        console.log(`Response is ${JSON.stringify(response)}`);
        return response;
    }

    //body:ID
    //header:token
/*     async deleteCountdown(pool, req, res)
    {
        var response = {
            statusCode: 400,
            body: "Nothing."
        };
        let body = null;
        let input_obj = null;
        //1. check req.body is correct or not.
        {

            try {
                body = processJSON(req.body);
            } catch (e) {
                console.log(e+" "+req.body);
                response.statusCode = 400;
                response.body = {
                    "event": "Error",
                    "error": "MALFORMED_BODY",
                    "errorMessage": string(e),
                    'errorMessage2': ''
                };
                response.body = response.body;
                return response;
            }

            if (!(body.hasOwnProperty("ID") && body.ID && !isNaN(body.ID))) {
                response.statusCode = 401;
                response.body = JSON.stringify({
                    "event": "Error",
                    "error": "BAD_COUNTDOWN_ID",
                    "errorMessage": "Countdown id is either not provided or invalid",
                    "errorMessage2": ""
                });
                return response;
            }
            body.ID = parseInt(body.ID);
        }
        // let token;
        // 2. check if header["token"] exists
        {
            if (!req.headers.hasOwnProperty('token') || !req.headers.token) {
                response.statusCode = 401;
                response.body = {
                    "event": "Error",
                    'error': 'NO_TOKEN',
                    'errorMessage': 'Unauthorized',
                    'errorMessage2': ''
                };
                response.body = string(response.body);
                return response;
            }

        }
        //3. we have a nice token with us, now we gotta check it with firebase
        let token = req.headers.token;
        token = token.trim();
        let result = null; {

            try {
                //verifying if token is valid, if passed returns payload otherwise catch logs and responds;
                token = await admin.auth().verifyIdToken(token);
            } catch (e) {
                console.log(e);
                response.statusCode = 401;
                response.body = {
                    "event": "Error",
                    'error': 'BAD_TOKEN',
                    'errorMessage': 'Unauthorized',
                    'errorMessage2': e
                };
                return response;
            }
        }

        try {
            let data = await pool.query(`UPDATE ${this.tableName} SET deleted=TRUE, final_timestamp=$3 WHERE uid=$1 AND id=$2 RETURNING id,uid;`,[token.uid,body.ID,Date.now().toString()]);
            //TODO: what about parsing req.body.id;
            //TODO:check if udpated?
            response.statusCode = 200;
            response.body = {
                "event": "Success",
                "dataType": "DELETE_SUCCESS",
                "data": "Successfully delete item",
                "data2": data.rows[0]
            };
        } catch (err) {
            console.log(err);
            response.statusCode = 500;
            if (err != undefined && typeof err == "string") {
                response.statusCode = 400;
                response.body = {
                    "event": "Error",
                    "error": "ITEM_ALREADY_DELETED",
                    "errorMessage": "Failed to obtain Item to update/Failed to delete Item",
                    "errorMessage2": err
                };
                return response;
            }
            response.body = {
                "event": "Error",
                "error": "DELETE_FAIL",
                "errorMessage": "Failed to obtain Item to update/Failed to delete Item",
                "errorMessage2": err
            };
        }
    
        return response;
    } */

    async deleteCountdown(token, pool, req, res)
    {
        var response = {
            statusCode: 400,
            body: "Nothing."
        };
        let body = null;
        let input_obj = null;
        //1. check req.body is correct or not.
        {

            try {
                body = processJSON(req.body);
            } catch (e) {
                console.log(e+" "+req.body);
                response.statusCode = 400;
                response.body = {
                    "event": "Error",
                    "error": "MALFORMED_BODY",
                    "errorMessage": string(e),
                    'errorMessage2': ''
                };
                response.body = response.body;
                return response;
            }

            if (!(body.hasOwnProperty("ID") && body.ID && !isNaN(body.ID))) {
                response.statusCode = 401;
                response.body = JSON.stringify({
                    "event": "Error",
                    "error": "BAD_COUNTDOWN_ID",
                    "errorMessage": "Countdown id is either not provided or invalid",
                    "errorMessage2": ""
                });
                return response;
            }
            body.ID = parseInt(body.ID);
        }
        
        //3. we have a nice token with us, now we gotta check it with firebase
        let result = null;

        try {
            let data = await pool.query(`UPDATE ${this.tableName} SET deleted=TRUE, final_timestamp=$3 WHERE uid=$1 AND id=$2 RETURNING id,uid;`,[token.uid,body.ID,Date.now().toString()]);
            //TODO: what about parsing req.body.id;
            //TODO:check if udpated?
            response.statusCode = 200;
            response.body = {
                "event": "Success",
                "dataType": "DELETE_SUCCESS",
                "data": "Successfully delete item",
                "data2": data.rows[0]
            };
        } catch (err) {
            console.log(err);
            response.statusCode = 500;
            if (err != undefined && typeof err == "string") {
                response.statusCode = 400;
                response.body = {
                    "event": "Error",
                    "error": "ITEM_ALREADY_DELETED",
                    "errorMessage": "Failed to obtain Item to update/Failed to delete Item",
                    "errorMessage2": err
                };
                return response;
            }
            response.body = {
                "event": "Error",
                "error": "DELETE_FAIL",
                "errorMessage": "Failed to obtain Item to update/Failed to delete Item",
                "errorMessage2": err
            };
        }
    
        return response;
    }

}

class CountdownUserData {
    //auth_time,email_verified,exp,iat,iss,sub,
    constructor({
        auth_time,
        email_verified,
        // exp,
        // iat,
        // iss,
        last_countdown_timestamp = 0,
        // sub,
        user_id,
        name,
        picture,
        email,
        premium = false
        // aud
    }) {
        this.auth_time = auth_time;
        this.email_verified = (email_verified == "True" || email_verified == true);
        // this.exp = exp;
        // this.iat = iat;
        // this.iss = iss;
        // this.sub = sub;
        this.last_countdown_timestamp = last_countdown_timestamp;
        this.user_id = user_id;
        this.uid = this.user_id;
        this.name = name;
        this.picture = picture;
        this.email = email;
        this.premium = premium;
        // this.aud = aud;
    }

    //make another constructor that can use the token directly

    get toObject() {
        let obj = {};
        obj.auth_time = this.auth_time;
        obj.email_verified = this.email_verified;
        // obj.exp = this.exp;
        // obj.iat = this.iat;
        // obj.iss = this.iss;
        obj.last_countdown_timestamp = this.last_countdown_timestamp;
        // obj.sub = this.sub;
        obj.user_id = this.user_id;
        obj.name = this.name;
        obj.picture = this.picture;
        obj.uid = this.uid;
        obj.email = this.email;
        return obj;
    }

    get toArrayInOrder() {
        return [this.auth_time, this.email_verified, this.last_countdown_timestamp, this.user_id, this.name, this.picture, this.uid, this.email];
        // return [insertItem.auth_time, insertItem.email_verified, insertItem.exp, insertItem.iat, insertItem.iss, insertItem.last_countdown_timestamp, insertItem.sub, insertItem.user_id, insertItem.name, insertItem.picture, insertItem.uid, insertItem.email, insertItem.aud]
    }

    get columnNamesInOrder() {
        return "auth_time,email_verified,last_countdown_timestamp,user_id,name,picture,uid,email";
    }

    get columnValues() {
        return "$1,$2,$3,$4,$5,$6,$7,$8"; //12 values in this object;
    }
}

class CountdownUser {
    constructor() {

        this.tableName = "countdown_users";
    }

    static async insertUser(pool, decodedToken) {
        this.tableName = "countdown_users";
        let user_obj = decodedToken;
        if (!user_obj) throw {
            error: "20",
            message: "PUTUSER:USER OBJ NULL"
        };
        if (user_obj.hasOwnProperty('firebase')) delete user_obj.firebase;
        user_obj.last_countdown_timestamp = Date.now().toString();
        const insertItem = new CountdownUserData(user_obj);
        let result = await pool.query(`INSERT INTO ${this.tableName}(${insertItem.columnNamesInOrder}) VALUES(${insertItem.columnValues}) ON CONFLICT (uid) DO UPDATE SET last_countdown_timestamp = excluded.last_countdown_timestamp`, insertItem.toArrayInOrder);
        return result;
        try {

        } catch (e) {
            throw {
                error: "21",
                message: "INSERT_USER_ERROR",
                message2: string(e)
            };
        }

    }

    static async getUserLastCountdownTimestamp(pool, uid) {
        const MINUTES_DELAY_BETWEEN_NEW_COUNTDOWN = 2;
        const MIN_DELAY_BETWEEN_NEW_COUNTDOWN = MINUTES_DELAY_BETWEEN_NEW_COUNTDOWN * 60 * 1000;
        let data;
        try {
            data = await pool.query(`SELECT * FROM countdown_users WHERE uid=$1 LIMIT 1;`, [uid]);
        } catch (e) {
            console.log(string(e) + " error in getUserLastCountdown first try cathch");
            return new Error2("Error", string(e), "SERVER_ERR", undefined);
        }
        console.log("data from gult : " + string(data.rows));
        if (data.rowCount && data.rowCount > 0) {
            //result returned;
            data = data.rows[0];
            if (data.premium) {
                return {
                    premium: true
                };
            }
            let last_countdown_timestamp = data.last_countdown_timestamp;
            let now = Date.now();
            if (now - parseInt(last_countdown_timestamp) > MIN_DELAY_BETWEEN_NEW_COUNTDOWN) return true;
            else return new Error2("Error", "Please wait a couple minutes between each new countdown", "USER_ERROR", "WAIT_BW_COUNTDOWN")
        } else {
            //no results returned;
            return true;
        }
    }

    async getUserByUID(pool, uid, {
        isUsername = false,
    }) {
        try {
            let result = await pool.query(`SELECT * FROM countdown_users WHERE uid=$1 LIMIT 1;`, [uid]);
            return result;
        } catch (e) {
            throw {
                error: "22",
                message: "GETUSERBYID_ERROR",
                message2: string(e)
            };
        }
    }

    async deleteUserByUID(uid, {
        isUsername = false
    }) {

    }

    modifyUserByUID(uid, modifyObj, {
        isUsername = false
    }) {

    }

}

const MINUTES_DELAY_BETWEEN_NEW_COUNTDOWN = 2;
const MIN_DELAY_BETWEEN_NEW_COUNTDOWN = MINUTES_DELAY_BETWEEN_NEW_COUNTDOWN * 60 * 1000;
class Error2 {
    constructor(event, error, errorMessage, errorMessage2) {
        this.event = event;
        this.error = error;
        this.errorMessage = errorMessage;
        this.errorMessage2 = errorMessage2;
    }
    static isError(e) {
        return ((typeof e == 'object') && !(isUndefined(e.errorMessage) || isUndefined(e.error)))
    }
}

exports.CountdownUserData = CountdownUserData;
exports.CountdownUser = CountdownUser;
exports.CountdownQuery = CountdownQuery;
exports.CountdownResQuery = CountdownResQuery;
exports.CountdownData = CountdownData;