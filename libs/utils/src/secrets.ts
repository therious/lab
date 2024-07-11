//  all secrets we expect to find
type SecretsBag = {
  DOPPLER_PROJECT:      string,       // identifier of the project e.g. "lab" ( a generic top level, rather than app level project)
  DOPPLER_ENVIRONMENT:  string,       // e.g. dev, stg, prod or a decendent of one of those (in case you use decendent rather than $$$ more doppler projects)
  DOPPLER_CONFIG:       string,       // name of current config
  WORKOS_CLIENT_ID:string,     // auth system account
  WORKOS_API_KEY: string,
  EDGEDB_PERMAKEY_SU:   string,
  HARMLESS_SECRET:      string
};

type SecretsKey = keyof SecretsBag;

// todo all this adhoc initialization is running due to including utils in browser

// need an iterable form of SecretsBag keys
export const expectedSecretsKeys:SecretsKey[] = [
'HARMLESS_SECRET','EDGEDB_PERMAKEY_SU',
'DOPPLER_PROJECT', 'DOPPLER_ENVIRONMENT','DOPPLER_CONFIG'];

const fakeSecretsValue = 'xxx';
const expectedSecretsBag:SecretsBag = expectedSecretsKeys.reduce((accum, key:SecretsKey) => {
  accum[key] = fakeSecretsValue;
  return accum;
}, {} as SecretsBag);

export const environmentKeys   = Object.keys(globalThis?.process?.env ?? {});
export const foundSecretsKeys  = environmentKeys.filter(k=>k in expectedSecretsBag) as SecretsKey[];
export const foundSecretsBag   = foundSecretsKeys.reduce((accum, key:SecretsKey) => {
  accum[key] = process.env[key] as string;
  return accum;
}, {} as SecretsBag);

const widestKey = Math.max(...foundSecretsKeys.map(k=>k.length));
export const validSecretsKeys  = foundSecretsKeys.filter(k=>foundSecretsBag[k] && foundSecretsBag[k] !== fakeSecretsValue);
export const dopplerValues     = validSecretsKeys.filter(k=>k.startsWith('DOPPLER_')).map(k=>`${k.padStart(widestKey, ' ')} = "${foundSecretsBag[k]}"`);

export function isSecretsBag(obj:object):obj is SecretsBag {
  return expectedSecretsKeys.every(k=>k in obj);
}

const list = (arr:string[], name:string) =>
  `
=============================
${name}:
-----------------------------
${arr.join("\n")}
=============================
`;

export const secretsReport = () =>
  [
    list(dopplerValues,       'doppler values'),
    list(validSecretsKeys,    'valid secrets'),
    list(foundSecretsKeys,    'found secrets'),
    list(expectedSecretsKeys, 'expected secrets'),

    list(environmentKeys.sort(), 'environment'),
  ].join("\n");
