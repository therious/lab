//  all secrets we expect to find
type SecretsBag = {
  DOPPLER_PROJECT:      string,       // identifier of the project e.g. "lab" ( a generic top level, rather than app level project)
  DOPPLER_ENVIRONMENT:  string,       // e.g. dev, stg, prod or a decendent of one of those (in case you use decendent rather than $$$ more doppler projects)
  DOPPLER_CONFIG:       string,       // name of current config
  WORKOS_CLIENT_ID:     string,       // auth system account  (testing, might superceded with supabase auth system)
  WORKOS_API_KEY:       string,
  EDGEDB_PERMAKEY_SU:   string,
  HARMLESS_SECRET:      string,

  // SUPA_LAB refers to a supabase project "lab" under the Therious org

  SUPA_ACCESS_TOKEN:    string,       // overall access to supabase account
  SUPA_THERIOUS_SLUG:   string,       // supabase org, called Therious has a slug

  SUPA_LAB_JWT:         string,       // what lab encodes/decodes jwt tokens with (for its auth module)
  SUPA_LAB_API_KEY:     string,       // api access to the lab db accessed with RLS (row level security)
  SUPA_LAB_API_KEY_SERVICE_ROLE: string,  // api key bypassing row level security
  SUPA_LAB_DB_PWD:      string,       // password access to lab db
  SUPA_LAB_URL:         string,       // access to supabase lab db via url
};

type SecretsKey = keyof SecretsBag;

// todo all this adhoc initialization is running due to including utils in browser

// need an iterable form of SecretsBag keys
export const expectedSecretsKeys:SecretsKey[] = [
'HARMLESS_SECRET','EDGEDB_PERMAKEY_SU',
'WORKOS_CLIENT_ID', 'WORKOS_API_KEY',
  'SUPA_ACCESS_TOKEN',
  'SUPA_LAB_API_KEY',
  'SUPA_LAB_API_KEY_SERVICE_ROLE',
  'SUPA_LAB_DB_PWD',
  'SUPA_LAB_JWT',
  'SUPA_LAB_URL',
  'SUPA_THERIOUS_SLUG'
];

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
