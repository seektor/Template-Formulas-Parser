import { IParseNode } from "../Parser/structures/IParseNode";
import { ParseNodeType } from "../Parser/structures/ParseNodeType";
import { ITemplateFunction } from "../structures/ITemplateFunction";
import { ITranspiledTemplate } from "../structures/ITranspiledTemplate";
import { SubFunctionName } from "./structures/SubFunctionName";

export class Transpiler {

    private readonly subFunctionsArgName: string = 'subFunctions';
    private variableNames: string[];

    constructor() { }

    public process(parseNode: IParseNode): ITranspiledTemplate {
        const templateStringNode: IParseNode = parseNode.children[0];
        if (templateStringNode.type !== ParseNodeType.TemplateString) {
            return {
                func: () => '',
                variableNames: []
            }
        }
        this.variableNames = [];
        const functionBody: string = this.buildFunctionBody(templateStringNode);
        const func: ITemplateFunction = new Function(this.subFunctionsArgName, functionBody) as ITemplateFunction;
        return {
            func,
            variableNames: this.variableNames
        };
    }

    private buildFunctionBody(parseNode: IParseNode): string {
        let value: string = '';
        parseNode.children.forEach((childNode: IParseNode) => {
            const resolvedValue: string = this.resolveNode(childNode);
            value += `$\{${resolvedValue}}`;
        });
        let valueDefinition: string = `let value = \`${value}\`;`;
        return `${valueDefinition} return value;`
    }

    private resolveNode(parseNode: IParseNode): string {
        switch (parseNode.type) {
            case ParseNodeType.TemplateLiteral:
                return this.resolveTemplateLiteral(parseNode);
            case ParseNodeType.StringLiteral:
                return this.resolveStringLiteral(parseNode);
            case ParseNodeType.NumericLiteral:
                return this.resolveNumericLiteral(parseNode);
            case ParseNodeType.Formula:
                return this.resolveNode(parseNode.children[0]);
            case ParseNodeType.GetCall:
                return this.resolveGetCall(parseNode);
            case ParseNodeType.LengthCall:
                return this.resolveLengthCall(parseNode);
            case ParseNodeType.IfKeyword:
                return this.resolveIfKeyword(parseNode);
            default:
                throw new Error('Invalid parseNode type!');
        }
    }

    private resolveLengthCall(parseNode: IParseNode): string {
        return `${this.subFunctionsArgName}.get('${SubFunctionName.Length}')(${this.resolveNode(parseNode.children[0])})`;
    }

    private resolveGetCall(parseNode: IParseNode): string {
        const variableNode: IParseNode = parseNode.children[0];
        this.variableNames.push(variableNode.value.slice(1, -1));
        return `${this.subFunctionsArgName}.get('${SubFunctionName.Get}')(${variableNode.value})`;
    }

    private resolveNumericLiteral(parseNode: IParseNode): string {
        return parseNode.value;
    }

    private resolveStringLiteral(parseNode: IParseNode): string {
        return parseNode.value;
    }

    private resolveTemplateLiteral(parseNode: IParseNode): string {
        return `'${parseNode.value}'`;
    }

    private resolveIfKeyword(parseNode: IParseNode): string {
        const condition: IParseNode = parseNode.children[0];
        const onTrue: IParseNode = parseNode.children[1];
        const onFalse: IParseNode = parseNode.children[2];
        return `${this.resolveIfCondition(condition)} ? ${this.resolveNode(onTrue)} : ${this.resolveNode(onFalse)}`;
    }

    private resolveIfCondition(parseNode: IParseNode): string {
        if (parseNode.type === ParseNodeType.BinaryExpression) {
            return this.resolveBinaryExpression(parseNode);
        } else {
            return this.resolveNode(parseNode);
        }
    }

    private resolveBinaryExpression(parseNode: IParseNode): string {
        return `${this.resolveNode(parseNode.children[0])} ${this.resolveStringLiteral(parseNode.children[1])} ${this.resolveNode(parseNode.children[2])}`;
    }
}