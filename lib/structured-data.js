let structuredDataPolicy;

function serializeStructuredData(value) {
  // Prevent JSON data from terminating its script element. This is the only
  // input accepted by the narrowly scoped Trusted Types policy below.
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function trustedStructuredData(value) {
  const serialized = serializeStructuredData(value);

  if (typeof window === 'undefined' || !window.trustedTypes) return serialized;

  if (!structuredDataPolicy) {
    structuredDataPolicy = window.trustedTypes.createPolicy('gsrp#structured-data', {
      createHTML: (input) => input,
    });
  }

  return structuredDataPolicy.createHTML(serialized);
}
