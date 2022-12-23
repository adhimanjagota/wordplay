import Node from "./Node";
import Token from "./Token";
import NameToken from "./NameToken";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class Dimension extends Node {

    readonly name: Token;
    readonly caret?: Token;
    readonly exponent?: Token;

    constructor(name: Token | string, caret?: Token, exponent?: Token) {
        super();

        this.name = typeof name === "string" ? new NameToken(name) : name;
        this.caret = caret === undefined ? undefined : caret;
        this.exponent = exponent === undefined ? undefined : exponent;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "name", types:[ Token ] },
            { name: "caret", types:[ Token, undefined ] },
            { name: "exponent", types:[ Token, undefined ] },
        ]; 
    }

    replace(original?: Node, replacement?: Node) { 
        return new Dimension(
            this.replaceChild("name", this.name, original, replacement), 
            this.replaceChild("caret", this.caret, original, replacement),
            this.replaceChild("exponent", this.exponent, original, replacement)
        ) as this; 
    }

    getName() { return this.name.getText(); }

    computeConflicts() {}

    getDescriptions(): Translations {
        const dim = this.getName();
        return {
            "😀": TRANSLATE,
            eng: 
                dim === "pm" ? "picometers" :
                dim === "nm" ? "nanometers" :
                dim === "µm" ? "micrometers" :
                dim === "mm" ? "millimeters" :
                dim === "m" ? "meters" :
                dim === "cm" ? "centimeters" :
                dim === "dm" ? "decimeters" :
                dim === "m" ? "meters" :
                dim === "km" ? "kilometers" :
                dim === "Mm" ? "megameters" :
                dim === "Gm" ? "gigameters" :
                dim === "Tm" ? "terameters" :
                dim === "mi" ? "miles" :
                dim === "in" ? "inches" :
                dim === "ft" ? "feet" :
                dim === "ms" ? "milliseconds" :
                dim === "s" ? "seconds" :
                dim === "min" ? "minutes" :
                dim === "hr" ? "hours" :
                dim === "day" ? "days" :
                dim === "wk" ? "weeks" :
                dim === "yr" ? "years" :
                dim === "g" ? "grams" :
                dim === "mg" ? "milligrams" :
                dim === "kg" ? "kilograms" :
                dim === "oz" ? "ounces" :
                dim === "lb" ? "pounds" :
                dim === "pt" ? "font size" :
                "A dimension"
            }
    }

}