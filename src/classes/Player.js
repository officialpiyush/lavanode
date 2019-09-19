const { EventEmitter } = require('events');
const { Queue } = require('./Queue.js');

/**
 * @typedef {Object} PlayerState The state of a lavalink player
 * @prop {Number} position The position of the player in the current playing track
 * @prop {Number?} time The UNIX timestamp from the lavalink server
 * @prop {Number} localTime The local UNIX timestamp
 */

/**
 * @typedef {String} EndReason The reason a track ended, either "FINISHED", "LOAD_FAILED", "STOPPED", "REPLACED", "CLEANUP"
 */

/**
 * @typedef {Object} PlayOptions The options to play a song with
 * @prop {Number} [startTime=0] The time to start the track from
 * @prop {Number} [endTime=Total Length] The time to end the track at
 */

class Player extends EventEmitter {
    /**
     * An interface to play music to a channel
     */
    constructor(node, serverId) {
        super();

        this.node = node;

        /**
         * The id of the server the player is for
         * @type {String}
         */
        this.serverId = serverId;
        this.sessionId = null;

        /**
         * The queue playing if there is one
         * @type {Queue?}
         */
        this.queue = null;

        this.setDefaults();
    }

    voiceStateUpdate(sessionId) {
        this.sessionId = sessionId;
    }

    voiceServerUpdate(data) {
        this.node.voiceServerUpdate(data, this.serverId, this.sessionId);
    }

    setDefaults() {
        /**
         * The currently playing track, or null if nothing is playing
         * @type {Track?}
         */
        this.nowPlaying = null;
        this.next = null;

        /**
         * The current state of the player
         * @type {PlayerState?}
         */
        this.state = null;

        /**
         * Whether or not the music is currently paused
         * @type {Boolean}
         */
        this.paused = false;

        /**
         * The current volume
         * @type {Number}
         */
        this.volume = 100;
    }

    update(state) {
        /**
         * Fires when lavalink sends in information about the current state
         * @event Player#update
         * @param {PlayerState} state The player's state
         */
        this.emit('update', state);

        this.state = Object.assign(state, { localTime: Date.now() });
    }

    async event(type, data) {
        data.track = this.nowPlaying;
        this.nowPlaying = this.next;

        switch (type) {
            case 'TrackEndEvent':
                const playNext = ['FINISHED', 'LOAD_FAILED'].indexOf(data.reason) !== -1;

                if (data.reason !== 'REPLACED') this.setDefaults();

                /**
                 * Fires when the current song ends
                 * @event Player#trackEnd
                 * @param {Track} track The track that ended
                 * @param {EndReason} reason The reason the track ended
                 * @param {Boolean} playNext Whether or not more songs should be played after this
                 */
                this.emit('trackEnd', data.track, data.reason, playNext);
                break;

            case 'TrackExceptionEvent':
                this.setDefaults();

                /**
                 * Fires when there is an error playing a track
                 * @event Player#trackError
                 * @param {Track} track The track that caused an error
                 * @param {String} error The error from lavalink
                 */
                this.emit('trackError', data.track, data.error);
                break;

            case 'TrackStuckEvent':
                /**
                 * Fires when the track gets stuck
                 * @event Player#trackStuck
                 * @param {Track} track The track that is stuck
                 * @param {Number} thresholdMs The threshold for being stuck
                 */
                this.emit('trackStuck', data.track, data.thresholdMs);
                break;

            case 'WebSocketClosedEvent':
                /**
                 * Fires when the Discord voice WebSockets are closed
                 * @event Player#wsClosed
                 * @param {Number} code The error code from Discord
                 * @param {String} reason The reason the connection was closed
                 * @param {Boolean} byRemote Whether or not the connection was closed by a remote source
                 */
                this.emit('wsClosed', data.code, data.reason, data.byRemote);
                this.destroy();
                break;
        }
    }

    /**
     * The position in the current playing song in ms (-1 if no song is playing)
     * @type {Number}
     */
    get position() {
        if (!this.nowPlaying) return -1;

        return this.state.position + (Date.now() - this.state.localTime);
    }

    /**
     * Plays a song on the current player
     * @param {String|Queue} track The track id from lavalink to play or a queue class to play a queue
     * @param {PlayOptions} [options={}] The options to play the song with
     * @returns {Track} The song played
     */
    play(track, options) {
        if (track instanceof Queue) return track.start(this);

        const packet = Object.assign({
            op: 'play',
            guildId: this.serverId,
            track
        }, options);

        this.next = this.node.lavalink.songInfo.get(track);

        if (!this.nowPlaying) this.nowPlaying = this.next;

        this.node.ws.send(JSON.stringify(packet));
        return this.next;
    }

    /**
     * Stops the music
     * @returns {Boolean} Returns true if the music was stopped, false if it wasn't playing
     */
    stop() {
        if (!this.nowPlaying) return false;

        const packet = {
            op: 'stop',
            guildId: this.serverId
        };

        this.node.ws.send(JSON.stringify(packet));
        return true;
    }

    /**
     * Pauses the music
     * @returns {Boolean} Returns false if the music is already paused, returns true if is successfully paused
     */
    pause() {
        if (this.paused) return false;

        const packet = {
            op: 'pause',
            guildId: this.serverId,
            pause: true
        };

        this.paused = true;
        this.node.ws.send(JSON.stringify(packet));
        return true;
    }

    /**
     * Resumes the music
     * @returns {Boolean} Returns false if the music is already playing, returns true if is successfully resumed
     */
    resume() {
        if (!this.paused) return false;

        const packet = {
            op: 'pause',
            guildId: this.serverId,
            pause: false
        };

        this.paused = false;
        this.node.ws.send(JSON.stringify(packet));
        return true;
    }

    /**
     * Seeks to a position in the currently playing track by a time in ms
     * @param {Number} position Position in the song to seek to
     * @returns {Boolean} Returns false if there is no music playing, returns true if the position is updated
     */
    seek(position) {
        if (!this.nowPlaying) return false;

        const packet = {
            op: 'seek',
            guildId: this.serverId,
            position
        };

        this.state = { position, time: null, localTime: Date.now() };
        this.node.ws.send(JSON.stringify(packet));
        return true;
    }

    /**
     * Sets the volume of the music
     * @param {Number} volume The volume to set - minimum of 0, maximum of 1000
     * @returns {Number} The new volume
     */
    setVolume(volume) {
        if (volume < 0) volume = 0;
        if (volume > 1000) volume = 1000;

        const packet = {
            op: 'volume',
            guildId: this.serverId,
            volume
        };

        this.volume = volume;
        this.node.ws.send(JSON.stringify(packet));
        return volume;
    }

    /**
     * 
     * @param {Number} band The band to set - minimum of 0, maximum of 1000
     * @param {Number} gain The gain to set - minimum of -0.25, maximum of 1
     * @returns {Object} The new equalizer settings
     */
    setEqualizer(band, gain) {
        if (band > 14) band = 14;
        if (band < 0) band = 0;
        if (gain > 1) gain = 1;
        if (gain < -0.25) gain = -0.25;

        const packet = {
            op: 'equalizer',
            guildId: this.serverId,
            bands: [
                {
                    band,
                    gain
                }
            ]
        };

        this.band = band;
        this.gain = gain;
        this.node.ws.send(JSON.stringify(packet));
        return { band, gain };
    }

    /**
     * Destroys the player
     * @returns {Boolean} Returns true if the player has been destroyed successfully
     */
    destroy(node) {
        const packet = {
            op: 4,
            d: {
                self_deaf: false,
                guild_id: this.serverId,
                channel_id: null,
                self_mute: false
            }
        };

        const lavalinkPacket = {
            op: 'destroy',
            guildId: this.serverId
        };

        this.node.stats.players--;
        if (!node) this.node.ws.send(JSON.stringify(lavalinkPacket));

        this.node.lavalink.emit('forwardWs', this.serverId, JSON.stringify(packet));
        this.node.lavalink.removePlayer(this.serverId);

        return true;
    }
}

module.exports = { Player };