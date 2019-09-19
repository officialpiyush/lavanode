class Queue {
    /**
     * The class used to create a queue
     */
    constructor() {
        /**
         * The player the queue is playing on
         * @type {Player?}
         */
        this.player = null;

        /**
         * The songs currently in the queue, an array of track ids
         * @type {Array<String>}
         */
        this.songs = [];

        this.playing = false;
        this.skipping = false;
    }

    play(playReplaced) {
        if (!this.player) return this.stop();
        if (!this.songs.length) return this.stop(this.skipping);

        const song = this.songs.shift();

        this.playing = true;
        this.player.play(song);

        const registerEvent = () => {
            this.player.once('trackEnd', (track, reason, playNext) => {
                if (this.skipping) return this.skipping = false;

                if (track.track !== song) return registerEvent();
                if (!playReplaced && !playNext) return this.stop();
                if (!playReplaced && reason === 'REPLACED') return this.stop();

                this.playing = false;
                if (this.songs.length) this.start(this.player);
                else if (playReplaced) registerEvent(playReplaced = false);
                else this.stop();
            });
        };
        registerEvent();
    }

    start(player) {
        if (!player) return;
        if (!this.skipping && this.playing) return false;

        this.player = player;
        this.player.queue = this;

        if (this.songs.length) this.play(this.skipping);
        else if (this.skipping) this.stop(true);

        return true;
    }

    stop(stopPlayer) {
        if (!this.player) return;

        this.player.queue = null;
        this.player.emit('queueFinish');

        if (stopPlayer) this.player.stop();
        this.player = null;
    }

    // TODO accept an array
    /**
     * Adds a song to the queue
     * @param {String} song Lavalink track id
     * @returns {String} The id of the added song
     */
    add(song) {
        this.songs.push(song);

        this.start(this.player);

        return song;
    }

    /**
     * Skips to a song in the queue
     * @param {Number} index The index of the song to skip to
     * @returns {Boolean} True to indicate success, or false to indicate failure
     */
    skipTo(index) {
        if (!this.playing) return false;

        this.skipping = true;
        this.songs.splice(0, index);

        return this.start(this.player);
    }

    /**
     * Skips the currently playing song, a shortcut for Queue#skipTo(0)
     * @returns {Boolean} True to indicate success, or false to indicate failure
     */
    skip() {
        return this.skipTo(0);
    }

    /**
     * Removes a song from the queue
     * @param {Number} index The index of the song to remove
     * @returns {Boolean} True to indicate success
     */
    remove(index) {
        this.songs.splice(index, 1);

        return true;
    }

    // TOOD static from() {}
    // Creates a new queue from a search result
}

module.exports = { Queue };