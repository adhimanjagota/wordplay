import Expression from "./Expression";
import Node, { type ConflictContext } from "./Node";
import type Alias from "./Alias";
import type Token from "./Token";
import Type from "./Type";
import type Unparsable from "./Unparsable";
import type Docs from "./Docs";
import type Conflict from "../conflicts/Conflict";
import { UnusedBind } from "../conflicts/UnusedBind";
import { DuplicateBinds } from "../conflicts/DuplicateBinds";
import { IncompatibleBind } from "../conflicts/IncompatibleBind";
import DuplicateAliases from "../conflicts/DuplicateAliases";
import { UnexpectedEtc } from "../conflicts/UnexpectedEtc";
import UnknownType from "./UnknownType";
import NameType from "./NameType";
import StructureType from "./StructureType";
import StructureDefinition from "./StructureDefinition";
import TypeVariable from "./TypeVariable";
import Name from "./Name";
import Column from "./Column";
import ColumnType from "./ColumnType";
import type Evaluator from "../runtime/Evaluator";
import type Evaluable from "../runtime/Evaluable";
import type Step from "../runtime/Step";
import Action from "../runtime/Start";
import Halt from "../runtime/Halt";
import Finish from "../runtime/Finish";
import Exception, { ExceptionKind } from "../runtime/Exception";
import type { Named } from "./Named";
import FunctionDefinition from "./FunctionDefinition";

export default class Bind extends Node implements Evaluable, Named {
    
    readonly docs: Docs[];
    readonly etc: Token | undefined;
    readonly names: Alias[];
    readonly dot?: Token;
    readonly type?: Type | Unparsable;
    readonly colon?: Token;
    readonly value?: Expression | Unparsable;

    constructor(docs: Docs[], etc: Token | undefined, names: Alias[], type?: Type | Unparsable, value?: Expression | Unparsable, dot?: Token, colon?: Token) {
        super();

        this.docs = docs;
        this.etc = etc;
        this.names = names;
        this.dot = dot;
        this.type = type;
        this.colon = colon;
        this.value = value;
    }

    hasName(name: string) { return this.names.find(n => n.getName() === name) !== undefined; }

    getNames() { return this.names.map(n => n.getName() ); }

    isVariableLength() { return this.etc !== undefined; }

    hasDefault() { return this.value !== undefined; }

    getChildren() { 
        let children: Node[] = [];
        children = children.concat(this.docs);
        if(this.etc) children.push(this.etc);
        children = children.concat(this.names);
        if(this.dot) children.push(this.dot);
        if(this.type) children.push(this.type);
        if(this.colon) children.push(this.colon);
        if(this.value) children.push(this.value);
        return children;
    }

    getConflicts(context: ConflictContext): Conflict[] {

        const conflicts = [];

        // Etc tokens can't appear in block bindings, just structure and function definitions.
        if(this.isVariableLength()) {
            const parent = this.getParent(context.program);
            if(!(parent instanceof StructureDefinition || parent instanceof FunctionDefinition))
                conflicts.push(new UnexpectedEtc(this));
        }

        // Bind aliases have to be unique
        if(!this.names.every(n => this.names.find(n2 => n !== n2 && n.getName() === n2.getName()) === undefined))
            conflicts.push(new DuplicateAliases(this))

        // If there's a type, the value must match.
        if(this.type instanceof Type && this.value && this.value instanceof Expression) {
            const valueType = this.value.getType(context);
            if(!this.type.isCompatible(context, valueType))
                conflicts.push(new IncompatibleBind(this.type, this.value));
        }

        const enclosure = context.program.getBindingEnclosureOf(this);

        // It can't already be defined.
        const definitions = this.names.map(alias => enclosure?.getDefinition(context, this, alias.getName())).filter(def => def !== undefined) as (Expression | Bind | TypeVariable)[];
        if(definitions.length > 0)
            conflicts.push(new DuplicateBinds(this, definitions));

        // It should be used in some expression in its parent.
        const parent = this.getParent(context.program);
        if(enclosure && !(parent instanceof Column || parent instanceof ColumnType)) {
            const uses = enclosure.nodes().filter(n => n instanceof Name && this.names.find(name => name.getName() === n.name.text) !== undefined);
            if(uses.length === 0)
                conflicts.push(new UnusedBind(this));
        }

        return conflicts;

    }

    getType(context: ConflictContext): Type {

        // What type is this binding?
        let type = 
            // If it's declared, use the declaration.
            this.type instanceof Type ? this.type :
            // If the value is a structure definition, make a structure type.
            this.value instanceof StructureDefinition ? new StructureType(this.value) :
            // If it has an expression. ask the expression.
            this.value instanceof Expression ? this.value.getType(context) :
            // Otherwise, we don't know.
            new UnknownType(this);

        // If the type is a name, resolve the name.
        if(type instanceof NameType)
            type = this.resolveTypeName(context, type.getName());

        // // If the bind is a variable length argument, wrap it in a list.
        // if(this.etc !== undefined)
        //     type = new ListType(type);

        // Return the type.
        return type;
        
    }

    resolveTypeName(context: ConflictContext, name: string) {

        // Find the name.
        const bindOrTypeVariable = context.program.getBindingEnclosureOf(this)?.getDefinition(context, this, name);
        if(bindOrTypeVariable === undefined) return new UnknownType(this);
        else if(bindOrTypeVariable instanceof Bind) return bindOrTypeVariable.getType(context);
        else if(bindOrTypeVariable instanceof TypeVariable) return new UnknownType(this);
        else return new UnknownType(this);

    }

    compile(context: ConflictContext):Step[] {
        return this.value === undefined ?
            [ new Halt(new Exception(this, ExceptionKind.EXPECTED_VALUE), this) ] :
            [ new Action(this), ...this.value.compile(context), new Finish(this) ];
    }

    evaluate(evaluator: Evaluator) {
        
        // Bind the value on the stack to the names.
        this.names.forEach(alias => evaluator.bind(alias.getName(), evaluator.popValue()));
        return undefined;

    }

}