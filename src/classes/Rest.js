const { URL } = require('url');
const fetch = require('node-fetch');

/**
 * @typedef {Object} TrackInfo Details about a specific track
 * @prop {String} identifier The id of the song
 * @prop {Boolean} isSeekable Whether or not the track is seekable
 * @prop {String} author The author of the song
 * @prop {Number} length The length (in ms) of the song
 * @prop {Boolean} isStream Whether or not the track is a stream
 * @prop {Number} position The position of the track in the array
 * @prop {String} title The title of the song
 * @prop {String} uri The url to get to the song
 */

/**
 * @typedef {Object} Track A track from the lavalink REST API
 * @prop {String} track The track id
 * @prop {TrackInfo} info Information about the track
 */

/**
 * @typedef {Object} Playlist
 * @prop {String} name The name of the playlist
 * @prop {String} selected The position of the selected track
 * @prop {Array<Track>} tracks The tracks included in the playlist
 */

class Rest {
    /**
     * The class to use the lavalink REST API
     */
    constructor(config, node) {
        this._config = config;

        this.node = node;
    }

    /**
     * Gets information about a track or searches for tracks
     * @async
     * @param {String} query The search query to pass to lavalink
     * @returns {Promise<Array<Track>|Playlist>} The array of tracks returned or the playlist object
     */
    async search(query) {
        const url = new URL(`http://${this._config.host}/loadtracks`);
        url.searchParams.append('identifier', query);

        const response = await fetch(url, {
            headers: {
                Authorization: this._config.password
            }
        });

        const data = await response.json();

        try {
            this.node.lavalink.addSongInfo(data.tracks);
        }
        catch (e) { }

        switch (data.loadType) {
            case 'TRACK_LOADED':
                return {
                    tracks: data.tracks
                };
            case 'SEARCH_RESULT':
                return data;
            case 'NO_MATCHES':
                return data.tracks;
            case 'PLAYLIST_LOADED':
                return {
                    name: data.playlistInfo.name,
                    selected: data.playlistInfo.selectedTrack,
                    tracks: data.tracks
                };

            case 'LOAD_FAILED':
                throw new Error('Loading tracks failed');
        }

        return data;
    }
}

module.exports = { Rest };