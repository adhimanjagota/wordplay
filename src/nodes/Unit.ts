import { BOOLEAN_TYPE_SYMBOL, EXPONENT_SYMBOL, LANGUAGE_SYMBOL, PRODUCT_SYMBOL } from "../parser/Tokenizer";
import Dimension from "./Dimension";
import Token from "./Token";
import Type from "./Type";
import type Node from "./Node";
import Measurement from "../runtime/Measurement";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import type TypeSet from "./TypeSet";
import type { NativeTypeName } from "../native/NativeConstants";

export default class Unit extends Type {

    /** In case this was parsed, we keep the original tokens around. */
    readonly numerator: Dimension[];
    readonly slash?: Token;
    readonly denominator: Dimension[];

    /** We store units internally as a map from unit names to a positive or negative non-zero exponent. */
    readonly exponents: Map<string, number>;

    constructor(exponents: (undefined|Map<string, number>)=undefined, numerator?: (Dimension[]|undefined), slash?: Token, denominator?: Dimension[]) {

        super();

        // Did we parse it? Convert to exponents.
        if(exponents === undefined) {

            this.numerator = numerator ?? [];
            this.slash = slash;
            this.denominator =  denominator ?? [];

            this.exponents = new Map();
            
            for(const dim of this.numerator) {
                const name = dim.getName();
                const exp = dim.exponent === undefined ? 1 : new Measurement(this, dim.exponent.getText()).toNumber();
                const current = this.exponents.get(name);
                this.exponents.set(name, (current ?? 0) + exp);
            }
            for(const dim of this.denominator) {
                const name = dim.getName();
                const exp = dim.exponent === undefined ? -1 : -(new Measurement(this, dim.exponent.getText()).toNumber());
                const current = this.exponents.get(name);
                this.exponents.set(name, (current ?? 0) + exp);
            }
        
            // Eliminate any 0 exponent units.
            for(const [ unit, exp ] of this.exponents)
                if(exp === 0)
                    this.exponents.delete(unit);

        }
        else {
            // Set the exponents directly, if given.
            if(exponents !== undefined) {
                const cleanExponents = new Map();
                // Eliminate any 0 exponent units.
                for(const unit of exponents.keys())
                    if(exponents.get(unit) !== 0) cleanExponents.set(unit, exponents.get(unit));
                this.exponents = cleanExponents;

            }
            else
                this.exponents = new Map();

            this.numerator = [];
            this.denominator = [];
        }

        this.computeChildren();

    }

    static Empty = new Unit()
    static Wildcard = (() => {
        const exp = new Map();
        exp.set(BOOLEAN_TYPE_SYMBOL, 1);
        return new Unit(exp);
    })()

    getGrammar() { 
        return [
            { name: "numerator", types: [[ Dimension ]] },
            { name: "slash", types: [ Token, undefined ] },
            { name: "denominator", types: [[ Dimension ]] },
        ]; 
    }

    replace(original?: Node, replacement?: Node) { 
        return new Unit(
            this.exponents === undefined ? undefined : new Map(this.exponents),
            this.replaceChild("numerator", this.numerator, original, replacement), 
            this.replaceChild("slash", this.slash, original, replacement), 
            this.replaceChild("denominator", this.denominator, original, replacement), 
        ) as this; 
    }

    static map(numerator: string[], denominator: string[]) {

        const exponents = new Map<string, number>();
        for(const unit of numerator)
            exponents.set(unit, exponents.has(unit) ? (exponents.get(unit) ?? 0) + 1 : 1);
        for(const unit of denominator)
            exponents.set(unit, exponents.has(unit) ? (exponents.get(unit) ?? 0) - 1 : -1);
        return exponents;

    }

    static unit(numerator: string[], denominator: string[]=[]) {
        return Unit.get(Unit.map(numerator, denominator));
    }

    /** A unit pool, since they recur so frequently. We map the exponents to a unique string */
    static Pool = new Map<string, Unit>()

    static get(exponents: Map<string, number>) {

        // Convert the exponents to a canonical string
        let hash = "";
        for(const key of Array.from(exponents.keys()).sort())
            hash += `${key}${exponents.get(key)}`;

        // See if the string is in the pool
        const cache = Unit.Pool.get(hash);
        if(cache)
            return cache;

        // Make a new one if not.
        const newUnit = new Unit(exponents);
        Unit.Pool.set(hash, newUnit);
        return newUnit;

    }


    isWildcard() { return this.exponents.get("?") === 1; }
    isUnitless() { return this.exponents.size === 0; }

    isEqualTo(unit: Unit) {
        return this.exponents.size === unit.exponents.size && Array.from(this.exponents.keys()).every(key => this.exponents.get(key) === unit.exponents.get(key))
    }

    computeConflicts() {}

    accepts(unit: Unit): boolean {
        // Every key in this exists in the given unit and they have the same exponents.
        return this.isEqualTo(unit);
    }

    acceptsAll(types: TypeSet): boolean {
        return Array.from(types.set).every(type => type instanceof Unit && this.accepts(type));
    }

    getNativeTypeName(): NativeTypeName { return "unit"; }

    toString(depth?: number) {

        const units = Array.from(this.exponents.keys()).sort();
        const numerator = units.filter(unit => (this.exponents.get(unit) ?? 0) > 0);
        const denominator = units.filter(unit => (this.exponents.get(unit) ?? 0) < 0);

        return (depth === undefined ? "" : "\t".repeat(depth)) + 
            numerator.map(unit => `${unit}${(this.exponents.get(unit) ?? 0) > 1 ? `${EXPONENT_SYMBOL}${this.exponents.get(unit)}` : ""}`).join(PRODUCT_SYMBOL) +
            (denominator.length > 0 ? LANGUAGE_SYMBOL : "") + 
            denominator.map(unit => `${unit}${(this.exponents.get(unit) ?? 0) < -1 ? `${EXPONENT_SYMBOL}${Math.abs(this.exponents.get(unit) ?? 0)}` : ""}`).join(PRODUCT_SYMBOL);

    }

    root(root: number) {

        const newExponents = new Map();

        // Subtract one from every unit's exponent, and if it would be zero, set it to -1.
        for(const [unit, exponent] of this.exponents)
            newExponents.set(unit, exponent === 1 ? -(root - 1) : exponent - (root - 1))
        
        return Unit.get(newExponents);
    
    }

    product(operand: Unit) {

        const newExponents = new Map(this.exponents);

        // Add the given units' exponents to the existing exponents
        for(const [unit, exponent] of operand.exponents) {
            const currentExponent = newExponents.get(unit);
            newExponents.set(unit, (currentExponent ?? 0) + exponent); 
        }
        
        return Unit.get(newExponents);

    }

    quotient(operand: Unit) {
        
        const newExponents = new Map(this.exponents);

        // Subtract the given units' exponents from the existing exponents
        for(const [unit, exponent] of operand.exponents) {
            const currentExponent = newExponents.get(unit)
            newExponents.set(unit, (currentExponent ?? 0) - exponent); 
        }
        
        return Unit.get(newExponents);

    }

    power(exponent: number) {
    
        // Multiply the exponents by the given exponent.
        const newExponents = new Map(this.exponents);

        // Multiply the units by the power.
        for(const [unit, exp] of this.exponents) {
            newExponents.set(unit, exp * exponent); 
        }

        return Unit.get(newExponents);
        
    }
    
    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: this.exponents.size === 0 ? "a number" : 
                this.numerator.length === 1 && this.denominator.length === 0 ? this.numerator[0].getDescriptions().eng :
                this.toWordplay() === "m/s" ? "velocity" :
                "a number with unit"
        }
    }

}