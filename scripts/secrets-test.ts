// this script only finds doppler secrets when running under doppler run --name-transformer tf-var -- <cmd to run this script>
// doppler in that case will dump its variables into environment of the script, transforming them into tf-var format
// we only use the tf-var format as a cheet because doppler run doesn't otherwise prefix their specific variables
// do variable ABC_DEF comes out as TF_VAR_abc_def
// then we renormalize by stripping prefix and uppercasing

type KnownSecrets  = {
  EDGEDB_PERMAKEY_SU: string,
  HARMLESS_SECRET: string
};

const nosecretsmessage =
`
Cannot see any dopler variables, 
Are you sure you are running with 
   "doppler run --name-transformer tf-var -- <command>"
`;

const acquireSecrets = (): Partial<KnownSecrets> =>
{
  const container:Partial<KnownSecrets> = {
    // EDGEDB_PERMAKEY_SU: '',  // leave this out to prevent printing a real key
    HARMLESS_SECRET: ''
  };

  const allEnvKeys  = Object.keys(process.env);
  const tfEnvKeys   = allEnvKeys.filter(ekey=>/^TF_VAR_([a-z_]+$)/.test(ekey));  // expect them in TF_VAR_ format

  if(!tfEnvKeys.length)  console.log(nosecretsmessage);

  const xformedKeys = tfEnvKeys.map(okey=>okey.slice('TF_VAR_'.length).toUpperCase());

  xformedKeys.forEach(k=>
  {
    console.log('env key from doppler run', k);
  });

  Object.keys(container).forEach((key) => {
    container[key as keyof KnownSecrets] = process.env[key]     // acquire the secrets
  })

  return container;

}

const sec = acquireSecrets();
console.log(sec);


