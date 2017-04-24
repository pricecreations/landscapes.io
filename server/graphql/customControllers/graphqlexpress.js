var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments)).next());
        });
    };
const graphql = require("graphql");
const url = require("url");
const graphql_server_core_1 = require("graphql-server-core");
const GraphiQL = require("graphql-server-module-graphiql");

function graphqlExpress(options) {
    if (!options) {
        throw new Error('Apollo Server requires options.');
    }
    if (arguments.length > 1) {
        throw new Error(`Apollo Server expects exactly one argument, got ${arguments.length}`);
    }
    return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        let optionsObject;
        if (isOptionsFunction(options)) {
            try {
                optionsObject = yield options(req, res);
            }
            catch (e) {
                res.statusCode = 500;
                res.write(`Invalid options provided to ApolloServer: ${e.message}`);
                res.end();
            }
        }
        else {
            optionsObject = options;
        }
        const formatErrorFn = optionsObject.formatError || graphql.formatError;
        if (req.method !== 'POST') {
            res.setHeader('Allow', 'POST');
            res.statusCode = 405;
            res.write('Apollo Server supports only POST requests.');
            res.end();
            return;
        }
        if (!req.body) {
            res.statusCode = 500;
            res.write('POST body missing. Did you forget "app.use(bodyParser.json())"?');
            res.end();
            return;
        }
        let b = req.body;
        let isBatch = true;
        if (!Array.isArray(b)) {
            isBatch = false;
            b = [b];
        }
        let responses = [];
        for (let requestParams of b) {
            try {
                const query = requestParams.query;
                const operationName = requestParams.operationName;
                let variables = requestParams.variables;
                if (typeof variables === 'string') {
                    try {
                        variables = JSON.parse(variables);
                    }
                    catch (error) {
                        res.statusCode = 400;
                        res.write('Variables are invalid JSON.');
                        res.end();
                        return;
                    }
                }
                let context = optionsObject.context;
                if (isBatch) {
                    context = Object.assign({}, context || {});
                }
                console.log(variables)
                let params = {
                    schema: optionsObject.schema,
                    query: query,
                    variables: variables,
                    context: context,
                    rootValue: optionsObject.rootValue,
                    operationName: operationName,
                    logFunction: optionsObject.logFunction,
                    validationRules: optionsObject.validationRules,
                    formatError: formatErrorFn,
                    formatResponse: optionsObject.formatResponse,
                    debug: optionsObject.debug,
                };
                if (optionsObject.formatParams) {
                    params = optionsObject.formatParams(params);
                }
                responses.push(yield graphql_server_core_1.runQuery(params));
                responses.push({token:variables.token})
                console.log(responses)
            }
            catch (e) {
                responses.push({ errors: [formatErrorFn(e)] });
            }
        }
        res.setHeader('Content-Type', 'application/json');
        res.set('Content-Type', 'text/plain');

        if (isBatch) {
            res.write(JSON.stringify(responses));
            res.end();
        }
        else {
            const gqlResponse = responses[0];
            if (gqlResponse.errors && typeof gqlResponse.data === 'undefined') {
                res.statusCode = 400;
            }
            gqlResponse.token = req.token
            gqlResponse.userData = req.userData;
            res.write(JSON.stringify(gqlResponse));
            res.end();
        }
    });
}
exports.graphqlExpress = graphqlExpress;
function isOptionsFunction(arg) {
    return typeof arg === 'function';
}