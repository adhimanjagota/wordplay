import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";
import type Context from "./Context";
import { FUNCTION_SYMBOL } from "../parser/Tokenizer";
import Bind from "./Bind";
import { getEvaluationInputConflicts } from "./util";
import EvalCloseToken from "./EvalCloseToken";
import EvalOpenToken from "./EvalOpenToken";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import FunctionDefinitionType from "./FunctionDefinitionType";
import TypeVariables from "./TypeVariables";
import type TypeSet from "./TypeSet";
import type { NativeTypeName } from "../native/NativeConstants";

export default class FunctionType extends Type {

    readonly fun: Token;
    readonly types: TypeVariables | undefined;
    readonly open: Token | undefined;
    readonly inputs: Bind[];
    readonly close: Token | undefined;
    readonly output: Type;

    constructor(fun: Token, types: TypeVariables | undefined, open: Token | undefined, inputs: Bind[], close: Token | undefined, output: Type) {
        super();

        this.fun = fun;
        this.types = types;
        this.open = open;
        this.inputs = inputs;
        this.close = close;
        this.output = output;

        this.computeChildren();

    }

    static make(typeVars: TypeVariables | undefined, inputs: Bind[], output: Type) {
        return new FunctionType(
            new Token(FUNCTION_SYMBOL, TokenType.FUNCTION),
            typeVars,
            new EvalOpenToken(),
            inputs,
            new EvalCloseToken(),
            output
        );
    }
    
    getGrammar() { 
        return [
            { name: "fun", types: [ Token ] },
            { name: "types", types: [ [ TypeVariables] ] },
            { name: "open", types: [ Token ] },
            { name: "inputs", types: [[ Bind ]] },
            { name: "close", types: [ Token ] },
            { name: "output", types: [ Type ] },
        ]; 
    }

    replace(original?: Node, replacement?: Node) { 
        return new FunctionType(
            this.replaceChild("fun", this.fun, original, replacement),
            this.replaceChild("types", this.types, original, replacement),
            this.replaceChild("open", this.open, original, replacement),
            this.replaceChild("inputs", this.inputs, original, replacement),
            this.replaceChild("close", this.close, original, replacement),
            this.replaceChild("output", this.output, original, replacement)
        ) as this;
    }

    acceptsAll(types: TypeSet, context: Context): boolean {
        return types.list().every(type => {
            if(!(type instanceof FunctionType || type instanceof FunctionDefinitionType)) return false;
            let inputsToCheck: Bind[] = type instanceof FunctionDefinitionType ? type.fun.inputs : type.inputs;
            let outputToCheck = type instanceof FunctionDefinitionType ? type.fun.getOutputType(context) : type.output;

            if(!(outputToCheck instanceof Type)) return false;
            if(!this.output.accepts(outputToCheck, context)) return false;
            if(this.inputs.length != inputsToCheck.length) return false;
            for(let i = 0; i < this.inputs.length; i++) {
                const thisBind = this.inputs[i];
                const thatBind = inputsToCheck[i];
                if(thisBind.type instanceof Type && thatBind.type instanceof Type && !thisBind.type.accepts(thatBind.type, context)) return false;
                if(thisBind.isVariableLength() !== thatBind.isVariableLength()) return false;
                if(thisBind.hasDefault() !== thatBind.hasDefault()) return false;
            }
            return true;
        });
    }

    getNativeTypeName(): NativeTypeName { return "function"; }
    
    computeConflicts() {

        // Make sure the inputs are valid.
        return getEvaluationInputConflicts(this.inputs);
        
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A function type."
        }
    }
    
}