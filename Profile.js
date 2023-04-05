class ProfileValueAdjustment {

    constructor(initialValue, modifier) {
        this.initialValue = initialValue;
        this.modifier = modifier;
    }

    modifyByIndexAndGetHex(index) {

        if (!this.modifier) {
            return this.initialValue;
        }

        let value = this.initialValue;

        if (this.modifier instanceof Array) {
            for (let i = 0; i < index; i++) {
                value += this.modifier[i % this.modifier.length];
            }
        } else {
            value += index * this.modifier;
        }

        return value;
    }
}

class Profile {

    constructor(id, values) {
        this.id = id;
        this.values = values;
    }

    getId() {
        return this.id;
    }

    /**
     * Get modified hex value by ID
     * @param index 0 = -5%, 5 = 0%, 10 = 5% (Edge curve slider customization)
     */
    getHexValuesByIndex(index) {
        return this.values.map(value => value.modifyByIndexAndGetHex(index));
    }
}

module.exports = {
    Profile,
    ProfileValueAdjustment
};