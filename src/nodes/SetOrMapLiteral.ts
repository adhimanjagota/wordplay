import Expression from "./Expression";
import KeyValue from "./KeyValue";
import type Program from "./Program";
import SetOrMapType from "./SetOrMapType";
import type Token from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import Conflict, { IncompatibleValues, NotASetOrMap } from "../parser/Conflict";

import Exception, { ExceptionType } from "../runtime/Exception";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import SetValue from "../runtime/SetValue";
import MapValue from "../runtime/MapValue";
import type Step from "../runtime/Step";
import Halt from "../runtime/Halt";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import type { ConflictContext } from "./Node";

enum SetKind { Set, Map, Neither };

export default class SetOrMapLiteral extends Expression {

    readonly open: Token;
    readonly values: (Unparsable|Expression|KeyValue)[];
    readonly close: Token;
    readonly bind?: Token;
    readonly kind: SetKind;

    constructor(open: Token, values: (Unparsable|Expression|KeyValue)[], close: Token, bind?: Token) {
        super();

        this.open = open;
        this.values = values.slice();
        this.close = close;
        this.bind = bind;
        
        // Must all be expressions or all key/values
        const allExpressions = this.values.every(v => v instanceof Expression);
        const allKeyValue = this.values.every(v => v instanceof KeyValue);

        this.kind = bind ? SetKind.Map : allExpressions ? SetKind.Set : allKeyValue ? SetKind.Map : SetKind.Neither;
        
    }

    getChildren() {
        return [ this.open, ...this.values, this.close, ... (this.bind ? [ this.bind ] : []) ];
    }

    getConflicts(context: ConflictContext): Conflict[] { 
        
        // Must all be expressions or all key/values
        if(this.kind === SetKind.Neither)
            return [ new NotASetOrMap(this)]

        // If all expressions. they must all be of the same type.
        if(this.kind === SetKind.Set) {
            const types = (this.values.filter(v => v instanceof Expression) as Expression[]).map(e => e.getType(context));
            if(types.length > 1 && !types.every(t => t.isCompatible(context, types[0])))
                return [ new IncompatibleValues(this) ]
        }
        else if(this.kind === SetKind.Map) {
            const conflicts = [];
            const keyTypes = 
                ((this.values.filter(v => v instanceof KeyValue) as KeyValue[])
                .map(k => k.key)
                .filter(k => k instanceof Expression) as Expression[])
                .map(k => k.getType(context));
            if(keyTypes.length > 1 && !keyTypes.every(t => t.isCompatible(context, keyTypes[0])))
                conflicts.push(new IncompatibleValues(this));
            const valueTypes = 
                ((this.values.filter(v => v instanceof KeyValue) as KeyValue[])
                .map(v => v.value)
                .filter(v => v instanceof Expression) as Expression[])
                .map(v => v.getType(context));
            if(valueTypes.length > 1 && !valueTypes.every(t => t.isCompatible(context, valueTypes[0])))
                conflicts.push(new IncompatibleValues(this));
            return conflicts;
        }
        
        // Otherwise, no conflicts.
        return [];

    }

    getType(context: ConflictContext): Type {
        const values = this.values.filter(v => !(v instanceof Unparsable)) as (Expression|KeyValue)[];
        if(values.length === 0) return new UnknownType(this);

        const firstValue = this.values[0];
        if(firstValue instanceof KeyValue) 
            return firstValue.key instanceof Unparsable || firstValue.value instanceof Unparsable ? 
                new UnknownType(this) : 
                new SetOrMapType(firstValue.key.getType(context), firstValue.value.getType(context));
        else if(firstValue instanceof Expression) return new SetOrMapType(firstValue.getType(context));
        else return new UnknownType(this);
    }

    compile(): Step[] {
        return this.kind === SetKind.Neither ?
            [ new Halt(new Exception(ExceptionType.EXPECTED_TYPE), this)] :
            [
                new Start(this),
                // Evaluate all of the item or key/value expressions
                ...this.values.reduce(
                    (steps: Step[], item) => [
                        ...steps, 
                        ...(this.kind === SetKind.Set ? 
                            // Evaluate all of the set item expressions
                            (item as Expression).compile() : 
                            // Evaluate all of the key/value pairs
                            [...(item as KeyValue).key.compile(), ...(item as KeyValue).value.compile()])
                    ], []),
                // Then build the set or map.
                new Finish(this)
            ];
    }

    evaluate(evaluator: Evaluator): Value {

        // Which value are we on?
        if(this.kind === SetKind.Set) {
            // Pop all of the values. Order doesn't matter.
            const values = [];
            for(let i = 0; i < this.values.length; i++)
                values.push(evaluator.popValue());
            return new SetValue(values);
        }
        else {
            // Pop all of the values. Order doesn't matter.
            const values: [Value, Value][] = [];
            for(let i = 0; i < this.values.length; i++) {
                const value = evaluator.popValue();
                const key = evaluator.popValue();
                values.push([ key, value ]);
            }
            return new MapValue(values);
       }
            
    }

}