'use strict';

/**
 * External Dependencies
 */
const path = require( 'path' );
const app = require( 'electron' ).app;
const { existsSync, mkdirSync } = require( 'fs' );

/**
 * Internal dependencies
 */
const state = require( './lib/state' );
const config = require( './lib/config' );

const appData = path.join( app.getPath( 'appData' ), config.appPathName );

// Initialize log path prior to requiring any modules that enable logging
const logPath = path.join( appData, 'logs', 'wp-desktop.log' );
if ( ! existsSync( path.dirname( logPath ) ) ) {
	mkdirSync( path.dirname( logPath ), { recursive: true }, ( err ) => {
		if ( err ) {
			throw new Error( 'Failed to initialize log directory: %o', err );
		}
	} );
}
state.setLogPath( logPath );

// Initialize settings
const Settings = require( './lib/settings' );

// Catch-all error handler
// We hook in very early to catch issues during the startup process
require( './app-handlers/exceptions' )();

/**
 * Module variables
 */

// if app path set to asar, switch to the dir, not file
var apppath = app.getAppPath();
if ( path.extname( apppath ) === '.asar' ) {
	apppath = path.dirname( apppath );
}
process.chdir( apppath );

process.env.CALYPSO_ENV = config.calypso_config;

// Set app config path
app.setPath( 'userData', appData );

if ( Settings.isDebug() ) {
	process.env.DEBUG = config.debug.namespace;
}

/**
 * These setup things for Calypso. We have to do them inside the app as we can't set any env variables in the packaged release
 * This has to come after the DEBUG_* variables
 */
const log = require( 'lib/logger' )( 'desktop:boot' );
log.info( `Booting ${ config.appPathName + ' v' + config.version }` );
log.info( `App Path: ${ app.getAppPath() }` );
log.info( 'Server: ' + config.server_url + ':' + config.server_port );
log.info( 'Settings:', Settings._getAll() );

if ( Settings.getSetting( 'proxy-type' ) === '' ) {
	log.info( 'Proxy: none' );
	app.commandLine.appendSwitch( 'no-proxy-server' );
} else if ( Settings.getSetting( 'proxy-type' ) === 'custom' ) {
	log.info( 'Proxy: ' + Settings.getSetting( 'proxy-url' ) + ':' + Settings.getSetting( 'proxy-port' ) );
	app.commandLine.appendSwitch( 'proxy-server', Settings.getSetting( 'proxy-url' ) + ':' + Settings.getSetting( 'proxy-port' ) );

	if ( Settings.getSetting( 'proxy-pac' ) !== '' ) {
		log.info( 'Proxy PAC: ' + Settings.getSetting( 'proxy-pac' ) );

		// todo: this doesnt seem to work yet
		app.commandLine.appendSwitch( 'proxy-pac-url', Settings.getSetting( 'proxy-pac' ) );
	}
}

// Define a global 'desktop' variable that can be used in browser windows to access config and settings
global.desktop = {
	config: config,
	settings: Settings,
};
