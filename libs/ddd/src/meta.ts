type CypherProperty = string | number | boolean | Date;
type CypherPropertyBag = Record<string, CypherProperty>;

function createNodeCypherQuery(label: string, properties: CypherPropertyBag): string {
  const propEntries = Object.entries(properties)
    .map(([k,v])=>`${k}: ${typeof v === 'string' ? `"${v}"` : v}`)
    .join(', ');

  const query = `CREATE (n:${label} { ${propEntries} })`;

  return query;
}

function clearDatabase(): string {
return `
// delete everything
MATCH (n)
DETACH DELETE n`;
}
// this file is the bootstrapper for the domain model
function addDomainQ(domain:string, desc:string) {

  const cypher = `
// add a domain
MERGE (d:Domain {name: '${domain}', description: '${desc}'})`;
  return cypher;
}
function addEventQ(domain:string, event:string, desc?: string) {
  const cypher = `
// add an event
MATCH (d:Domain {name: '${domain}'})
MERGE (e:Event {name: '${event}', description: '${desc}'})
MERGE (e)-[r:member_of]->(d)`;
  return cypher;
}

function addEventPropQ(domain:string, event:string, propName: string, propType: string) {
  const cypher = `
// add a property to an event message
MATCH (e:Event {name: '${event}'})-[r:member_of]->(d:Domain {name: '${domain}'})
SET e.${propName} = '${propType}'`;
  return cypher;
}

function returnAll()
{
  return `
  MATCH (a)-[b]->(c) return a,b,c`;
}

export function bootmeta() {
   const cyphercommands = [
    clearDatabase(),
    addDomainQ    ('Meta', 'The domain of domains'),
    addEventQ     ('Meta', 'defineDomain'),
    addDomainQ    ('Bank', 'The domain of banks'),
    addEventQ     ('Bank', 'createAccount'),
     addEventPropQ ('Bank', 'createAccount', 'customer', 'string'),
     addEventPropQ ('Bank', 'createAccount', 'accountname', 'string'),

    addEventPropQ ('Bank', 'createAccount', 'balance',  'int'),
    addEventPropQ ('Bank', 'createAccount', 'currency', 'string'),
    addEventQ     ('Bank', 'closeAccount'),
    addEventPropQ ('Bank', 'closeAccount',  'accountname',       'string'),
    addEventQ     ('Bank', 'deposit'),
    addEventPropQ ('Bank', 'deposit', 'accountname', 'string'),
    addEventPropQ ('Bank', 'deposit', 'amount', 'int'),

   addEventQ     ('Bank', 'withdraw'),
   addEventPropQ ('Bank', 'withdraw', 'accountname', 'string'),
   addEventPropQ ('Bank', 'withdraw', 'amount', 'int'),

    returnAll()
  ];
  return cyphercommands.map((s,i)=>`//[${i}]: ${s}`).join(';\n');
}

