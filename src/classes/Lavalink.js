const { EventEmitter } = require('events');
const { Node } = require('./Node.js');

/**
 * @typedef {Object} NodeConfig Configuration for a single lavalink node
 * @prop {String} host The host url for the lavalink node
 * @prop {String} [password=youshallnotpass] The password for the lavalink node
 */

/**
 * @typedef {Object} LavalinkConfig Configuration for lavalink
 * @prop {Array<NodeConfig>} nodes The node configuration for lavalink
 * @prop {String} id The id of the bot account you're using
 * @prop {Number} [shards=1] The number of shards your bot is running
 */

/**
 * Emitted when there is something you need to send to the Discord gateway
 * @event Lavalink#forwardWs
 * @param {String} serverId The id of the server the event is for to make sure it's on the right shard
 * @param {String} data The data to send
 */

class Lavalink extends EventEmitter {
    /**
     * The starting point for using lavalink
     * @param {LavalinkConfig} config The configuration for lavalink
     */
    constructor(config = {}) {
        super();

        this.config = Object.assign({ shards: 1 }, config);
        if (!this.config.nodes.length) throw new Error('At least 1 node is requried');
        if (!this.config.id) throw new Error('The bot id is required');

        /**
         * The players the lavalink instance has access to, mapped by server id
         * @type {Map<Number,Player>}
         */
        this.players = new Map();

        /**
         * Array of nodes
         * @type {Array<Node>}
         */
        this.nodes = config.nodes.map(n => new Node(n, this));

        /**
         * A map of all songs fetched, mapped by track id
         * @type {Map<String,Track>}
         */
        this.songInfo = new Map();
    }

    get bestNode() {
        return this.nodes.sort((n1, n2) => n1.stats.players - n2.stats.players)[0];
    }

    /**
     * The rest object to get tracks from
     * @type {Rest}
     */
    get rest() {
        return this.bestNode.rest;
    }

    addSongInfo(songs) {
        songs.forEach(s => this.songInfo.set(s.track, s));
    }

    /**
     * Adds a new lavalink node
     * @param {NodeConfig} config The configuration for the node to add
     */
    addNode(config) {
        this.nodes.push(new Node(config));
    }

    removeNode(node) {
        this.nodes = this.nodes.filter(n => n !== node);
    }

    removePlayer(serverId) {
        this.players.get(serverId).node.players.delete(serverId);
        this.players.delete(serverId);
    }

    /**
     * Joins a voice channel
     * @param {String} serverId The id of the server where the voice channel is
     * @param {String} channelId The id of the channel to join
     * @returns {Player} The player for the channel
     */
    join(serverId, channelId) {
        return this.bestNode.join(serverId, channelId);
    }

    /**
     * Updates the voice state
     * @param {Object} data The parsed "d" property of the JSON returned from the Discord VOICE_STATE_UPDATE event
     */
    voiceStateUpdate(data) {
        try {
            this.players.get(data.guild_id).voiceStateUpdate(data.session_id);
        }
        catch (e) { }
    }

    /**
     * Updates the voice server
     * @param {Object} data The parsed "d" property of the JSON returned from the Discord VOICE_SERVER_UPDATE event
     */
    voiceServerUpdate(data) {
        try {
            this.players.get(data.guild_id).voiceServerUpdate(data);
        }
        catch (e) { }
    }
}

module.exports = { Lavalink };