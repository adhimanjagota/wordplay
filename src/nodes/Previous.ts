import type Conflict from "../conflicts/Conflict";
import Expression from "./Expression";
import MeasurementType from "./MeasurementType";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Measurement from "../runtime/Measurement";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import type Context from "./Context";
import { NotAStream } from "../conflicts/NotAStream";
import StreamType from "./StreamType";
import { NotAStreamIndex } from "../conflicts/NotAStreamIndex";
import Stream from "../runtime/Stream";
import KeepStream from "../runtime/KeepStream";
import type Bind from "./Bind";
import type { TypeSet } from "./UnionType";
import TypeException from "../runtime/TypeException";
import AnyType from "./AnyType";
import Name from "./Name";
import TokenType from "./TokenType";
import getPossibleExpressions from "./getPossibleExpressions";
import { PREVIOUS_SYMBOL } from "../parser/Tokenizer";
import Reference from "./Reference";
import type Transform from "./Transform";

export default class Previous extends Expression {

    readonly stream: Expression | Unparsable;
    readonly previous: Token;
    readonly index: Expression | Unparsable;

    constructor(stream: Expression | Unparsable, index: Expression | Unparsable, previous?: Token) {
        super();

        this.stream = stream;
        this.previous = previous ?? new Token(PREVIOUS_SYMBOL, [ TokenType.PREVIOUS ]);
        this.index = index;
    }

    computeChildren() {
        return [ this.stream, this.previous, this.index ];
    }

    computeConflicts(context: Context): Conflict[] { 
    
        if(this.stream instanceof Unparsable || this.index instanceof Unparsable) return [];

        const streamType = this.stream.getTypeUnlessCycle(context);

        if(!(streamType instanceof StreamType))
            return [ new NotAStream(this, streamType) ];

        const indexType = this.index.getTypeUnlessCycle(context);
        if(!(indexType instanceof MeasurementType) || indexType.unit !== undefined)
            return [ new NotAStreamIndex(this, indexType) ];

        return [];
    
    }

    computeType(context: Context): Type {
        // The type is the stream's type.
        const streamType = this.stream instanceof Unparsable ? new UnknownType(this.stream) : this.stream.getTypeUnlessCycle(context);
        return streamType instanceof StreamType && !(streamType.type instanceof Unparsable)? streamType.type : new UnknownType(this);
    }

    compile(context: Context): Step[] {
        return [ ...this.stream.compile(context), new KeepStream(this), ...this.index.compile(context), new Finish(this) ];
    }

    getStartExplanations() { return this.getFinishExplanations(); }

    getFinishExplanations() {
        return {
            "eng": "Let's get the stream value at this index."
        }
    }

    evaluate(evaluator: Evaluator): Value {

        const index = evaluator.popValue(new MeasurementType());
        if(!(index instanceof Measurement) || !index.isInteger()) return index;

        const stream = evaluator.popValue(new StreamType(new AnyType()));
        if(!(stream instanceof Stream)) return stream;new TypeException(evaluator, new StreamType(new AnyType()), stream);

        return stream.at(index.toNumber());

    }

    clone(original?: Node, replacement?: Node) { 
        return new Previous(
            this.stream.cloneOrReplace([ Expression, Unparsable ], original, replacement), 
            this.index.cloneOrReplace([ Expression, Unparsable ], original, replacement),
            this.previous.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.stream instanceof Expression) this.stream.evaluateTypeSet(bind, original, current, context);
        if(this.index instanceof Expression) this.index.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getDescriptions() {
        return {
            eng: "A previous stream value"
        }
    }

    getReplacementChild(child: Node, context: Context): Transform[] | undefined {
        
        if(child === this.stream)
            return  this.getAllDefinitions(this, context)
                    .filter((def): def is Stream => def instanceof Stream)
                    .map(stream => new Reference<Name>(stream, name => new Name(name)))

        if(child === this.index)
            return getPossibleExpressions(this, this.index, context, new MeasurementType());

    }

    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }

}