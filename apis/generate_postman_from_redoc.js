const fs = require("fs");
const path = require("path");

const INPUT_HTML = process.argv[2] || "redoc-static.html";
const OUTPUT_COLLECTION = path.join(
  __dirname,
  "teeinblue-public-api.postman_collection.json"
);

const TOKEN = process.env.TIB_API_TOKEN || "{{api_token}}";

function extractRedocState(html) {
  const marker = "const __redoc_state = ";
  const start = html.indexOf(marker);
  if (start === -1) {
    throw new Error("Cannot find __redoc_state in HTML file.");
  }

  const afterMarker = start + marker.length;
  const endMarker = ";\n\n      var container = document.getElementById('redoc');";
  const end = html.indexOf(endMarker, afterMarker);
  if (end === -1) {
    throw new Error("Cannot find the end of __redoc_state block.");
  }

  return JSON.parse(html.slice(afterMarker, end));
}

function resolveRef(spec, ref) {
  if (!ref || !ref.startsWith("#/")) {
    return null;
  }

  return ref
    .slice(2)
    .split("/")
    .reduce((acc, part) => (acc ? acc[part] : undefined), spec);
}

function dereference(spec, node) {
  if (!node) {
    return node;
  }

  if (node.$ref) {
    return dereference(spec, resolveRef(spec, node.$ref));
  }

  return node;
}

function toArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function pickExample(spec, schema) {
  const node = dereference(spec, schema);
  if (!node) {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(node, "example")) {
    return node.example;
  }

  if (node.examples) {
    const firstKey = Object.keys(node.examples)[0];
    if (firstKey && Object.prototype.hasOwnProperty.call(node.examples[firstKey], "value")) {
      return node.examples[firstKey].value;
    }
  }

  if (node.default !== undefined) {
    return node.default;
  }

  if (node.enum && node.enum.length) {
    return node.enum[0];
  }

  if (node.anyOf && node.anyOf.length) {
    return pickExample(spec, node.anyOf.find((item) => !toArray(item.type).includes("null")) || node.anyOf[0]);
  }

  if (node.oneOf && node.oneOf.length) {
    return pickExample(spec, node.oneOf[0]);
  }

  const type = Array.isArray(node.type) ? node.type.find((item) => item !== "null") : node.type;

  if (type === "object" || node.properties) {
    const result = {};
    for (const [key, value] of Object.entries(node.properties || {})) {
      result[key] = pickExample(spec, value);
    }
    return result;
  }

  if (type === "array" || node.items) {
    return [pickExample(spec, node.items)];
  }

  if (type === "integer" || type === "number") {
    return 1;
  }

  if (type === "boolean") {
    return true;
  }

  if (type === "string") {
    if (node.format === "date-time") {
      return "2025-01-15T10:30:00Z";
    }
    if (node.format === "date") {
      return "2025-01-15";
    }
    if (node.format === "uuid") {
      return "6d823e4d-8f21-41f8-b461-e97c981880bc";
    }
    return "string";
  }

  return null;
}

function getParameters(spec, operation) {
  return (operation.parameters || []).map((param) => dereference(spec, param)).filter(Boolean);
}

function getRequestBodyExample(spec, operation) {
  if (!operation.requestBody) {
    return null;
  }

  const requestBody = dereference(spec, operation.requestBody);
  const jsonContent = requestBody?.content?.["application/json"];
  if (!jsonContent) {
    return null;
  }

  if (jsonContent.example !== undefined) {
    return jsonContent.example;
  }

  if (jsonContent.examples) {
    const firstKey = Object.keys(jsonContent.examples)[0];
    if (firstKey && jsonContent.examples[firstKey]?.value !== undefined) {
      return jsonContent.examples[firstKey].value;
    }
  }

  return pickExample(spec, jsonContent.schema);
}

function getSuccessCodes(operation) {
  return Object.keys(operation.responses || {}).filter((code) => /^2\d\d$/.test(code));
}

function guessPathVarValue(name, spec) {
  const lowered = name.toLowerCase();
  if (lowered === "orderid") return "{{order_id}}";
  if (lowered === "etsyid") return "{{etsy_order_id}}";
  if (lowered === "platformdomain") return "{{platform_domain}}";
  if (lowered === "uuid") return "{{customization_uuid}}";
  if (lowered === "campaignid") return "{{campaign_uuid}}";
  if (lowered === "id") return "{{resource_id}}";

  const param = resolveRef(spec, `#/components/parameters/${name}`);
  const example = param?.example || pickExample(spec, param?.schema);
  return example ? String(example) : `{{${name}}}`;
}

function buildQueryParams(spec, operation) {
  return getParameters(spec, operation)
    .filter((param) => param.in === "query")
    .map((param) => {
      let value = param.example;
      if (value === undefined) {
        value = pickExample(spec, param.schema);
      }
      if (value === null || value === undefined) {
        value = "";
      }
      return {
        key: param.name,
        value: String(value),
        description: param.description || "",
        disabled: !param.required,
      };
    });
}

function buildPathVariables(spec, rawPath) {
  return [...rawPath.matchAll(/\{([^}]+)\}/g)].map((match) => {
    const key = match[1];
    return {
      key,
      value: guessPathVarValue(key, spec),
    };
  });
}

function convertPathForPostman(rawPath, spec) {
  return rawPath.replace(/\{([^}]+)\}/g, (_, key) => `:${key}`);
}

function makeBaseTests(successCodes, operation, rawPath) {
  const expectedCodes = successCodes.length ? successCodes.join(", ") : "200";
  const primaryCode = successCodes[0] || "200";
  const lines = [
    `pm.test("Status code is one of ${expectedCodes}", function () {`,
    `  pm.expect(${JSON.stringify(successCodes.length ? successCodes : ["200"])}).to.include(String(pm.response.code));`,
    `});`,
    ``,
    `pm.test("Response time is under 5000ms", function () {`,
    `  pm.expect(pm.response.responseTime).to.be.below(5000);`,
    `});`,
    ``,
    `if (pm.response.code !== 204) {`,
    `  pm.test("Content-Type is JSON", function () {`,
    `    pm.expect(pm.response.headers.get("Content-Type") || "").to.include("application/json");`,
    `  });`,
    `}`,
    ``,
    `if (String(pm.response.code) === "${primaryCode}" && pm.response.code !== 204) {`,
    `  let jsonData;`,
    `  pm.test("Response body is valid JSON", function () {`,
    `    jsonData = pm.response.json();`,
    `    pm.expect(jsonData).to.not.equal(undefined);`,
    `  });`,
    `}`,
  ];

  const pathLower = rawPath.toLowerCase();
  if (operation.operationId === "listOrders") {
    lines.push(
      ``,
      `if (pm.response.code === 200) {`,
      `  const jsonData = pm.response.json();`,
      `  if (Array.isArray(jsonData.data) && jsonData.data.length > 0) {`,
      `    const first = jsonData.data[0];`,
      `    if (first.id) pm.collectionVariables.set("order_id", String(first.id));`,
      `    if (first.platform_order_id) pm.collectionVariables.set("platform_order_id", String(first.platform_order_id));`,
      `    if (first.platform_domain) pm.collectionVariables.set("platform_domain", String(first.platform_domain));`,
      `  }`,
      `}`
    );
  } else if (operation.operationId === "listEtsyOrders") {
    lines.push(
      ``,
      `if (pm.response.code === 200) {`,
      `  const jsonData = pm.response.json();`,
      `  if (Array.isArray(jsonData.data) && jsonData.data.length > 0) {`,
      `    const first = jsonData.data[0];`,
      `    if (first.platform_order_id) pm.collectionVariables.set("etsy_order_id", String(first.platform_order_id));`,
      `    else if (first.id) pm.collectionVariables.set("etsy_order_id", String(first.id));`,
      `  }`,
      `}`
    );
  } else if (operation.operationId === "listStoreOrders") {
    lines.push(
      ``,
      `if (pm.response.code === 200) {`,
      `  const jsonData = pm.response.json();`,
      `  if (Array.isArray(jsonData.data) && jsonData.data.length > 0) {`,
      `    const first = jsonData.data[0];`,
      `    if (first.id) pm.collectionVariables.set("store_order_id", String(first.id));`,
      `  }`,
      `}`
    );
  } else if (operation.operationId === "listProductBaseCampaigns") {
    lines.push(
      ``,
      `if (pm.response.code === 200) {`,
      `  const jsonData = pm.response.json();`,
      `  if (Array.isArray(jsonData.data) && jsonData.data.length > 0 && jsonData.data[0].id) {`,
      `    pm.collectionVariables.set("product_base_id", String(jsonData.data[0].id));`,
      `  }`,
      `}`
    );
  } else if (operation.operationId === "listPlatformBaseCampaigns") {
    lines.push(
      ``,
      `if (pm.response.code === 200) {`,
      `  const jsonData = pm.response.json();`,
      `  if (Array.isArray(jsonData.data) && jsonData.data.length > 0) {`,
      `    const first = jsonData.data[0];`,
      `    if (first.id) pm.collectionVariables.set("platform_base_id", String(first.id));`,
      `    if (first.platform_domain) pm.collectionVariables.set("platform_domain", String(first.platform_domain));`,
      `  }`,
      `}`
    );
  } else if (operation.operationId === "listProducts") {
    lines.push(
      ``,
      `if (pm.response.code === 200) {`,
      `  const jsonData = pm.response.json();`,
      `  if (Array.isArray(jsonData.data) && jsonData.data.length > 0 && jsonData.data[0].id) {`,
      `    pm.collectionVariables.set("product_id", String(jsonData.data[0].id));`,
      `  }`,
      `}`
    );
  } else if (operation.operationId === "getCampaign") {
    lines.push(
      ``,
      `if (pm.response.code === 200) {`,
      `  const jsonData = pm.response.json();`,
      `  if (jsonData.uuid) pm.collectionVariables.set("campaign_uuid", String(jsonData.uuid));`,
      `  if (jsonData.platform_domain) pm.collectionVariables.set("platform_domain", String(jsonData.platform_domain));`,
      `}`
    );
  } else if (operation.operationId === "getCustomizationByUuid") {
    lines.push(
      ``,
      `if (pm.response.code === 200) {`,
      `  const jsonData = pm.response.json();`,
      `  if (jsonData.uuid) pm.collectionVariables.set("customization_uuid", String(jsonData.uuid));`,
      `}`
    );
  } else if (pathLower.includes("/health")) {
    lines.push(
      ``,
      `if (pm.response.code === 200) {`,
      `  pm.test("Health status is ok", function () {`,
      `    const jsonData = pm.response.json();`,
      `    pm.expect(jsonData.status).to.eql("ok");`,
      `  });`,
      `}`
    );
  } else if (pathLower.includes("/version")) {
    lines.push(
      ``,
      `if (pm.response.code === 200) {`,
      `  pm.test("Version field exists", function () {`,
      `    const jsonData = pm.response.json();`,
      `    pm.expect(jsonData.version).to.be.a("string");`,
      `  });`,
      `}`
    );
  }

  return lines.join("\n");
}

function buildItem(spec, rawPath, method, operation) {
  const urlPath = convertPathForPostman(rawPath, spec);
  const query = buildQueryParams(spec, operation);
  const variable = buildPathVariables(spec, rawPath);
  const request = {
    method: method.toUpperCase(),
    header: [
      {
        key: "Accept",
        value: "application/json",
      },
    ],
    url: {
      raw: `{{base_url}}${urlPath}`,
      host: ["{{base_url}}"],
      path: urlPath.split("/").filter(Boolean),
      query,
      variable,
    },
    description: operation.description || operation.summary || "",
  };

  const bodyExample = getRequestBodyExample(spec, operation);
  if (bodyExample !== null) {
    request.header.push({
      key: "Content-Type",
      value: "application/json",
    });
    request.body = {
      mode: "raw",
      raw: JSON.stringify(bodyExample, null, 2),
      options: {
        raw: {
          language: "json",
        },
      },
    };
  }

  return {
    name: `${method.toUpperCase()} ${rawPath} - ${operation.summary || operation.operationId}`,
    request,
    event: [
      {
        listen: "test",
        script: {
          type: "text/javascript",
          exec: makeBaseTests(getSuccessCodes(operation), operation, rawPath).split("\n"),
        },
      },
    ],
    response: [],
  };
}

function main() {
  const html = fs.readFileSync(INPUT_HTML, "utf8");
  const redocState = extractRedocState(html);
  const spec = redocState.spec.data;

  const groups = new Map();

  for (const [rawPath, methods] of Object.entries(spec.paths || {})) {
    for (const [method, operation] of Object.entries(methods)) {
      const tag = (operation.tags && operation.tags[0]) || "Default";
      if (!groups.has(tag)) {
        groups.set(tag, []);
      }
      groups.get(tag).push(buildItem(spec, rawPath, method, operation));
    }
  }

  const collection = {
    info: {
      name: `${spec.info.title} - Auto Generated`,
      description:
        "Generated from redoc-static.html. Includes bearer token auth, example params/body, and basic Postman tests.",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    auth: {
      type: "bearer",
      bearer: [
        {
          key: "token",
          value: "{{api_token}}",
          type: "string",
        },
      ],
    },
    variable: [
      {
        key: "base_url",
        value: (spec.servers && spec.servers[0] && spec.servers[0].url) || "https://api.teeinblue.com/openapi/v1",
      },
      {
        key: "api_token",
        value: TOKEN,
      },
      {
        key: "order_id",
        value: "12345",
      },
      {
        key: "platform_order_id",
        value: "4567890123",
      },
      {
        key: "etsy_order_id",
        value: "1234567890",
      },
      {
        key: "platform_domain",
        value: "my-shop.myshopify.com",
      },
      {
        key: "campaign_uuid",
        value: "6d823e4d-8f21-41f8-b461-e97c981880bc",
      },
      {
        key: "customization_uuid",
        value: "6d823e4d-8f21-41f8-b461-e97c981880bc",
      },
      {
        key: "product_base_id",
        value: "1245",
      },
      {
        key: "platform_base_id",
        value: "1245",
      },
      {
        key: "product_id",
        value: "1245",
      },
      {
        key: "resource_id",
        value: "1245",
      },
    ],
    item: Array.from(groups.entries()).map(([tag, items]) => ({
      name: tag,
      item: items,
    })),
  };

  fs.writeFileSync(OUTPUT_COLLECTION, JSON.stringify(collection, null, 2));

  const summary = {
    output: OUTPUT_COLLECTION,
    endpointCount: Array.from(groups.values()).reduce((sum, items) => sum + items.length, 0),
    groupCount: groups.size,
    groups: Array.from(groups.keys()),
  };

  console.log(JSON.stringify(summary, null, 2));
}

main();
