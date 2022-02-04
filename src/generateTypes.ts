import { getRefName, getSchemaName, getTsType, isAscending } from "./utils";
import type { Schema, Config, TypeAST } from "./types";
import { AUTOGENERATED_COMMENT } from "./strings";
import { getJsdoc } from "./utilities/jsdoc";

function generateTypes(types: TypeAST[], config: Partial<Config>): string {
  let code = AUTOGENERATED_COMMENT;
  try {
    code += types
      .sort(({ name }, { name: _name }) => isAscending(name, _name))
      .reduce((prev, { name: _name, schema, description }) => {
        const name = getSchemaName(_name);
        prev += `
        ${getJsdoc({
          ...schema,
          description: description || schema?.description,
          deprecated: schema?.deprecated
            ? schema?.["x-deprecatedMessage"] || String(schema?.deprecated)
            : undefined,
        })}
        ${getTypeDefinition(name, schema, config)}
        `;

        return prev;
      }, "");

    return code;
  } catch (error) {
    console.error({ error });
    return "";
  }
}

function getTypeDefinition(
  name: string,
  schema: Schema = {},
  { generateEnumAsType }: Partial<Config>,
) {
  const {
    type,
    enum: Enum,
    "x-enumNames": enumNames,
    allOf,
    oneOf,
    items,
    $ref,
    additionalProperties,
    properties,
  } = schema;

  if (Enum) {
    if (generateEnumAsType) {
      return `export type ${name} =${Enum.map((e) => `"${e}"`).join(" | ")};`;
    }
    return `export enum ${name} {${Enum.map(
      (e, index) =>
        `${enumNames ? enumNames[index] : e}=${
          typeof e === "string" ? `"${e}"` : `${e}`
        }`,
    )}}`;
  }

  if (allOf || oneOf) {
    return `export type ${name} = ${getTsType(schema)}`;
  }

  if (type === "array" && items) {
    return `export type ${name} = ${getTsType(items)}[]`;
  }

  if ($ref) {
    return `export type ${name} = ${getRefName($ref)}`;
  }

  if (type === "object") {
    const typeObject = getTsType(schema);

    if ((additionalProperties || properties) && !oneOf) {
      return `export interface ${name} ${typeObject}`;
    }

    return `export type ${name} = ${typeObject}`;
  }

  if (type === "string") {
    return `export type ${name} = ${type}`;
  }

  return `export type ${name} = any`;
}

export { generateTypes };
