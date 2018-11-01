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
        let month = date.getMonth()+1;
        let year = date.getFullYear() + '';
        month = (month.length == 1 ? '0': '') + month;
        year = year.substr(year.length - 2)

        const sufixUuid = `-${month}${year}`;
        const uuId = `${uuidv4()}${sufixUuid}`;
        return uuId;
    }

}

/**
 * @returns {Crosscutting}
 */
module.exports = Crosscutting;