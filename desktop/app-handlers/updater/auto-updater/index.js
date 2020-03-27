'use strict';

/**
 * External Dependencies
 */
const { app, BrowserWindow } = require( 'electron' );
const { autoUpdater } = require( 'electron-updater' )

/**
 * Internal dependencies
 */
const AppQuit = require( 'lib/app-quit' );
const Config = require( 'lib/config' );
const debugTools = require( 'lib/debug-tools' );
const { bumpStat, sanitizeVersion, getPlatform } = require( 'lib/desktop-analytics' );
const Updater = require( 'lib/updater' );
const log = require( 'lib/logger' )( 'desktop:updater:auto' );

const statsPlatform = getPlatform( process.platform )
const sanitizedVersion = sanitizeVersion( app.getVersion() );

const getStatsString = ( isBeta ) => `${statsPlatform}${isBeta ? '-b' : ''}-${sanitizedVersion}`;

function dialogDebug( message ) {
	log.info( message );

	if ( Config.build === 'updater' ) {
		debugTools.dialog( message );
	}
}

class AutoUpdater extends Updater {
	constructor( options = {} ) {
		super( options );

		autoUpdater.on( 'error', this.onError.bind( this ) );
		autoUpdater.on( 'update-available', this.onAvailable.bind( this ) );
		autoUpdater.on( 'update-not-available', this.onNotAvailable.bind( this ) );
		autoUpdater.on( 'update-downloaded', this.onDownloaded.bind( this ) );

		autoUpdater.autoInstallOnAppQuit = false;
		autoUpdater.allowDowngrade = true;
		autoUpdater.channel = 'stable';
		autoUpdater.allowPrerelease = false;

		if ( this.beta ) {
			autoUpdater.channel = 'beta';
			autoUpdater.allowPrerelease = true;
			autoUpdater.allowDowngrade = false;
		}
	}

	ping() {
		dialogDebug( 'Checking for update' );
		autoUpdater.checkForUpdates();
	}

	onAvailable( info ) {
		log.info( 'New update is available', info.version )
		bumpStat( 'wpcom-desktop-update-check', `${getStatsString( this.beta )}-needs-update` );
	}

	onNotAvailable() {
		log.info( 'No update is available' )
		bumpStat( 'wpcom-desktop-update-check', `${getStatsString( this.beta )}-no-update` );
	}

	onDownloaded( info ) {
		log.info( 'Update downloaded', info.version );

		this.setVersion( info.version );
		this.notify();

		const stats = {
			'wpcom-desktop-download': `${statsPlatform}-app`,
			'wpcom-desktop-download-by-ver': `${statsPlatform}-app-${sanitizedVersion}`,
			'wpcom-desktop-download-ref': `update-${statsPlatform}-app`,
			'wpcom-desktop-download-ref-only': 'update',
		}
		bumpStat( stats );
	}

	onConfirm() {
		AppQuit.allowQuit();

		// Ref: https://github.com/electron-userland/electron-builder/issues/1604
		app.removeAllListeners( 'window-all-closed' );
		const windows = BrowserWindow.getAllWindows();
		for ( let i = 0; i < windows.length; i++ ) {
			const window = windows[i];
			window.close()
		}

		// Ref: https://github.com/electron-userland/electron-builder/issues/4143#issuecomment-521850797
		autoUpdater.quitAndInstall();

		bumpStat( 'wpcom-desktop-update', `${getStatsString( this.beta )}-confirm` );
	}

	onCancel() {
		bumpStat( 'wpcom-desktop-update', `${getStatsString( this.beta )}-update-cancel` );
	}

	onError( event ) {
		log.error( 'Update error', event );

		bumpStat( 'wpcom-desktop-update', `${getStatsString( this.beta )}-update-error` );
	}
}

module.exports = AutoUpdater;
