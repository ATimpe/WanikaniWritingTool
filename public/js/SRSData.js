class SRSData {
    constructor() {
        this.entries = [];
        this.WKLevel = 1;
    }

    addEntry(kanji) {
        if (!this.hasEntry(kanji)) {
            this.entries.push(new SRSEntry(kanji));
        }
    }

    getEntry(kanji) {
        for (const entry of this.entries) {
            if (entry.kanji == kanji) return entry;
        }

        return null;
    }

    increaseEntrySRS(kanji) {
        let entry = this.getEntry(kanji);
        entry.SRSLevel++;
        entry.dateLastStudied = new Date();
    }

    decreaseEntrySRS(kanji) {
        let entry = this.getEntry(kanji);
        if (entry.SRSLevel > 0) entry.SRSLevel--;
        entry.dateLastStudied = new Date();
    }

    increaseWKLevel() {
        this.WKLevel++;
    }

    hasEntry(kanji) {
        for (const entry of this.entries) {
            if (entry.kanji == kanji) return true;
        }

        return false;
    }
}

class SRSEntry {
    constructor(kanji) {
        this.kanji = kanji;
        this.SRSLevel = 0;
        this.dateLastStudied = new Date();
    }
}

module.exports = {
    SRSData, SRSEntry
};