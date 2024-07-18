# Technical Stack

## Front end
| Role            | Choice(s)         | Comments                                                                                                                                                                 |
|-----------------|-------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Package manager | pnpm              |                                                                                                                                                                          |
| Bundler         | Vite              |                                                                                                                                                                          |
| Language        | Typescript        | 5.4.x                                                                                                                                                                    |
| Styles          | styled-components | between Typescript w/Jsx and styled components, there is generally no separate layer by technology                                                                       |
| State Manager   | redux             | custom slice system + in-house middleware, no ReduxToolkit. Aside from a bit of integration glue neither the functional layer nor react ui are coupled directly to redux |
| Injection       | tsyringe          | at lowest level, in monorepo configuration/inflation pattern builds on it.                                                                                               |

| Role        | Choice(s)         | Comments                                                               |
|-------------|-------------------|------------------------------------------------------------------------|
| Shell       | electron          | uses "channels" to plug in multiple clients and localized demo servers |

| Backend Role    | Choice(s)            | Comments                                                                                                |
|-----------------|----------------------|---------------------------------------------------------------------------------------------------------|
| Graph database  | Memgraph             | A Neo4J in memory graph database supporting cypher, other similar choices would be Neo4J, AWS Neptune   |
| SQL database    | Supabase             | A Postgres database with a built in auth system, also has a realtime database, and storage.             |
| Authentication  | via Supabase         | A Postgres database with a built in auth system, also has a realtime database, and storage.             |
| Captcha         | Cloudflare Turnstile |                                                                                                         |
| Email           | AWS SES              |                                                                                                         |
| Secrets         | Doppler              | Capable and good enough for free tier                                                                   |
| Devops          | Gitlab or Github     | Github does not have a true merge-ff policy as Gitlab does, but Github has more other low cost features |   

# Other Technical choices/preferences
* Sign in
* Messaging
* Docker containers for services Composer/Swarm


