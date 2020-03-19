/**
 * Credit: This code is a modified version of `winston-namespace` by `@SetaSouto`:
 * 	https://github.com/SetaSouto/winston-namespace
 *
 * The source is updated to:
 *
 * 1. Use a customized base configuration so as to streamline the logger initialization API
 * (i.e. avoid overriding the base configuration when instantiating each logger object).
 * 2. Maintain existing debug logg filtering behavior with the `DEBUG` environemnt variable
 * (and not the `LOG_NAMESPACES` variable used in the original source).
 *
 */

/**
 * External Dependencies
 */
const state = require( 'lib/state' );
const namespaces = require( './namespaces' );
const { createLogger, format, transports } = require( 'winston' );

const maxFiles = 3;
const maxsize = 15000000;

module.exports = ( namespace, options ) => {
	if ( !options || typeof options !== 'object' ) options = {}

	const formatMeta = ( args ) => {
		const isObject = typeof args === 'object';
		if ( isObject ) {
			return `${ Object.keys( args ).length ? JSON.stringify( args ) : '' }`;
		}
		return args;
	}

	const baseformat = format.combine(
		format.timestamp( {
			format: 'YYYY-MM-DD HH:mm:ss.SSS'
		} ),
		format.splat(),
		format.errors( { stack: true } ),
		format.printf( ( info ) => {
			const { timestamp, level, message, ...args } = info;
			let meta = info.stack ? `\n${ info.stack }` : formatMeta( args );
			return `[${ timestamp }] [${ namespace }] [${ level }] ${ message }` + meta;
		} ) );

	const baseOptions = {
		level: process.env.LOG_LEVEL || 'silly',
		transports: [
			new transports.File( {
				filename: state.getLogPath(),
				maxFiles,
				maxsize,
				format: baseformat
			} )
		]
	};

	const enabled = namespaces.check( namespace )
	let logger = createLogger( { ...baseOptions, ...options } );
	if ( process.env.DEBUG ) {
		logger.add( new transports.Console( {
			format: baseformat
		} ) );
	}

	return {
		error: ( message, meta ) => logger.error( message, meta ),
		warn: ( message, meta ) => logger.warn( message, meta ),
		info: ( message, meta ) => logger.info( message, meta ),
		debug: ( message, meta ) => { if ( enabled ) logger.debug( message, meta ) }, // eslint-disable-line brace-style
		silly: ( message, meta ) => { if ( enabled ) logger.silly( message, meta ) }  // eslint-disable-line brace-style
	}
}
