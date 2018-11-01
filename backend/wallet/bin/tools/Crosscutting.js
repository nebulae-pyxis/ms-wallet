'use strict'

const uuidv4 = require("uuid/v4");

class Crosscutting{

    /**
     * Generates an uuid based on the uuid/v4 library and at the end 
     * of this uuid concatenates the month and the year. 
     * This is useful for cases where the info will be stored in collections by month.
     * 
     * @param {*} date Date with which will be generated the suffix of the uuid.
     */
    static generateHistoricalUuid(date){
        const month = date.getMonth()+1;
        const year = date.getFullYear();
        const sufixUuid = `-${month}${year}`;
        const uuId = `${uuidv4()}${sufixUuid}`;
        return uuId;
    }

}

/**
 * @returns {Crosscutting}
 */
module.exports = Crosscutting;