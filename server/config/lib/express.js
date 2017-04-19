'use strict'

/**
 * Module dependencies.
 */

import fs from 'fs'
import _ from 'lodash'
import path from 'path'
import cors from 'cors'
import YAML from 'yamljs'
import lusca from 'lusca'
import morgan from 'morgan'
import helmet from 'helmet'
import express from 'express'
import hbs from 'express-hbs'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import passport from 'passport'
import flash from 'connect-flash'
import compress from 'compression'
import { createServer } from 'http'
import bodyParser from 'body-parser'
import session from 'express-session'
import cookieParser from 'cookie-parser'
import methodOverride from 'method-override'
import { printSchema } from 'graphql/utilities/schemaPrinter'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { graphqlExpress, graphiqlExpress } from 'graphql-server-express'

import { describe } from '../../routes/deployments'
import { deploymentsByLandscapeId } from '../../routes/landscapes'

import logger from './logger'
import config from '../config'
import schema from '../../graphql/schema'
import { subscriptionManager } from '../../graphql/subscriptions'

const DIST_DIR = path.resolve(__dirname, '../../../dist/')
const WEBSOCKET_PORT = 8090
const MongoStore = require('connect-mongo')(session)
const userAuth = require('../../auth/controllers/users/users.authentication.server.controller')

/**
 * Initialize local variables
 */
module.exports.initLocalVariables = app => {

    // Setting application local variables
    app.locals.title = config.app.title
    app.locals.description = config.app.description

    if (config.secure && config.secure.ssl === true) {
        app.locals.secure = config.secure.ssl
    }

    app.locals.keywords = config.app.keywords
    app.locals.jsFiles = config.files.client.js
    app.locals.cssFiles = config.files.client.css
    app.locals.livereload = config.livereload
    app.locals.logo = config.logo
    app.locals.env = process.env.NODE_ENV
    app.locals.domain = config.domain

    // Passing the request url to environment locals
    app.use((req, res, next) => {
        res.locals.host = req.protocol + '://' + req.hostname
        res.locals.url = req.protocol + '://' + req.headers.host + req.originalUrl
        next()
    })
}

/**
 * Initialize application middleware
 */

module.exports.initMiddleware = app => {
    // Should be placed before express.static
    app.use(compress({
        filter: (req, res) => {
            return (/json|text|javascript|css|font|svg/).test(res.getHeader('Content-Type'))
        },
        level: 9
    }))
    app.use(cookieParser())

    // Enable logger (morgan) if enabled in the configuration file
    if (_.has(config, 'log.format')) {
        app.use(morgan(logger.getLogFormat(), logger.getMorganOptions()))
    }

    // Environment dependent middleware
    if (process.env.NODE_ENV === 'development') {
        // Disable views cache
        app.set('view cache', false)
    } else if (process.env.NODE_ENV === 'production') {
        app.locals.cache = 'memory'
    }

    app.use('/schema', (req, res) => {
        res.set('Content-Type', 'text/plain')
        res.send(printSchema(schema))
    })

    // Initialize graphql subscriptions websocket server
    const websocketServer = createServer((request, response) => {
        response.writeHead(404)
        response.end()
    })

    websocketServer.listen(WEBSOCKET_PORT)

    new SubscriptionServer({ subscriptionManager }, websocketServer)

    // Request body parsing middleware should be above methodOverride
    app.use(bodyParser.urlencoded({ extended: true }))

    let multer = require('multer')
    let upload = multer({ dest: 'uploads/' })

    // TODO: Move to its own folder
    app.post('/api/generateToken', (req, res) => {

        let user = ''

        req.on('data', chunk => {
            user += chunk
        })

        req.on('end', () => {
            console.log(req.cookies)

            user = JSON.parse(user)
            user.expires = Math.floor(Date.now() / 1000) + (60*60);
            // HACK: temporary hack, will be removed once the images are redone
            delete user.imageUri

            // create a token
            let token = jwt.sign({
                data: user,
                exp: user.expires // 1-hour token
            }, 'CHANGE_ME')

            res.cookie('token', 'k', {
                expires  : new Date(Date.now() + 9999999),
                httpOnly : false
            });
            res.json({
                user,
                token
            })
        })
    })

    app.get('/api/verifyToken', (req, res) => {

        // route middleware to verify a token
        // check header or url parameters or post parameters for token
        let token = req.body.token || req.query.token || req.headers['x-access-token']

        // decode token
        if (token) {
            // verifies secret and checks exp
            jwt.verify(token, 'CHANGE_ME', (err, decoded) => {

                if (err && err.name === 'TokenExpiredError') {
                    console.log('token expired')
                    return res.status(401).json({ expired: true })
                    // res.json({ expired: true })
                } else if (err) {
                    console.log('Error --->', err)
                    res.status(401).json({ err })
                } else {
                    res.json(decoded.data)
                }

            })

        } else {
            // if there is no token
            return res.status(403).send({
                message: 'No token provided'
            })
        }
    })

    app.get('/api/deployments/describe/:stackName/:region/:accountName', describe)
    app.get('/api/landscapes/:landscapeId/deployments', deploymentsByLandscapeId)
    app.post('/api/upload/template', upload.single('file'), (req, res) => {

        let user = req.user || {
            name: 'anonymous'
        }

        if (!req.file) {
            return res.status(500).send('No Files Uploaded')
        }

        function tryParseJSON(jsonString) {
            try {
                let o = JSON.parse(jsonString)
                if (o && typeof o === 'object' && o !== null) {
                    return o
                }
            } catch (e) {}

            return false
        }

        function tryParseYAML(yamlString) {
            try {
                let o = YAML.parse(yamlString)
                if (o && typeof o === 'object' && o !== null) {
                    return o
                }
            } catch (e) {}

            return false
        }

        function deleteFile(filePath, callback) {

            fs.unlink(filePath, err => {
                if (err) {
                    callback(err)
                } else {
                    callback(null)
                }
            })
        }

        let f = req.file

        let template = fs.readFileSync(f.path, 'utf-8')

        if (tryParseJSON(template)) {
            deleteFile(f.path, err => {
                res.send(template)
            })
        } else if (tryParseYAML(template)) {
            deleteFile(f.path, err => {
                res.send(YAML.parse(template))
            })
        } else {
            deleteFile(f.path, err => {
                res.send(400, {
                    msg: 'File \"' + f.name + '\"' + ' does not contain a valid AWS CloudFormation Template.'
                })
            })
        }
    })

    app.use('/uploads', express.static('uploads'))
    app.use(bodyParser.json({ limit: '50mb' }))
    app.use(methodOverride())

    // Add the cookie parser and flash middleware
    app.use(flash())
}

/**
 * Configure view engine
 */
module.exports.initViewEngine = app => {
    app.engine('server.view.html', hbs.express4({extname: '.server.view.html'}))
    app.set('view engine', 'server.view.html')
    app.set('views', path.resolve('./'))
}

/**
 * Configure Express session
 */
module.exports.initSession = (app, db) => {
    // Express MongoDB session storage
    app.use(session({
        saveUninitialized: true,
        resave: true,
        secret: config.sessionSecret,
        cookie: {
            maxAge: config.sessionCookie.maxAge,
            httpOnly: config.sessionCookie.httpOnly,
            secure: config.sessionCookie.secure && config.secure.ssl
        },
        name: config.sessionKey,
        store: new MongoStore({mongooseConnection: db.connection, collection: config.sessionCollection})
    }))

    // Add Lusca CSRF Middleware
    app.use(lusca(config.csrf))
}

/**
 * Invoke modules server configuration
 */
module.exports.initModulesConfiguration = (app, db) => {
    config.files.server.configs.forEach(configPath => {
        require(path.resolve(configPath))(app, db)
    })
}

/**
 * Configure Helmet headers configuration
 */
module.exports.initHelmetHeaders = app => {
    // Use helmet to secure Express headers
    let SIX_MONTHS = 15778476000
    app.use(helmet.frameguard())
    app.use(helmet.xssFilter())
    app.use(helmet.noSniff())
    app.use(helmet.ieNoOpen())
    app.use(helmet.hsts({maxAge: SIX_MONTHS, includeSubdomains: true, force: true}))
    app.disable('x-powered-by')
}

/**
 * Configure the modules static routes
 */
module.exports.initModulesClientRoutes = app => {
    // Setting the app router and static folder
    app.use('/', express.static(path.resolve('./public')))

    // Globbing static routing
    config.folders.client.forEach(staticPath => {
        app.use(staticPath, express.static(path.resolve('./' + staticPath)))
    })
}

/**
 * Configure the modules ACL policies
 */
module.exports.initModulesServerPolicies = app => {
    // Globbing policy files
    config.files.server.policies.forEach(policyPath => {
        require(path.resolve(policyPath)).invokeRolesPolicies()
    })
}

/**
 * Configure the modules server routes
 */
module.exports.initModulesServerRoutes = app => {
    // Globbing routing files
    config.files.server.routes.forEach(routePath => {
        require(path.resolve(routePath))(app)
    })
}

/**
 * Initialize GraphQL server
 */
module.exports.initGraphQLServer = app => {
    // Initialize graphql middleware
    app.use('/graphql', bodyParser.json(), userAuth.isAuthenticated, graphqlExpress(req => {
        return {
            schema,
            context: {token:req.token}
    }}))

    // Route for GraphQL graphical interface
    app.use('/graphiql', graphiqlExpress({
        endpointURL: '/graphql',
    }))
}

/**
 * Configure error handling
 */
module.exports.initErrorRoutes = app => {
    app.use((err, req, res, next) => {
        // If the error object doesn't exists
        if (!err) {
            return next()
        }

        // Log it
        console.error(err.stack)

        // Redirect to error page
        res.redirect('/server-error')
    })
}

/**
 * Configure Socket.io
 */
module.exports.setupDistributionBuild = app => {
    // All routes will resolve to /dist
    app.use(express.static(DIST_DIR))

    app.get('*', (req, res) => {
        res.sendFile(path.join(DIST_DIR, 'index.html'))
    })
}

/**
 * Configure Socket.io
 */
module.exports.configureSocketIO = (app, db) => {
    // Load the Socket.io configuration
    let server = require('./socket.io')(app, db)

    // Return server object
    return server
}

/**
 * Initialize the Express application
 */
module.exports.init = function (db) {
    // Initialize express app
    let app = express().use('*', cors())

    // Initialize pre-flight requests with cors
    app.options('*', cors())

    // Initialize local variables
    this.initLocalVariables(app)

    // Initialize Express middleware
    this.initMiddleware(app)

    // Initialize Express view engine
    this.initViewEngine(app)

    // Initialize Helmet security headers
    this.initHelmetHeaders(app)

    // Initialize modules static client routes, before session!
    this.initModulesClientRoutes(app)

    // Initialize Express session
    this.initSession(app, db)

    // Initialize Modules configuration
    this.initModulesConfiguration(app)

    // Initialize modules server authorization policies
    this.initModulesServerPolicies(app)

    // Initialize modules server routes
    this.initModulesServerRoutes(app)

    // Initialize graphql routes
    this.initGraphQLServer(app)

    // Initialize error routes
    this.initErrorRoutes(app)

    // Setup static route for DIST_DIR
    this.setupDistributionBuild(app)

    // Configure Socket.io
    app = this.configureSocketIO(app, db)

    return app
}
