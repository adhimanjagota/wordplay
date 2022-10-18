import { MAP_KEY_TYPE_VAR_NAME, MAP_NATIVE_TYPE_NAME, MAP_VALUE_TYPE_VAR_NAME } from "../native/NativeConstants";
import { BIND_SYMBOL, SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from "../parser/Tokenizer";
import type Context from "./Context";
import NativeType from "./NativeType";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";
import Unparsable from "./Unparsable";
import { getPossibleTypes } from "./getPossibleTypes";
import type Transform from "./Transform"

export default class MapType extends NativeType {

    readonly open: Token;
    readonly key?: Type | Unparsable;
    readonly bind: Token;
    readonly value?: Type | Unparsable;
    readonly close: Token;

    constructor(key?: Type | Unparsable, value?: Type | Unparsable, open?: Token, bind?: Token, close?: Token) {
        super();

        this.open = open ?? new Token(SET_OPEN_SYMBOL, [ TokenType.SET_OPEN ]);
        this.close = close ?? new Token(SET_CLOSE_SYMBOL, [ TokenType.SET_CLOSE ]);
        this.bind = bind ?? new Token(BIND_SYMBOL, [ TokenType.BIND ]);
        this.key = key;
        this.value = value;
    }

    computeChildren() {
        const children = [];
        children.push(this.open);
        if(this.key !== undefined) children.push(this.key);
        children.push(this.bind);
        if(this.value !== undefined) children.push(this.value);
        children.push(this.close);
        return children;
    }
    computeConflicts() {}

    accepts(type: Type, context: Context): boolean { 
        return  type instanceof MapType &&
                // If they have one, then they must be compable, and if there is a value type, they must be compatible.
                (
                    // If the key type isn't specified, any will do.
                    (this.key === undefined ||
                        (
                            this.key instanceof Type &&
                            type.key instanceof Type &&
                            this.key.accepts(type.key, context)
                         )
                    ) &&
                    // If the value type isn't specified, any will do.
                    (this.value === undefined ||
                        (
                            this.value instanceof Type &&
                            type.value instanceof Type &&
                            this.value.accepts(type.value, context)
                        )
                    )
                )
    }

    getNativeTypeName(): string { return MAP_NATIVE_TYPE_NAME; }

    clone(original?: Node, replacement?: Node) { 
        return new MapType(
            this.key?.cloneOrReplace([ Type, Unparsable, undefined ], original, replacement), 
            this.value?.cloneOrReplace([ Type, Unparsable ], original, replacement),
            this.open.cloneOrReplace([ Token ], original, replacement),
            this.bind.cloneOrReplace([ Token ], original, replacement), 
            this.close.cloneOrReplace([ Token], original, replacement) 
        ) as this; 
    }

    resolveTypeVariable(name: string): Type | undefined { 
        return name === MAP_KEY_TYPE_VAR_NAME && this.key instanceof Type ? this.key : 
            name === MAP_VALUE_TYPE_VAR_NAME && this.value instanceof Type ? this.value :
            undefined;
    };

    getDescriptions() {
        return {
            eng: "A map type"
        }
    }

    getReplacementChild(child: Node, context: Context): Transform[] | undefined {

        if(child === this.key || child === this.value)
            return getPossibleTypes(this, context);
        else return [];

    }

    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }

}